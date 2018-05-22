import {objectClone} from "../utils/object.util";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import RelationDescriptor = Resource.RelationDescriptor;
import TypeSchema = Resource.TypeSchema;
import SaveOptions = Resource.SaveOptions;

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

  get(relation: string) {
    return this.dataManager.getRelation(this.type, this.resource.id, relation);
  }

  attach(relation: string, model: ResourceModel) {
    this.dataManager.attachToRelation(this, relation, model);
  }

  detach(relation: string, modelOrId: ResourceModel|number) {
    this.dataManager.detachFromRelation(this, relation, modelOrId);
  }

  getField(field) {
    return this.resource[field];
  }

  setField(field, value) {
    this.resource[field] = value;
  }

  save(options: SaveOptions = { refetch: false, related: false }): Promise<any> {
    return this.dataManager.save(options);
  }
}
