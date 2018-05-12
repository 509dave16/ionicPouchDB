import {ResourceEntity} from "./ResourceEntity";
import {ResourceCollection} from "./ResourceCollection";
import {objectClone, objectEqual} from "../utils/object.util";
import TypeSchema = Resource.TypeSchema;
import RelationalData = Resource.RelationalData;
import {RelationalDB, ResourceQuery} from "./RelationalDB";

export class ResourceModel extends ResourceEntity{
  private resource: any;

  constructor(type: string, query: ResourceQuery, relationalData: RelationalData, resource: any, schema: TypeSchema[], db: RelationalDB)
  {
    super(type, query, relationalData, schema, db);
    this.resource = objectClone(resource);
  }
  get(relation): ResourceModel|ResourceCollection {
    const relationType = this.getRelationType(relation);
    if (relationType === null) {
      return null;
    }
    const isCollection = relationType.hasMany !== undefined;
    const isModel = relationType.belongsTo !== undefined;
    if (!isCollection && !isModel) {
      throw new Error(`Relation ${relation} does not define hasMany or belongsTo.`);
    }
    if (isCollection) {
      return this.getCollection(relation)
    }
    if (isModel) {
      return this.getModel(relation);
    }
  }

  getCollection(relation): ResourceCollection {
    const relationType = this.getRelationType(relation);
    if (relationType === null) {
      return null;
    }
    const isCollection = relationType.hasMany !== undefined;
    if (!isCollection) {
      throw new Error(`Relation ${relation} does not have hasMany defined.`);
    }
    const type = relationType.hasMany;
    const relationIds = this.resource[relation];
    return new ResourceCollection(type, this.query, this.relationalData, relationIds, this.schema, this.db);
  }

  getModel(relation): ResourceModel {
    const relationType = this.getRelationType(relation);
    if (relationType === null) {
      return null;
    }
    const isModel = relationType.belongsTo !== undefined;
    if (!isModel) {
      throw new Error(`Relation ${relation} does not define belongsTo.`);
    }
    const type = relationType.belongsTo;
    const relationId = this.resource[relation];
    const resource = this.getResourceByTypeAndId(type, relationId);
    return new ResourceModel(type, this.query, this.relationalData, resource, this.schema, this.db);
  }

  getField(field) {
    return this.resource[field];
  }

  setField(field, value) {
    this.resource[field] = value;
  }

  save(refetch: boolean = false): Promise<any> {
    const originalResource = this.getResourceByTypeAndId(this.type, this.resource.id);
    const changed = objectEqual(this.resource, originalResource);
    if (!changed) {
      return Promise.resolve(this);
    }
    return this.db.save(this.type, this.resource)
      .then((data: any) => {
        if (!refetch) {
          return this;
        }
        return this.refetch();
      })
    ;
  }
}
