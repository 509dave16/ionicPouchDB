import {ResourceEntity} from "./ResourceEntity";
import {ResourceModel} from "./ResourceModel";
import TypeSchema = Resource.TypeSchema;

export class ResourceCollection extends ResourceEntity {
  public resourceCollection: any[];
  constructor(type: string, schema: TypeSchema[], relationalData: Resource.RelationalData) {
    super(type, schema, relationalData);
    if (relationalData[type] === undefined) {
      throw new Error(`type => ${type} is not defined in data.`);
    }
    this.resourceCollection = relationalData[type];
  }

  *[Symbol.iterator]() {
    for (let index = 0; index < this.resourceCollection.length; index++) {
      yield new ResourceModel(this.resourceCollection[index], this.type, this.schema, this.relationalData);
    }
  }

  first(): ResourceModel {
    if (this.resourceCollection.length) {
      return new ResourceModel(this.resourceCollection[0], this.type, this.schema, this.relationalData);
    }
    return null;
  }
}
