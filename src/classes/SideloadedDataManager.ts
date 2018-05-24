import {Database} from "./Database";
import TypeSchema = RanksORM.TypeSchema;
import RootResourceDescriptor = RanksORM.RootResourceDescriptor;
import {RanksORM} from "../namespaces/RanksORM.namespace";
import SideloadedData = RanksORM.SideloadedData;
import {ResourceCollection} from "./ResourceCollection";
import {ResourceModel} from "./ResourceModel";
import {objectClone} from "../utils/object.util";
import SaveOptions = RanksORM.SaveOptions;
import {SideloadedModelData} from "./SideloadedModelData";
import {RelationDataManager} from "./RelationDataManager";
import ParsedDocId = RanksORM.ParsedDocId;
import _ from 'lodash';
import ISideloadedModelData = RanksORM.ISideloadedModelData;
import {PersistenceManager} from "./PersistenceManager";

export class SideloadedDataManager {
  private static readonly PLURALITY_MANY = 'collection';
  private static readonly PLURALITY_ONE = 'model';

  protected rootResourceDescriptor: RootResourceDescriptor;
  public sideloadedModelData: SideloadedModelData;
  public rdm: RelationDataManager;
  public db: Database;
  public pm: PersistenceManager;

  constructor(rootDescriptor: RootResourceDescriptor, sideloadedData: SideloadedData, db: Database) {
    this.rootResourceDescriptor = rootDescriptor;
    this.db = db;
    const copiedSideloadedData: SideloadedData = objectClone(sideloadedData);
    this.sideloadedModelData = new SideloadedModelData(copiedSideloadedData, this);
    this.pm = new PersistenceManager(this);
    this.init();
  }

  private init() {
    this.rdm = new RelationDataManager(this);
  }

  public getRelation(type: string, id: number, relation: string): ResourceModel|ResourceCollection {
    return this.rdm.getRelation(type, id, relation);
  }

  public attachToRelation(parentModel: ResourceModel, relationName: string, modelOrResource: ResourceModel|any, inverseRelation: string) {
    return this.rdm.attachToRelation(parentModel, relationName, modelOrResource,inverseRelation);
  }

  public detachFromRelation(parentModel: ResourceModel, relationName: string, modelOrId: ResourceModel|number, inverseRelation: string) {
    return this.rdm.detachFromRelation(parentModel, relationName, modelOrId, inverseRelation);
  }

  public getTypeSchema(type: string): TypeSchema {
    return this.db.getSchema().find((typeSchema: TypeSchema) => typeSchema.plural === type || typeSchema.singular === type);
  }

  public refetch(): Promise<ResourceModel|ResourceCollection> {
    return this.rootResourceDescriptor.query();
  }

  public async save(options: SaveOptions): Promise<ResourceModel|ResourceCollection> {
    const modelOrCollection = await this.pm.save(options, this.getRoot());
    if (options.bulk) {
      this.init();
    }
    if (!options.refetch) {
      return modelOrCollection;
    }
    return this.refetch();
  }

