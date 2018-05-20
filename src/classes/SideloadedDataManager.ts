import {Database} from "./Database";
import TypeSchema = Resource.TypeSchema;
import RootResourceDescriptor = Resource.RootResourceDescriptor;
import {Resource} from "../namespaces/Resource.namespace";
import SideloadedData = Resource.SideloadedData;
import {ResourceCollection} from "./ResourceCollection";
import {ResourceModel} from "./ResourceModel";
import {objectEqual} from "../utils/object.util";
import RelationDescriptor = Resource.RelationDescriptor;


export class SideloadedDataManager {
  private static readonly RELATION_TYPE_HAS_MANY = 'hasMany';
  private static readonly RELATION_TYPE_BELONGS_TO = 'belongsTo';
  private static readonly PLURALITY_MANY = 'collection';
  private static readonly PLURALITY_ONE = 'model';

  protected rootResourceDescriptor: RootResourceDescriptor;
  protected sideloadedData: SideloadedData;
  protected wrappedData: any = {};
  protected relationCache: any;
  protected db: Database;

  constructor(rootDescriptor: RootResourceDescriptor, sideloadedData: SideloadedData, db: Database) {
    this.rootResourceDescriptor = rootDescriptor;
    this.sideloadedData = sideloadedData;
    this.db = db;
    this.wrapSideloadedData();
    this.cacheRelations();
  }

  private wrapSideloadedData() {
    for (const type of Object.keys(this.sideloadedData))
      this.wrappedData[type] = this.sideloadedData[type].map(resource => new ResourceModel(resource, type, this));
  }

  private cacheRelations() {
    this.relationCache = {};
    for (const type of  Object.keys(this.wrappedData)) {
      const models: ResourceModel[] = this.wrappedData[type];
      models.map((model: ResourceModel) => this.cacheModelRelations(model));
    }
  }

  private cacheModelRelations(model: ResourceModel) {
    const schema = this.getTypeSchema(model.type);
    for (const relationName of Object.keys(schema.relations)) {
      const relation = schema.relations[relationName];
      const descriptor: RelationDescriptor = this.getRelationDescriptor(model, relationName, relation);
      let value: ResourceModel|ResourceCollection = null;
      if (descriptor.relationType === SideloadedDataManager.RELATION_TYPE_BELONGS_TO) {
        const resourceModel: ResourceModel = this.getResourceModelByTypeAndId(descriptor.relationResourceType, model.getField(relationName));
        resourceModel.setRelationDescriptor(descriptor);
      } else if (descriptor.relationType === SideloadedDataManager.RELATION_TYPE_HAS_MANY) {
        const models: ResourceModel[] = this.getResourceModelsByTypeAndIds(descriptor.relationResourceType, model.getField(relationName));
        value = new ResourceCollection(models, descriptor, this);
      }
      this.setRelation(model, relationName, value);
    }
  }

  private setRelation(parent: ResourceModel, relation: string, value: ResourceModel|ResourceCollection) {
    const { type, id } = parent;
    if (this.relationCache[type] === undefined) this.relationCache[type] = {};
    if (this.relationCache[type][id] === undefined) this.relationCache[type][id] = {};
    this.relationCache[type][id][relation] = value;
  }

  private unsetRelation(parent: ResourceModel, relation: string) {
    const { type, id } = parent;
    if (this.relationCache[type] === undefined) this.relationCache[type] = {};
    if (this.relationCache[type][id] === undefined) this.relationCache[type][id] = {};
    this.relationCache[type][id][relation] = undefined;
  }

  public getRelation(type: string, id: number, relation: string): ResourceModel|ResourceCollection {
    if (this.relationCache[type] === undefined) return null;
    if (this.relationCache[type][id] === undefined) return null;
    return this.relationCache[type][id][relation];
  }

  public attachToRelation(parentModel: ResourceModel, relationName: string, model: ResourceModel) {
    const schema = this.getTypeSchema(model.type);
    const relation = schema.relations[relationName];
    const descriptor = this.getRelationDescriptor(parentModel, relationName, relation);
    // 1. Add model to wrapped data cache if it doesn't exist
    const resourceModel: ResourceModel = this.getResourceModelByTypeAndId(descriptor.relationResourceType, model.id);
    if (!resourceModel) this.getCollectionByType(model.type).push(model);
    // 2. Add model to parent
    if (descriptor.relationType === SideloadedDataManager.RELATION_TYPE_BELONGS_TO) {
      parentModel.setField(relationName, model.id);
      this.setRelation(model, relationName, model);
    } else if (descriptor.relationType === SideloadedDataManager.RELATION_TYPE_HAS_MANY) {
      const collection = this.getRelation(parentModel.type, parentModel.id, relationName) as ResourceCollection;
      const modelExists = collection.find((resourceModel: ResourceModel) => resourceModel.id === model.id );
      if (!modelExists) {
        collection.push(model);
        parentModel.getField(relationName).push(model.id);
      }
    }
  }

