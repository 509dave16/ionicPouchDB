import {ResourceEntity} from "./ResourceEntity";
import {ResourceModel} from "./ResourceModel";
import TypeSchema = Resource.TypeSchema;
import ResourceQuery = Resource.ResourceQuery;
import {jsonCopy} from "../utils/json.util";

export class ResourceCollection extends ResourceEntity {
  private resourceCollection: any[];
  private ids: number[];
  constructor(type: string, schema: TypeSchema[], query: ResourceQuery, relationalData: Resource.RelationalData, ids: number[] = []) {
    super(type, schema, relationalData);
    if (relationalData[type] === undefined) {
      throw new Error(`type => ${type} is not defined in data.`);
    }
    this.resourceCollection = jsonCopy(this.getResourcesByTypeAndIds(type, ids));
    this.ids = ids;
  }

  *[Symbol.iterator]() {
    let numOfResourcesIterated = 0;
    for (let index = 0; index < this.resourceCollection.length && numOfResourcesIterated < this.ids.length; index++) {
      const resource = this.resourceCollection[index];
      if (this.ids.length === 0) {
        yield new ResourceModel(resource, this.type, this.schema, this.query, this.relationalData);
      } else if (this.ids.find(id => resource.id === id)) {
        numOfResourcesIterated++;
        yield new ResourceModel(resource, this.type, this.schema, this.query, this.relationalData);
      }
    }
  }

  first(): ResourceModel {
    if (this.resourceCollection.length) {
      const resource = this.resourceCollection[0];
      return new ResourceModel(resource, this.type, this.schema, this.query, this.relationalData);
    }
    return null;
  }
}
