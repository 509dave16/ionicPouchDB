import {objectClone, objectEqual} from "../utils/object.util";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import RelationDescriptor = Resource.RelationDescriptor;
import TypeSchema = Resource.TypeSchema;
import SaveOptions = Resource.SaveOptions;

export class ResourceModel {
  private resource: any;
  private originalResource: any;
  public type: string;
  private dataManager: SideloadedDataManager;
  private typeSchema: TypeSchema;

  private relationDesc: RelationDescriptor;
  constructor(resource: any, type: string, dataManager: SideloadedDataManager) {
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

  getField(field) {
    return this.resource[field];
  }

  setField(field, value) {
    this.resource[field] = value;
  }

  save(options: SaveOptions = { refetch: false, related: false, bulk: true }): Promise<any> {
    return this.dataManager.save(options);
  }
}
