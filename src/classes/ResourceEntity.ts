import TypeSchema = Resource.TypeSchema;
import RelationalData = Resource.RelationalData;
import {RelationalDB, ResourceQuery} from "./RelationalDB";

export class ResourceEntity {
  protected relationalData: RelationalData;
  protected type: string;
  protected schema: any[];
  protected typeSchema: TypeSchema;
  protected query: ResourceQuery;
  protected db: RelationalDB;

  constructor(type: string, query: ResourceQuery, relationalData: RelationalData, schema: TypeSchema[], db: RelationalDB) {
    this.type = type;
    this.query = query;
    this.relationalData = relationalData;
    this.schema = schema;
    this.typeSchema = this.getTypeSchema(type, this.schema);
    this.db = db;
  }

  protected getTypeSchema(type: string, schema: TypeSchema[]): TypeSchema {
    return schema.find((typeSchema: TypeSchema) => typeSchema.plural === type);
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

  protected getResourcesByTypeAndIds(type, ids): any[] {
    return ids.map(id => this.getResourceByTypeAndId(type, id)).filter(resource => resource !== undefined);
  }

  protected getResourceByTypeAndId(type, id): any {
    return this.getResourcesByType(type).find(resource => resource.id === id);
  }

  protected getResourcesByType(type) {
    return this.relationalData[type];
  }

  public refetch() {
    return this.query();
  }
}
