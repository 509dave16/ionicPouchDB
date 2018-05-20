import {objectClone, objectEqual} from "../utils/object.util";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import RelationDescriptor = Resource.RelationDescriptor;
import TypeSchema = Resource.TypeSchema;

export class ResourceModel {
  private resource: any;
  public type: string;
  private dataManager: SideloadedDataManager;
  private typeSchema: TypeSchema;

  private relationDesc: RelationDescriptor;
  constructor(resource: any, type: string, dataManager: SideloadedDataManager)
  {
    this.type = type;
    this.dataManager = dataManager;
    this.typeSchema = this.dataManager.getTypeSchema(this.type);
    this.resource = objectClone(resource);
  }

  setRelationDescriptor(relationDesc: RelationDescriptor) {
    this.relationDesc = relationDesc;
  }

  get id() {
    return this.resource.id;
  }

  getResource() {
    return this.resource;
  }

  setResource(resource: any) {
    this.resource = resource;
  }

  protected hasRelation(relation: string) {
    return Object.keys(this.typeSchema.relations).find( typeRelation => typeRelation === relation);
  }

  errorIfRelationDoesntExist(relation: string) {
    if (!this.hasRelation(relation)) {
      throw new Error(`Model does not have relation ${relation}`);
    }
  }

  get(relation: string) {
    this.errorIfRelationDoesntExist(relation);
    return this.dataManager.getRelation(this.type, this.resource.id, relation);
  }

  attach(relation: string, model: ResourceModel) {
    if (!this.hasRelation(relation)) {
      throw new Error(`Model does not have relation ${relation}`);
    }
    this.dataManager.attachToRelation(this, relation, model);
  }

  detach(relation: string, model: ResourceModel) {
    this.dataManager.detachFromRelation(this, relation, model);
  }

  getField(field) {
    return this.resource[field];
  }

  setField(field, value) {
    this.resource[field] = value;
  }

  save(refetch: boolean = false): Promise<any> {
    return this.dataManager.saveModel(this, refetch);
  }
}
