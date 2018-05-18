import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import TypeSchema = Resource.TypeSchema;

export class ResourceEntity {
  protected dataManager: SideloadedDataManager;
  public type: string;
  protected typeSchema: TypeSchema;

  constructor(type: string, dataManager: SideloadedDataManager) {
    this.type = type;
    this.dataManager = dataManager;
    this.typeSchema = this.dataManager.getTypeSchema(this.type);
  }

  protected hasRelation(relation) {
    return Object.keys(this.typeSchema.relations).find( typeRelation => typeRelation === relation);
  }

  protected getRelationType(relation) {
    for (const typeRelation in this.typeSchema.relations) {
      if(typeRelation === relation) {
        return this.typeSchema.relations[typeRelation];
      }
    }
    return null;
  }
}