  public detachFromRelation(parentModel, relationName, model) {
    const schema = this.getTypeSchema(model.type);
    const relation = schema.relations[relationName];
    const descriptor = this.getRelationDescriptor(parentModel, relationName, relation);

    if (descriptor.relationType === SideloadedDataManager.RELATION_TYPE_BELONGS_TO) {
      parentModel.setField(relationName, null);
      this.unsetRelation(model, relationName);
    } else if (descriptor.relationType === SideloadedDataManager.RELATION_TYPE_HAS_MANY) {
      const collection = this.getRelation(parentModel.type, parentModel.id, relationName) as ResourceCollection;
      const modelIndex= collection.findIndex((resourceModel: ResourceModel) => resourceModel.id === model.id );
      if (modelIndex !== -1) collection.splice(modelIndex, 1);
      const idIndex = parentModel.getField(relationName).findIndex((id: number) => id === model.id);
      if (idIndex !== -1) parentModel.getField(relationName).splice(idIndex, 1);
    }
  }

  public getTypeSchema(type: string): TypeSchema {
    return this.db.getSchema().find((typeSchema: TypeSchema) => typeSchema.plural === type);
  }

  public getCollectionByType(type): ResourceModel[] {
    return this.wrappedData[type];
  }

  public getResourceModelByTypeAndId(type, id): ResourceModel {
    const models: ResourceModel[] =  this.getCollectionByType(type);
    let resourceModel= models.find((model) => model.id === id);
    if (!resourceModel) {
      return null;
    }
    return resourceModel;
  }

  public getResourceModelsByTypeAndIds(type, ids): ResourceModel[] {
    return ids.map(id => this.getResourceModelByTypeAndId(type, id)).filter(resource => resource !== null);
  }

  public refetch(): Promise<any> {
    return this.rootResourceDescriptor.query();
  }

  public async saveModel(model: ResourceModel, refetch: boolean = false): Promise<ResourceModel> {
    const originalResourceIndex = this.sideloadedData[model.type].findIndex(resource => model.id === resource.id );
    const originalResource = this.sideloadedData[model.type][originalResourceIndex];
    const changed = objectEqual(model.getResource(), originalResource);
    if (!changed) {
      return model;
    }
    const data: any = await this.db.save(model.type, model.getResource());
    model.setResource(data);
    this.sideloadedData[model.type][originalResourceIndex] = data;
    if (!refetch) {
      return model;
    }
    return this.refetch();
  }

  async saveAll() {
    const writes: Promise<any>[] = [];
    for (const type of Object.keys(this.sideloadedData)) {
      this.sideloadedData[type].map((model: ResourceModel) => writes.push(this.saveModel(model)));
    }
    return Promise.all(writes);
  }

  private getResourceType(descriptor) {
    return descriptor.hasMany || descriptor.belongsTo;
  }

  private getRelationType(descriptor) {
    if (descriptor.hasMany) {
      return SideloadedDataManager.RELATION_TYPE_HAS_MANY;
    }
    if (descriptor.belongsTo) {
      return SideloadedDataManager.RELATION_TYPE_BELONGS_TO;
    }
  }

  private getRelationDescriptor(model: ResourceModel, relationName, relation: any): RelationDescriptor {
    const relationResourceType = this.getResourceType(relation);
    const relationType = this.getRelationType(relation);
    return {
      parent: model,
      parentResourceType: model.type,
      relationName,
      relationResourceType,
      relationType
    };
  }

  public getRoot(): ResourceCollection | ResourceModel {
    if (this.rootResourceDescriptor.plurality === SideloadedDataManager.PLURALITY_MANY) {
     return this.getCollectionRoot();
    } else if (this.rootResourceDescriptor.plurality === SideloadedDataManager.PLURALITY_ONE) {
      return this.getModelRoot();
    }
    return null;
  }

  public getCollectionRoot(): ResourceCollection {
    const models: ResourceModel[] = this.getResourceModelsByTypeAndIds(this.rootResourceDescriptor.type, this.rootResourceDescriptor.ids);
    if (models.length === 0) return null;
    return new ResourceCollection(models, null, this);
  }

  public getModelRoot(): ResourceModel {
    return this.getResourceModelByTypeAndId(this.rootResourceDescriptor.type, this.rootResourceDescriptor.ids[0]);
  }
}