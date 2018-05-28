import {throwErrorIfUndefined} from "../utils/error.util";
import {RanksORM} from "./RanksORM.namespace";
import {DataRelationsNamespace} from "./DataRelations.namespace";
import DataDescriptor = DataRelationsNamespace.DataDescriptor;
export abstract class DataRelations {
  protected cache: any;

  constructor() {
    this.cache = {};
  }

  public get<T>(type: string, id: number, relation: string): T {
    this.throwErrorIfCacheParameterUndefined(type, id, relation);
    if (this.cache[type] === undefined) return null;
    if (this.cache[type][id] === undefined) return null;
    return this.cache[type][id][relation];
  }

  public getRelationsFor(type: string, id): any {
    return this.cache[type][id];
  }

  protected set<T>(type: string, id: number, relation: string, value: T)  {
    this.throwErrorIfCacheParameterUndefined(type, id, relation);
    if (this.cache[type] === undefined) this.cache[type] = {};
    if (this.cache[type][id] === undefined) this.cache[type][id] = {};
    this.cache[type][id][relation] = value;
  }

  protected unset(type: string, id: number, relation: string) {
    this.throwErrorIfCacheParameterUndefined(type, id, relation);
    if (this.cache[type] === undefined) this.cache[type] = {};
    if (this.cache[type][id] === undefined) this.cache[type][id] = {};
    this.cache[type][id][relation] = undefined;
  }

  private throwErrorIfCacheParameterUndefined(type: string, id: number, relation: string) {
    throwErrorIfUndefined(type, 'type');
    throwErrorIfUndefined(id, 'id');
    throwErrorIfUndefined(relation, 'relation');
  }

  abstract setBelongsTo(from: RanksORM.DataDescriptor, relation: string, to: RanksORM.DataDescriptor);
  abstract setHasMany(from: DataDescriptor, relation: string, to: Array<DataDescriptor>);
  abstract pushToBelongsTo(from: DataDescriptor, relation: string, to: DataDescriptor);
  abstract pushToHasMany(from: DataDescriptor, relation: string, to: DataDescriptor);
  abstract shiftFromBelongsTo(from: DataDescriptor, relation: string, to: DataDescriptor);
  abstract shiftFromHasMany(from: DataDescriptor, relation: string, to: DataDescriptor);
}

