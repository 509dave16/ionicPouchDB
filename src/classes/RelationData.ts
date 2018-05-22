import {SideloadedDataManager} from "./SideloadedDataManager";
import {ResourceModel} from "./ResourceModel";
import {ResourceCollection} from "./ResourceCollection";
import {Resource} from "../namespaces/Resource.namespace";
import RelationDescriptor = Resource.RelationDescriptor;

export class RelationData {
  private static readonly RELATION_TYPE_HAS_MANY = 'hasMany';
  private static readonly RELATION_TYPE_BELONGS_TO = 'belongsTo';
  private readonly dm: SideloadedDataManager;
  protected relationCache: any = {};

  constructor(dm: SideloadedDataManager) {
    this.dm = dm;
    this.cacheRelations();
  }

  private hasRelation(type: string, relation: string) {
    return Object.keys(this.dm.getTypeSchema(type).relations).find( typeRelation => typeRelation === relation);
  }

  private errorIfRelationDoesntExist(type: string, relation: string) {
    if (!this.hasRelation(type, relation)) {
      throw new Error(`Model does not have relation ${relation}`);
    }
  }

  private errorIfValueIsUndefined(name, value) {
    if (!value) {
      throw new Error(`${name} is undefined.`);
    }
  }

  private cacheRelations() {
    this.relationCache = {};
    const data: any = this.dm.sideloadeModelData.getData();
    for (const type of  Object.keys(data)) {
      const models: ResourceModel[] = data[type];
      models.map((model: ResourceModel) => this.cacheModelRelations(model));
    }
  }

  private cacheModelRelations(model: ResourceModel) {
    this.errorIfValueIsUndefined('model', model);
    const schema = this.dm.getTypeSchema(model.type);
    for (const relationName of Object.keys(schema.relations)) {
      const relation = schema.relations[relationName];
      const descriptor: RelationDescriptor = this.getRelationDescriptor(model, relationName, relation);
      let value: ResourceCollection|ResourceModel = null;
      if (descriptor.relationType === RelationData.RELATION_TYPE_BELONGS_TO) {
        const resourceModel: ResourceModel = this.dm.sideloadeModelData.getResourceModelByTypeAndId(descriptor.relationResourceType, model.getField(relationName));
        if (!resourceModel) return;
        resourceModel.setRelationDescriptor(descriptor);
        value = resourceModel;
      } else if (descriptor.relationType === RelationData.RELATION_TYPE_HAS_MANY) {
        const models: ResourceModel[] = this.dm.sideloadeModelData.getResourceModelsByTypeAndIds(descriptor.relationResourceType, model.getField(relationName));
        const resourceCollection: ResourceCollection = new ResourceCollection(models, descriptor, this.dm);
        value = resourceCollection;
      }
      this.setRelation(model, relationName, value);
    }
  }

  private setRelation(parent: ResourceModel, relation: string, value: ResourceModel|ResourceCollection) {
    this.errorIfValueIsUndefined('parent Model', parent);
    this.errorIfValueIsUndefined('child Model/Collection', value);
    this.errorIfRelationDoesntExist(parent.type, relation);
    const { type, id } = parent;
    if (this.relationCache[type] === undefined) this.relationCache[type] = {};
    if (this.relationCache[type][id] === undefined) this.relationCache[type][id] = {};
    this.relationCache[type][id][relation] = value;
  }

  private unsetRelation(parent: ResourceModel, relation: string) {
    this.errorIfValueIsUndefined('parent Model', parent);
    this.errorIfRelationDoesntExist(parent.type, relation);
    const { type, id } = parent;
    if (this.relationCache[type] === undefined) this.relationCache[type] = {};
    if (this.relationCache[type][id] === undefined) this.relationCache[type][id] = {};
    this.relationCache[type][id][relation] = undefined;
  }

  public getRelation(type: string, id: number, relation: string): ResourceModel|ResourceCollection {
    this.errorIfRelationDoesntExist(type, relation);
    if (this.relationCache[type] === undefined) return null;
    if (this.relationCache[type][id] === undefined) return null;
    return this.relationCache[type][id][relation];
  }

  public attachToRelation(parentModel: ResourceModel, relationName: string, model: ResourceModel): ResourceModel {
    this.errorIfValueIsUndefined('parent model', parentModel);
    this.errorIfValueIsUndefined('child model', model);
    this.errorIfValueIsUndefined('child model id', model.id);

    const schema = this.dm.getTypeSchema(parentModel.type);
    const relation = schema.relations[relationName];
    const descriptor = this.getRelationDescriptor(parentModel, relationName, relation);
    // 1. Add model to wrapped data cache if it doesn't exist
    const resourceModel: ResourceModel = this.dm.sideloadeModelData.getResourceModelByTypeAndId(descriptor.relationResourceType, model.id);
    if (!resourceModel) { this.dm.sideloadeModelData.getCollectionByType(model.type).push(model); }
    // 2. Add model to parent
    if (descriptor.relationType === RelationData.RELATION_TYPE_BELONGS_TO) {
      parentModel.setField(relationName, model.id);
      this.setRelation(parentModel, relationName, model);
    } else if (descriptor.relationType === RelationData.RELATION_TYPE_HAS_MANY) {
      const collection = this.getRelation(parentModel.type, parentModel.id, relationName) as ResourceCollection;
      const modelExists = collection.find((resourceModel: ResourceModel) => resourceModel.id === model.id );
      if (!modelExists) {
        collection._push(model);
        parentModel.getField(relationName).push(model.id);
      }
    }
    return parentModel;
  }

  public detachFromRelation(parentModel: ResourceModel, relationName: string, modelOrId: ResourceModel|number): ResourceModel {
    this.errorIfValueIsUndefined('parent model', parentModel);
    let modelId: number;
    if (modelOrId !== undefined && (modelOrId as ResourceModel).id !== undefined) {
      const model = modelOrId as ResourceModel;
      this.errorIfValueIsUndefined('child model', model.id);
      modelId = model.id;
    } else if(modelOrId !== undefined) {
      modelId = modelOrId as number;
    }
    this.errorIfValueIsUndefined('modelOrId', modelOrId);
    const schema = this.dm.getTypeSchema(parentModel.type);
    const relation = schema.relations[relationName];
    const descriptor = this.getRelationDescriptor(parentModel, relationName, relation);

    if (descriptor.relationType === RelationData.RELATION_TYPE_BELONGS_TO) {
      parentModel.setField(relationName, null);
      this.unsetRelation(parentModel, relationName);
    } else if (descriptor.relationType === RelationData.RELATION_TYPE_HAS_MANY) {
      const collection = this.getRelation(parentModel.type, parentModel.id, relationName) as ResourceCollection;
      const modelIndex= collection.findIndex((resourceModel: ResourceModel) => resourceModel.id === modelId );
      if (modelIndex !== -1) { collection._splice(modelIndex, 1); }
      const idIndex = parentModel.getField(relationName).findIndex((id: number) => id === modelId);
      if (idIndex !== -1) { parentModel.getField(relationName).splice(idIndex, 1); }
    }
    return parentModel;
  }

  private getResourceType(descriptor) {
    return descriptor.hasMany || descriptor.belongsTo;
  }

  private getRelationType(descriptor) {
    if (descriptor.hasMany) {
      return RelationData.RELATION_TYPE_HAS_MANY;
    }
    if (descriptor.belongsTo) {
      return RelationData.RELATION_TYPE_BELONGS_TO;
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
}
