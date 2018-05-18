import {ResourceModel} from "./ResourceModel";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import RelationDescriptor = Resource.RelationDescriptor;

export class ResourceCollection extends Array {
  private dataManager: SideloadedDataManager;
  private relationDesc: RelationDescriptor;
  constructor(models: any[], relationDesc: RelationDescriptor,  dataManager: SideloadedDataManager) {
    super(...models);
    this.relationDesc = relationDesc;
    this.dataManager = dataManager;
  }

  add(model: ResourceModel) {
    const { parent, relationName } = this.relationDesc;
    const ids: number[] = parent[relationName];
    if (ids.find(id => id === model.id)) {
      return;
    }
    ids.push(model.id);
    this.push(model);
  }

  remove(model: ResourceModel) {
    const { parent, relationName } = this.relationDesc;
    const ids: number[] = parent[relationName];
    let indexOfId = ids.indexOf(model.id);
    if (indexOfId === -1) {
      return;
    }
    ids.splice(indexOfId, 1);
    const indexOfModel: number = this.indexOf(model);
    this.splice(indexOfModel, 1);
  }

  first(): ResourceModel {
    if (this.length) {
      return this[0];
    }
    return null;
  }

  last(): ResourceModel {
    if (this.length) {
      return this[this.length - 1];
    }
    return null;
  }

  save(refetch: boolean = false): Promise<any> {
    const writes: Promise<any>[] = this.map((model: ResourceModel) => this.dataManager.saveModel(model));
    return Promise.all(writes).then(() => {
      if (!refetch) {
        return this;
      }
      return this.dataManager.refetch();
    });
  }
}
