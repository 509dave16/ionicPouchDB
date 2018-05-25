import {ResourceCollection} from "./ResourceCollection";
import {ResourceModel} from "./ResourceModel";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import SaveOptions = RanksORM.SaveOptions;
import ParsedDocId = RanksORM.ParsedDocId;
import TypeSchema = RanksORM.TypeSchema;
import ISideloadedModelData = RanksORM.ISideloadedModelData;
import {RelationDataManager} from "./RelationDataManager";
import RelationDescriptor = RanksORM.RelationDescriptor;

export class PersistenceManager {
  private dm: SideloadedDataManager;
  private newDocIds: any;
  constructor(dm: SideloadedDataManager) {
    this.dm = dm;
  }

  private async createNewDocIds() {
    await this.dm.db.initializeMaxDocIdCache();
    this.newDocIds = {};
    const data: any = this.dm.sideloadedModelData.getData();
    for (const type of  Object.keys(data)) {
      data[type].map((model: ResourceModel) => this.createNewDocId(model));
    }

    for (const type of  Object.keys(data)) {
      data[type].map((model: ResourceModel) => this.updateRelationDocIds(model));
    }
  }

  private updateRelationDocIds(model: ResourceModel) {
    const schema = this.dm.getTypeSchema(model.type);
    for (const relationName of Object.keys(schema.relations)) {
      const descriptor: RelationDescriptor = this.dm.rdm.getRelationDescriptor(model, relationName);
      let value: ResourceCollection|ResourceModel = null;
      if (descriptor.relationType === RelationDataManager.RELATION_TYPE_BELONGS_TO) {
        const oldId: number = model.getField(relationName);
        const newId: number = this.getNewDocId(descriptor.relationResourceType, oldId);
        model.setField(relationName, newId);
      } else if (descriptor.relationType === RelationDataManager.RELATION_TYPE_HAS_MANY) {
        const oldIds = model.getField(relationName);
        for(let idIndex = 0; idIndex < oldIds.length; idIndex++) {
          const oldId = oldIds[idIndex];
          const newId: number = this.getNewDocId(descriptor.relationResourceType, oldId);
          oldIds[idIndex] = newId
        }
      }
    }
  }

  private createNewDocId(model: ResourceModel) {
    if (model.isNew()) {
      const docId: number = this.dm.db.getNextMaxDocId(model.type);
      this.setNewDocId(model.type, model.id, docId);
      model.setField('id', docId);
    } else {
      this.setNewDocId(model.type, model.id, model.id);
    }
  }

  private setNewDocId(type: string, oldId: number, newId: number) {
    if (this.newDocIds[type] === undefined) this.newDocIds[type] = {};
    this.newDocIds[type][oldId] =newId;
  }

  public getNewDocId(type: string, oldId: number): number {
    if (this.newDocIds[type] === undefined) return null;
    return this.newDocIds[type][oldId];
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

  private handleBulkDocResponseElement(response: any) {
    if (response.error && response.name === 'conflict') {

    } else if(response.ok) {

    } else {

    }
  }

  private async saveAllBulk() {
    const models: ResourceModel[] = this.dm.sideloadedModelData.getFlattenedData() as ResourceModel[];
    const changedModels: ResourceModel[] = models.filter((model: ResourceModel) => model.hasChanged());
    await  this.saveNewResources(changedModels);
    await this.saveUpdatedResources(changedModels);
    return this;
  }

  private async saveNewResources(changedModels: ResourceModel[]) {
    const newResources: any[] = changedModels.filter((model: ResourceModel) => model.isNew()).map((model: ResourceModel) => model.makeBulkDocsResource());
    const newDocsMetadata: any[] = await this.dm.db.bulkDocs(newResources);
    newDocsMetadata.forEach((docMetadata: any) => this.updateResourceModelMetadata(docMetadata));
    // newResources.push({
    //   _id: 'book_1_0000000000000012',
    //   data: { name: 'its me'},
    // });
    // newResources.push({
    //   _id: 'book_1_0000000000000013',
    //   data: { name: 'its me'},
    // });
  }

  private async saveUpdatedResources(changedModels: ResourceModel[]) {
    const updatedResources: any[] = changedModels.filter((model: ResourceModel) => !model.isNew()).map((model: ResourceModel) => model.makeBulkDocsResource());
    const updatedDocsMetadata: any[] = await this.dm.db.bulkDocs(updatedResources);
    updatedDocsMetadata.forEach((docMetadata: any) => this.updateResourceModelMetadata(docMetadata));
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
