import TypeSchema = Resource.TypeSchema;
import ResourceQuery = Resource.ResourceQuery;

export class ResourceEntity {
  protected relationalData: Resource.RelationalData;
  protected type: string;
  protected schema: any[];
  protected typeSchema: TypeSchema;
  protected query: ResourceQuery;
  constructor(type: string, schema: TypeSchema[], relationalData: Resource.RelationalData) {
    this.relationalData = relationalData;
    this.type = type;
    this.schema = schema;
    this.typeSchema = this.getTypeSchema(type, this.schema);
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
}
