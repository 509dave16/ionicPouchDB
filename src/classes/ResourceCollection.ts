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
  [Symbol.iterator]() {
    let index = 0;
    const collection = this.resourceCollection;
    const that = this;
    return {
      next() {
        const value = new ResourceModel(collection[index++], that.type, that.schema, that.relationalData);
        return {
          value,
          done: index === collection.length
        };
      }
    };
  }

  first(): ResourceModel {
    if (this.resourceCollection.length) {
      return new ResourceModel(this.resourceCollection[0], this.type, this.schema, this.relationalData);
    }
    return null;
  }
}