    // public async save(options: SaveOptions): Promise<ResourceModel|ResourceCollection> {
  //   const modelOrCollection: ResourceModel|ResourceCollection = this.getRoot();
  //   if (options.related) {
  //     await options.bulk ? this.saveAllBulk() : this.saveAllIndividually();
  //   } else if (modelOrCollection instanceof  ResourceModel) {
  //     await this.saveModel(modelOrCollection);
  //   } else {
  //     const writes: Promise<any>[] = modelOrCollection.map((model: ResourceModel) => this.saveModel(model));
  //     await Promise.all(writes);
  //   }
  //
  //   if (!options.refetch) {
  //     return modelOrCollection;
  //   }
  //   return this.refetch();
  // }
  //
  // private async saveModel(model: ResourceModel): Promise<ResourceModel> {
  //   if (!model.hasChanged()) {
  //     return model;
  //   }
  //   const updatedModel: ResourceModel = await this.db.save(model.type, model.getResource()) as ResourceModel;
  //   const data = updatedModel.getResource();
  //   model.setResource(data);
  //   model.refreshOriginalResource();
  //   return model;
  // }
  //
  // private updateResourceModelMetadata(docMetadata: any) {
  //   const parsedDocID: ParsedDocId = this.db.parseDocID(docMetadata.id);
  //   const typeSchema: TypeSchema = this.getTypeSchema(parsedDocID.type);
  //   const model: ResourceModel = this.sideloadedModelData.getResourceModelByTypeAndId(typeSchema.plural, parsedDocID.id);
  //   model.setField('id', parsedDocID.id);
  //   model.setField('rev', docMetadata.rev);
  //   model.refreshOriginalResource();
  // }
  //
  // private makeBulkDocsResource(model: ResourceModel): any {
  //   // 1. Don't change models data
  //   const resourceClone: any = objectClone(model.getResource());
  //   // 2. Make a relational pouch id
  //   const { type, id } = model;
  //   const parsedDocID: ParsedDocId = { type, id};
  //   const rpId: string = this.db.makeDocID(parsedDocID);
  //   // 3. Remove unwanted id/rev in favor of Pouch/Couch spec of _id/_rev
  //   resourceClone._id = rpId;
  //   resourceClone._rev = resourceClone.rev;
  //   delete resourceClone.id;
  //   delete resourceClone.rev;
  //   // 4. Make an object with _id, _rev, and data(which is everything but _id/_rev
  //   const blacklistedKeys = ['_id', '_rev'];
  //   const data = _.omit(resourceClone, blacklistedKeys);
  //   const obj = _.pick(resourceClone, blacklistedKeys);
  //   obj.data = data;
  //   return obj;
  // }
  //
  // private async saveAllBulk() {
  //   const models: ResourceModel[] = this.sideloadedModelData.getFlattenedData() as ResourceModel[];
  //   const changedModels: ResourceModel[] = models.filter((model: ResourceModel) => model.hasChanged());
  //   const changedResources: any[] = changedModels.map((model: ResourceModel) => this.makeBulkDocsResource(model));
  //   const docsMetadata: any[] = await this.db.bulkDocs(changedResources);
  //   docsMetadata.forEach((docMetadata: any) => this.updateResourceModelMetadata(docMetadata));
  //   this.init();
  //   return this;
  // }
  //
  // private async saveAllIndividually() {
  //   const writes: Promise<any>[] = [];
  //   const data: ISideloadedModelData = this.sideloadedModelData.getData();
  //   for (const type of Object.keys(data)) {
  //     data[type].map((model: ResourceModel) => writes.push(this.saveModel(model)));
  //   }
  //   await Promise.all(writes);
  //   this.init();
  //   return this;
  // }

  public getRoot(): ResourceCollection | ResourceModel {
    if (this.rootResourceDescriptor.plurality === SideloadedDataManager.PLURALITY_MANY) {
     return this.getCollectionRoot();
    } else if (this.rootResourceDescriptor.plurality === SideloadedDataManager.PLURALITY_ONE) {
      return this.getModelRoot();
    }
    return null;
  }

  public getCollectionRoot(): ResourceCollection {
    let models: ResourceModel[] = [];
    if (this.rootResourceDescriptor.ids === null) {
      models = this.sideloadedModelData.getCollectionByType(this.rootResourceDescriptor.type);
    } else {
      models = this.sideloadedModelData.getResourceModelsByTypeAndIds(this.rootResourceDescriptor.type, this.rootResourceDescriptor.ids);
    }
    if (models.length === 0) return null;
    return new ResourceCollection(models, null, this);
  }

  public getModelRoot(): ResourceModel {
    return this.sideloadedModelData.getResourceModelByTypeAndId(this.rootResourceDescriptor.type, this.rootResourceDescriptor.ids[0]);
  }
}
