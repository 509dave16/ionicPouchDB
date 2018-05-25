import {SideloadedDataManager} from "./SideloadedDataManager";
import {ResourceModel} from "./ResourceModel";
import {ResourceCollection} from "./ResourceCollection";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import RelationDescriptor = RanksORM.RelationDescriptor;

export class RelationDataManager {
  public static readonly RELATION_TYPE_HAS_MANY = 'hasMany';
  public static readonly RELATION_TYPE_BELONGS_TO = 'belongsTo';
  private readonly dm: SideloadedDataManager;
  public static readonly PARENT_TO_CHILD_CACHE = 'parentToChildCache';
  public static readonly CHILD_TO_PARENT_CACHE = 'childToParentCache';
  private parentToChildCache: any = {};
  private childToParentCache: any = {};

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
    if (value === undefined || value === null) {
      throw new Error(`${name} is undefined.`);
    }
  }

  private getCache(cache: any) {
    if (typeof cache === 'string') {
      if (this[cache] == undefined) { throw new Error(`Cache ${cache} does not exist.`) }
      return this[cache];
    }
    return cache;
  }

  public getCacheOf(cache: any, type: string, id: number): any {
    cache = this.getCache(cache);
    return cache[type][id];
  }

  private cacheRelations() {
    this.parentToChildCache = {};
    this.childToParentCache = {};
    const data: any = this.dm.sideloadedModelData.getData();
    for (const type of  Object.keys(data)) {
      const models: ResourceModel[] = data[type];
      models.map((model: ResourceModel) => this.cacheModelRelations(model));
    }
  }

  private cacheModelRelations(model: ResourceModel) {
    this.errorIfValueIsUndefined('model', model);
    const schema = this.dm.getTypeSchema(model.type);
    for (const relationName of Object.keys(schema.relations)) {
      const descriptor: RelationDescriptor = this.getRelationDescriptor(model, relationName);
      if (descriptor.relationType === RelationDataManager.RELATION_TYPE_BELONGS_TO) {
        const childModel: ResourceModel = this.dm.sideloadedModelData.getResourceModelByTypeAndId(descriptor.relationResourceType, model.getField(relationName));
        if (!childModel) return;
        childModel.setRelationDescriptor(descriptor);
        this.setRelation(this.childToParentCache, childModel, relationName, model);
        this.setRelation(this.parentToChildCache, model, relationName, childModel);
      } else if (descriptor.relationType === RelationDataManager.RELATION_TYPE_HAS_MANY) {
        const models: ResourceModel[] = this.dm.sideloadedModelData.getResourceModelsByTypeAndIds(descriptor.relationResourceType, model.getField(relationName));
        models.forEach((childModel: ResourceModel) => this.setRelation(this.childToParentCache, childModel, relationName, model));
        const resourceCollection: ResourceCollection = new ResourceCollection(models, descriptor, this.dm);
        this.setRelation(this.parentToChildCache, model, relationName, resourceCollection);
      }
    }
  }

  private setRelation(cache: any, parent: ResourceModel, relation: string, value: ResourceModel|ResourceCollection) {
    cache = this.getCache(cache);
    this.errorIfValueIsUndefined('parent Model', parent);
    this.errorIfValueIsUndefined('child Model/Collection', value);
    if (cache === this.parentToChildCache) {
      this.errorIfRelationDoesntExist(parent.type, relation);
    }
    const { type, id } = parent;
    if (cache[type] === undefined) cache[type] = {};
    if (cache[type][id] === undefined) cache[type][id] = {};
    cache[type][id][relation] = value;
  }

  private unsetRelation(cache: any, parent: ResourceModel, relation: string) {
    cache = this.getCache(cache);
    this.errorIfValueIsUndefined('parent Model', parent);
    if (cache === this.parentToChildCache) {
      this.errorIfRelationDoesntExist(parent.type, relation);
    }
    const { type, id } = parent;
    if (cache[type] === undefined) cache[type] = {};
    if (cache[type][id] === undefined) cache[type][id] = {};
    cache[type][id][relation] = undefined;
  }

  public getRelation(type: string, id: number, relation: string, cache: any = this.parentToChildCache): ResourceModel|ResourceCollection {
    cache = this.getCache(cache);
    if (cache === this.parentToChildCache) {
      this.errorIfRelationDoesntExist(type, relation);
    }
    if (cache[type] === undefined) return null;
    if (cache[type][id] === undefined) return null;
    return cache[type][id][relation];
  }

  public getInverseDescriptor(parentDescriptor: RelationDescriptor, childModel: ResourceModel, relationName: string = ''): RelationDescriptor {
    if (!relationName) {
      relationName = this.getFirstRelationOfType(parentDescriptor.parentResourceType, childModel.type);
    }
    if (!relationName) {
      return null; // if still empty that means there's no inverse relation. So we exit.
    }
    return this.getRelationDescriptor(childModel, relationName)
  }

  public getFirstRelationOfType(typeNeedle, typeHaystack) {
    const relations = this.dm.getTypeSchema(typeHaystack).relations;
    for(const relationName in relations) {
      const relation = relations[relationName];
      const type = this.getResourceType(relation);
      if (type === typeNeedle) {
        return relationName;
      }
    }
    return '';
  }

  public attachToRelation(parentModel: ResourceModel, relationName: string, modelOrResource: ResourceModel|any, inverseRelationName: any = '') {
    // 1. Get Descriptors for additions
    this.errorIfValueIsUndefined('parent model', parentModel);
    const descriptor = this.getRelationDescriptor(parentModel, relationName);
    let childModel: ResourceModel;
    if (this.isModel(modelOrResource)) {
      childModel = modelOrResource as ResourceModel;
    } else if(modelOrResource.id !== undefined) {
      childModel = new ResourceModel(modelOrResource, descriptor.relationResourceType, this.dm);
    } else if(modelOrResource !== undefined) {
      const resource: any = modelOrResource;
      resource.id = this.dm.db.getNextMaxDocId(descriptor.relationResourceType);
      childModel = new ResourceModel(resource, descriptor.relationResourceType, this.dm)
    }
    this.errorIfValueIsUndefined('child model', childModel);
    const inverseDescriptor: RelationDescriptor = inverseRelationName === false ? null : this.getInverseDescriptor(descriptor, childModel, inverseRelationName);

    // 2. Make sure that the model will exist in the SideloadedModelData
    const resourceModel: ResourceModel = this.dm.sideloadedModelData.getResourceModelByTypeAndId(descriptor.relationResourceType, childModel.id);
    if (!resourceModel) { this.dm.sideloadedModelData.getCollectionByType(childModel.type).push(childModel); }

    // 3. Perform additions to asked for relation and for the inverse
    if (inverseDescriptor) { this.addToRelation(inverseDescriptor, parentModel); }
    this.addToRelation(descriptor, childModel);
  }

  public addToRelation(descriptor: RelationDescriptor, childModel: ResourceModel) {
    const parentModel: ResourceModel = descriptor.parent;
    const relationName: string = descriptor.relationName;
    if (descriptor.relationType === RelationDataManager.RELATION_TYPE_BELONGS_TO) {
      parentModel.setField(relationName, childModel.id);
      this.setRelation(this.parentToChildCache, parentModel, relationName, childModel);
      this.setRelation(this.childToParentCache, childModel, relationName, parentModel);
    } else if (descriptor.relationType === RelationDataManager.RELATION_TYPE_HAS_MANY) {
      const collection = this.getRelation(parentModel.type, parentModel.id, relationName, this.parentToChildCache) as ResourceCollection;
      const modelExists = collection.find((resourceModel: ResourceModel) => resourceModel.id === childModel.id );
      if (!modelExists) {
        collection._push(childModel);
        parentModel.addToField(relationName, childModel.id);
        this.setRelation(this.childToParentCache, childModel, relationName, parentModel);
      }
    }
  }

  private isModel(value: any): boolean {
    return value !== undefined && (value as ResourceModel).type !== undefined;
  }

  public detachFromRelation(parentModel: ResourceModel, relationName: string, childModelOrId: ResourceModel|number, inverseRelationName: any = '') {
    this.errorIfValueIsUndefined('parent model', parentModel);
    const descriptor: RelationDescriptor = this.getRelationDescriptor(parentModel, relationName);
    let childModel: ResourceModel;
    if (this.isModel(childModelOrId)) {
      childModel = childModelOrId as ResourceModel;
    } else{
      childModel = this.dm.sideloadedModelData.getResourceModelByTypeAndId(descriptor.relationResourceType, childModelOrId as number);
    }
    this.errorIfValueIsUndefined('child model', childModel);
    const inverseDescriptor = inverseRelationName === false ? null : this.getInverseDescriptor(descriptor, childModel);
    if (inverseDescriptor) { this.removeFromRelation(inverseDescriptor, parentModel) }
    this.removeFromRelation(descriptor, childModel);
  }

  public removeFromRelation(descriptor: RelationDescriptor, childModel: ResourceModel) {
    const parentModel: ResourceModel = descriptor.parent;
    const relationName: string = descriptor.relationName;
    if (descriptor.relationType === RelationDataManager.RELATION_TYPE_BELONGS_TO) {
      parentModel.setField(relationName, null);
      this.unsetRelation(this.parentToChildCache, parentModel, relationName);
      this.unsetRelation(this.childToParentCache, childModel, relationName);
    } else if (descriptor.relationType === RelationDataManager.RELATION_TYPE_HAS_MANY) {
      const collection = this.getRelation(parentModel.type, parentModel.id, relationName, this.parentToChildCache) as ResourceCollection;
      const modelIndex= collection.findIndex((resourceModel: ResourceModel) => resourceModel.id === childModel.id );
      if (modelIndex !== -1) {
        this.unsetRelation(this.childToParentCache, childModel, relationName);
        collection._splice(modelIndex, 1);
      }
      const idIndex = parentModel.getField(relationName).findIndex((id: number) => id === childModel.id);
      if (idIndex !== -1) { parentModel.getField(relationName).splice(idIndex, 1); }
    }
  }

  private getResourceType(descriptor) {
    return descriptor.hasMany || descriptor.belongsTo;
  }

  private getRelationType(descriptor) {
    if (descriptor.hasMany) {
      return RelationDataManager.RELATION_TYPE_HAS_MANY;
    }
    if (descriptor.belongsTo) {
      return RelationDataManager.RELATION_TYPE_BELONGS_TO;
    }
  }

  public getRelationDescriptor(model: ResourceModel, relationName): RelationDescriptor {
    const schema = this.dm.getTypeSchema(model.type);
    const relation = schema.relations[relationName];
    if (relation == undefined) {
      throw new Error(`Relation '${relationName}' does not exist on resource of ${model.id} in ${model.type}`);
    }
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
