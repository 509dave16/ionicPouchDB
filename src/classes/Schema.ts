import {RelationManager} from "./RelationManager";
import {DocModel} from "./DocModel";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import RelationDescriptor = RanksORM.RelationDescriptor;
import TypeSchema = RanksORM.TypeSchema;

export class Schema {
  private typeSchemas: TypeSchema[];
  constructor(typeSchemas: TypeSchema[]) {
    this.typeSchemas = typeSchemas;
  }

  public getTypeSchemas(): TypeSchema[] {
    return this.typeSchemas;
  }

  public getTypeSchema(type: string): TypeSchema {
    return this.typeSchemas.find((typeSchema: TypeSchema) => typeSchema.plural === type || typeSchema.singular === type);
  }

  public hasRelation(type: string, relation: string) {
    return Object.keys(this.getTypeSchema(type).relations).find( typeRelation => typeRelation === relation);
  }

  public errorIfRelationDoesntExist(type: string, relation: string) {
    if (!this.hasRelation(type, relation)) {
      throw new Error(`Model does not have relation ${relation}`);
    }
  }

  /**
   * A relation has either hasMany or belongsTo on it.
   * These kes have the doc type. So publish->authors would be something like:
   * authors: { hasMany: 'users' } ( i.e. relationName.relationType.docType )
   * @param descriptor
   * @returns {string | string}
   */
  private static getDocType(descriptor) {
    return descriptor.hasMany || descriptor.belongsTo;
  }

  private static getRelationType(descriptor) {
    if (descriptor.hasMany) {
      return RelationManager.RELATION_TYPE_HAS_MANY;
    }
    if (descriptor.belongsTo) {
      return RelationManager.RELATION_TYPE_BELONGS_TO;
    }
  }

  public getRelationDescriptor(model: DocModel, relationName): RelationDescriptor {
    const schema = this.getTypeSchema(model.type);
    const relation = schema.relations[relationName];
    if (relation == undefined) {
      throw new Error(`Relation '${relationName}' does not exist on doc of ${model.id} in ${model.type}`);
    }
    const relationDocType = Schema.getDocType(relation);
    const relationType = Schema.getRelationType(relation);
    return {
      parent: model,
      parentDocType: model.type,
      relationName,
      relationDocType: relationDocType,
      relationType
    };
  }

  public getFirstRelationOfType(typeNeedle, typeHaystack) {
    const relations = this.getTypeSchema(typeHaystack).relations;
    for(const relationName in relations) {
      const relation = relations[relationName];
      const type = Schema.getDocType(relation);
      if (type === typeNeedle) {
        return relationName;
      }
    }
    return '';
  }

  public getInverseDescriptor(parentDescriptor: RelationDescriptor, childModel: DocModel, relationName: string = ''): RelationDescriptor {
    if (!relationName) {
      relationName = this.getFirstRelationOfType(parentDescriptor.parentDocType, childModel.type);
    }
    if (!relationName) {
      return null; // if still empty that means there's no inverse relation. So we exit.
    }
    return this.getRelationDescriptor(childModel, relationName);
  }
}
