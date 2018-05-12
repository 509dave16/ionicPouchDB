import {ResourceEntity} from "./ResourceEntity";
import {ResourceModel} from "./ResourceModel";
import {objectClone} from "../utils/object.util";
import {RelationalDB, ResourceQuery} from "./RelationalDB";

export class ResourceCollection extends ResourceEntity {
  private resourceCollection: any[];
  private ids: number[];

  constructor(type: string, query: ResourceQuery, relationalData: Resource.RelationalData, ids: number[], schema: Resource.TypeSchema[], db: RelationalDB) {
    super(type, query, relationalData, schema, db);
    if (relationalData[type] === undefined) {
      throw new Error(`type => ${type} is not defined in data.`);
    }
    this.resourceCollection = objectClone(this.getResourcesByTypeAndIds(type, ids));
    this.ids = ids;
  }

  *[Symbol.iterator]() {
    let numOfResourcesIterated = 0;
    for (let index = 0; index < this.resourceCollection.length && numOfResourcesIterated < this.ids.length; index++) {
      const resource = this.resourceCollection[index];
      if (this.ids.length === 0) {
        yield this.createResourceModel(resource);
      } else if (this.ids.find(id => resource.id === id)) {
        numOfResourcesIterated++;
        yield this.createResourceModel(resource);
      }
    }
  }

  first(): ResourceModel {
    if (this.resourceCollection.length) {
      const resource = this.resourceCollection[0];
      return this.createResourceModel(resource);
    }
    return null;
  }

  save(refetch: boolean = false): Promise<any> {
    const writes: Promise<any>[] = this.resourceCollection.map((resource) => {
      const model = this.createResourceModel(resource);
      return model.save();
    });
    return Promise.all(writes).then(() => {
      if (!refetch) {
        return this;
      }
      return this.refetch();
    });
  }

  private createResourceModel(resource: any): ResourceModel {
    return new ResourceModel(this.type, this.query, this.relationalData, resource, this.schema, this.db);
  }
}
