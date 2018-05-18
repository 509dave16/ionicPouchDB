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
      models.map((model: ResourceModel) => this.cacheModelRelations(type, model));
    }
  }

  private cacheModelRelations(type: string, model: ResourceModel) {
    const schema = this.getTypeSchema(type);
    for (const relationName of Object.keys(schema.relations)) {
      const relation = schema.relations[relationName];
      const relationResourceType = this.getResourceType(relation);
      const relationType = this.getRelationType(relation);
      const relationDesc: RelationDescriptor = {
        parent: model,
        parentResourceType: type,
        relationName,
        relationResourceType,
        relationType
      };
      let value: ResourceModel|ResourceCollection = null;
      if (relationType === SideloadedDataManager.RELATION_TYPE_BELONGS_TO) {
        const resourceModel: ResourceModel = this.getResourceModelByTypeAndId(relationResourceType, model.getField(relationName));
        resourceModel.setRelationDescriptor(relationDesc);
      } else if (relationType === SideloadedDataManager.RELATION_TYPE_HAS_MANY) {
        const models: ResourceModel[] = this.getResourceModelsByTypeAndIds(relationResourceType, model.getField(relationName));
        value = new ResourceCollection(models, relationDesc, this);
      }
      this.setRelation(type, model.id, relationName, value);
    }
  }

  private setRelation(type: string, id: number, relation: string, value: ResourceModel|ResourceCollection) {
    if (this.relationCache[type] === undefined) this.relationCache[type] = {};
    if (this.relationCache[type][id] === undefined) this.relationCache[type][id] = {};
    this.relationCache[type][id][relation] = value;
  }

  public getRelation(type: string, id: number, relation: string): ResourceModel|ResourceCollection {
    if (this.relationCache[type] === undefined) return null;
    if (this.relationCache[type][id] === undefined) return null;
    return this.relationCache[type][id][relation];
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

  public getTypeSchema(type: string): TypeSchema {
    return this.db.getSchema().find((typeSchema: TypeSchema) => typeSchema.plural === type);
  }

  public getResourceModelsByTypeAndIds(type, ids): ResourceModel[] {
    return ids.map(id => this.getResourceModelByTypeAndId(type, id)).filter(resource => resource !== null);
  }

  public getResourceModelByTypeAndId(type, id): ResourceModel {
    const models: ResourceModel[] =  this.getCollectionByType(type);
    let resourceModel= models.find((model) => model.id === id);
    if (!resourceModel) {
      return null;
    }
    return resourceModel;
  }

  public getCollectionByType(type): ResourceCollection {
    return this.wrappedData[type];
  }

  public saveModel(model: ResourceModel, refetch: boolean = false): Promise<any> {
    const originalResourceIndex = this.sideloadedData[model.type].findIndex(resource => model.id === resource.id );
    const originalResource = this.sideloadedData[model.type][originalResourceIndex];
    const changed = objectEqual(model.getResource(), originalResource);
    if (!changed) {
      return Promise.resolve(model);
    }
    return this.db.save(model.type, model.getResource())
      .then((data: any) => {
        // Update Model and sideloadedData
        model.setResource(data);
        this.sideloadedData[model.type][originalResourceIndex] = data;
        if (!refetch) {
          return this;
        }
        return this.refetch();
      })
    ;
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

  public refetch(): Promise<any> {
    return this.rootResourceDescriptor.query();
  }
}
