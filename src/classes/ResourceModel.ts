import {ResourceEntity} from "./ResourceEntity";
import TypeSchema = Resource.TypeSchema;
import {ResourceCollection} from "./ResourceCollection";
import {jsonCopy} from "../utils/json.util";
import ResourceQuery = Resource.ResourceQuery;

export class ResourceModel extends ResourceEntity{
  private resource: any;
  constructor(resource: any, type: string, schema: TypeSchema[], query: ResourceQuery, relationalData: Resource.RelationalData)
  {
    super(type, schema, relationalData);
    this.resource = resource;
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
      const relationalDataCopy = jsonCopy(this.relationalData);
      relationalDataCopy[type] =  this.getResourcesByTypeAndIds(type, relationIds);
      return new ResourceCollection(type, this.schema, this.query, relationalDataCopy);
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
    return new ResourceModel(resource, type, this.schema, this.query, this.relationalData);
  }

  getField(field) {
    return this.resource[field];
  }
}
