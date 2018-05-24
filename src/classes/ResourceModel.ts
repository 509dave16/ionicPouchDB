import {objectClone, objectEqual} from "../utils/object.util";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import RelationDescriptor = RanksORM.RelationDescriptor;
import TypeSchema = RanksORM.TypeSchema;
import SaveOptions = RanksORM.SaveOptions;
import t from 'tcomb';

export class ResourceModel {
  private resource: any;
  private originalResource: any;
  public type: string;
  private dataManager: SideloadedDataManager;
  private typeSchema: TypeSchema;

  private relationDesc: RelationDescriptor;
  constructor(resource: any, type: string, dataManager: SideloadedDataManager) {
    this.errorOnInvalid();
    this.type = type;
    this.dataManager = dataManager;
    this.typeSchema = this.dataManager.getTypeSchema(this.type);
    this.originalResource = resource;
    this.resource = objectClone(resource);
  }

  setRelationDescriptor(relationDesc: RelationDescriptor) {
    this.relationDesc = relationDesc;
  }

  get id(): number {
    return this.resource.id;
  }

  getResource(): any {
    return this.resource;
  }

  setResource(resource: any) {
    this.resource = resource;
  }

  refreshOriginalResource() {
    this.originalResource = objectClone(this.resource);
  }

  hasChanged(): boolean {
    return !objectEqual(this.resource, this.originalResource);
  }

  get(relation: string) {
    return this.dataManager.getRelation(this.type, this.resource.id, relation);
  }

  attach(relation: string, modelOrResource: ResourceModel|any, inverseRelation?: string): ResourceModel {
    this.dataManager.attachToRelation(this, relation, modelOrResource, inverseRelation);
    return this;
  }

  detach(relation: string, modelOrId: ResourceModel|number, inverseRelation?: string): ResourceModel {
    this.dataManager.detachFromRelation(this, relation, modelOrId, inverseRelation);
    return this;
  }

  getField(field: string): any {
    this.errorOnFieldNotExist(field);
    if (this.resource[field] === undefined) {
      return this.resource[field] = this.typeSchema.props[field].default;
    }
    return this.resource[field];
  }

  setField(field: string, value: any): ResourceModel {
    this.errorOnFieldNotExist(field);
    this.errorOnValueTypeConflict(field, value);
    this.resource[field] = value;
    return this;
  }

  addToField(field: string, value: any): ResourceModel {
    this.errorOnFieldNotExist(field);
    this.errorOnFieldNotArray(field);
    this.errorOnValueElementTypeConflict(field, value);
    const ara = this.getField(field) as any[];
    ara.push(value);
   return this;
  }

  errorOnFieldNotArray(field: string) {
    if (!this.fieldIsArray(field)) {
      throw new Error(`Field ${field} is not of type Array.`);
    }
  }

  errorOnFieldNotExist(field: string) {
    if (!this.hasField(field)) {
      throw new Error(`Field ${field} does not exist on type.`);
    }
  }

  errorOnValueTypeConflict(field, value) {
    this.typeSchema.props[field].type.is(value);
  }

  errorOnValueElementTypeConflict(field, value) {
    this.typeSchema.props[field].elementType.is(value);
  }

  errorOnInvalid() {
    if (!this.isValid()) {
      throw new Error('Resource is invalid');
    }
  }

  hasField(field: string): boolean {
    return this.typeSchema.props[field] !== undefined;
  }

  fieldIsArray(field: string): boolean {
    return this.typeSchema.props[field].type === t.Array;
  }

  invalidFieldValue(field: string, value: any): boolean|string {
    try {
      this.errorOnValueTypeConflict(field, value);
    } catch (e) {
      return e.message;
    }
    return false;
  }

  isValid(): boolean {
    return this.validate().length === 0;
  }

  validate(): string[] {
    const errors: string[] = [];
    for(const field in this.resource) {
      const value = this.resource[field];
      const reason = this.invalidFieldValue(field, value);
      if (reason !== false) {
        errors.push(reason as string);
      }
    }
    return errors;
  }

  save(options: SaveOptions = { refetch: false, related: false, bulk: true }): Promise<any> {
    return this.dataManager.save(options);
  }
}
