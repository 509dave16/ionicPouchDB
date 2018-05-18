import {ResourceEntity} from "./ResourceEntity";
import {ResourceCollection} from "./ResourceCollection";
import {objectClone, objectEqual} from "../utils/object.util";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import RelationDescriptor = Resource.RelationDescriptor;

export class ResourceModel extends ResourceEntity{
  private resource: any;
  private relationDesc: RelationDescriptor;
  constructor(resource: any, type: string, dataManager: SideloadedDataManager)
  {
    super(type, dataManager);
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

  setResource(resoure: any) {
    this.resource = resoure;
  }

  get(relation) {
    const { parent, parentResourceType } = this.relationDesc;
    return this.dataManager.getRelation(parentResourceType, parent.id, relation);
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
