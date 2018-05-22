import {ResourceModel} from "./ResourceModel";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import RelationDescriptor = Resource.RelationDescriptor;
import SaveOptions = Resource.SaveOptions;

export class ResourceCollection {
  private dataManager: SideloadedDataManager;
  private readonly  relationDesc: RelationDescriptor;
  private readonly models: ResourceModel[];
  constructor(models: any[], relationDesc: RelationDescriptor,  dataManager: SideloadedDataManager) {
    this.models = models;
    this.relationDesc = relationDesc;
    this.dataManager = dataManager;
  }

  add(model: ResourceModel) {
    const { parent, relationName } = this.relationDesc;
    this.dataManager.attachToRelation(parent, relationName, model);
  }

  remove(modelOrId: ResourceModel|number) {
    const { parent, relationName } = this.relationDesc;
    this.dataManager.detachFromRelation(parent, relationName, modelOrId);
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

  async save(options: SaveOptions = { refetch: false, related: false}): Promise<any> {
    return this.dataManager.save(options);
  }

  /** Public Array Member Implementations **/
  *[Symbol.iterator]() {
    for (let index = 0; index < this.models.length; index++) {
      yield this.models[index];
    }
  }

  get length(): number {
    return this.models.length;
  }

  map<U>(callback, thisArg?: any): U[] {
    return this.models.map<U>(callback, thisArg);
  }

  find(callback, thisArg?: any) {
    return this.models.find(callback, thisArg);
  }

  findIndex(callback, thisArg?: any) {
    return this.models.findIndex(callback, thisArg)
  }

  /** Private Array Member Implementations **/
  _push(model: ResourceModel) {
    this.models.push(model);
  }
  _splice(start: number, deleteCount?: number) {
    this.models.splice(start, deleteCount);
  }
}
