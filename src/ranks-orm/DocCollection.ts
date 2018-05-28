import {DocModel} from "./DocModel";
import {RanksMediator} from "./RanksMediator";
import {RanksORM} from "./RanksORM.namespace";
import DocRelationDescriptor = RanksORM.DocRelationDescriptor;
import SaveOptions = RanksORM.SaveOptions;

export class DocCollection {
  private dataManager: RanksMediator;
  private readonly  relationDesc: DocRelationDescriptor;
  private readonly models: DocModel[];
  constructor(models: any[], relationDesc: DocRelationDescriptor,  dataManager: RanksMediator) {
    this.models = models;
    this.relationDesc = relationDesc;
    this.dataManager = dataManager;
  }

  get(index: number): DocModel {
    return this.models[index];
  }

  add(modelOrDoc: DocModel|any, inverseRelation?:string ): DocCollection {
    const { from, relationName } = this.relationDesc;
    this.dataManager.attachToRelation(from, relationName, modelOrDoc, inverseRelation);
    return this;
  }

  remove(modelOrId: DocModel|number, inverseRelation?: string): DocCollection {
    const { from, relationName } = this.relationDesc;
    this.dataManager.detachFromRelation(from, relationName, modelOrId, inverseRelation);
    return this;
  }

  first(): DocModel {
    if (this.length) {
      return this[0];
    }
    return null;
  }

  last(): DocModel {
    if (this.length) {
      return this[this.length - 1];
    }
    return null;
  }

  async save(options: SaveOptions = { refetch: false, related: false, bulk: false}): Promise<any> {
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
}
