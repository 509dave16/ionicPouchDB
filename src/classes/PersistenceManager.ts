import {ResourceCollection} from "./ResourceCollection";
import {objectClone} from "../utils/object.util";
import {ResourceModel} from "./ResourceModel";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import SaveOptions = RanksORM.SaveOptions;
import ParsedDocId = RanksORM.ParsedDocId;
import TypeSchema = RanksORM.TypeSchema;
import ISideloadedModelData = RanksORM.ISideloadedModelData;
import _ from 'lodash';

export class PersistenceManager {
  private dm: SideloadedDataManager;
  constructor(dm: SideloadedDataManager) {
    this.dm = dm;
  }
  public async save(options: SaveOptions, modelOrCollection: ResourceModel|ResourceCollection): Promise<ResourceModel|ResourceCollection> {
    if (options.related) {
      await options.bulk ? this.saveAllBulk() : this.saveAllIndividually();
    } else if (modelOrCollection instanceof  ResourceModel) {
      await this.saveModel(modelOrCollection);
    } else {
      const writes: Promise<any>[] = modelOrCollection.map((model: ResourceModel) => this.saveModel(model));
      await Promise.all(writes);
    }
    return modelOrCollection;
  }

  private async saveModel(model: ResourceModel): Promise<ResourceModel> {
    if (!model.hasChanged()) {
      return model;
    }
    const updatedModel: ResourceModel = await this.dm.db.save(model.type, model.getResource()) as ResourceModel;
    const data = updatedModel.getResource();
    model.setResource(data);
    model.refreshOriginalResource();
    return model;
  }

  private updateResourceModelMetadata(docMetadata: any) {
    const parsedDocID: ParsedDocId = this.dm.db.parseDocID(docMetadata.id);
    const typeSchema: TypeSchema = this.dm.getTypeSchema(parsedDocID.type);
    const model: ResourceModel = this.dm.sideloadedModelData.getResourceModelByTypeAndId(typeSchema.plural, parsedDocID.id);
    model.setField('id', parsedDocID.id);
    model.setField('rev', docMetadata.rev);
    model.refreshOriginalResource();
  }

  private makeBulkDocsResource(model: ResourceModel): any {
    // 1. Don't change models data
    const resourceClone: any = objectClone(model.getResource());
    // 2. Make a relational pouch id
    const { type, id } = model;
    const parsedDocID: ParsedDocId = { type, id};
    const rpId: string = this.dm.db.makeDocID(parsedDocID);
    // 3. Remove unwanted id/rev in favor of Pouch/Couch spec of _id/_rev
    resourceClone._id = rpId;
    resourceClone._rev = resourceClone.rev;
    delete resourceClone.id;
    delete resourceClone.rev;
    // 4. Make an object with _id, _rev, and data(which is everything but _id/_rev
    const blacklistedKeys = ['_id', '_rev'];
    const data = _.omit(resourceClone, blacklistedKeys);
    const obj = _.pick(resourceClone, blacklistedKeys);
    obj.data = data;
    return obj;
  }

  private async saveAllBulk() {
    const models: ResourceModel[] = this.dm.sideloadedModelData.getFlattenedData() as ResourceModel[];
    const changedModels: ResourceModel[] = models.filter((model: ResourceModel) => model.hasChanged());
    const changedResources: any[] = changedModels.map((model: ResourceModel) => this.makeBulkDocsResource(model));
    const docsMetadata: any[] = await this.dm.db.bulkDocs(changedResources);
    docsMetadata.forEach((docMetadata: any) => this.updateResourceModelMetadata(docMetadata));
    return this;
  }

  private async saveAllIndividually() {
    const writes: Promise<any>[] = [];
    const data: ISideloadedModelData = this.dm.sideloadedModelData.getData();
    for (const type of Object.keys(data)) {
      data[type].map((model: ResourceModel) => writes.push(this.saveModel(model)));
    }
    await Promise.all(writes);
    return this;
  }
}
