import {throwErrorIfUndefined} from "../utils/error.util";

import {RanksMediator} from "./RanksMediator";
import {RanksORM} from "./RanksORM.namespace";
import RelationDescriptor = RanksORM.DocRelationDescriptor;
import {DataRelations} from "./DataRelations";
import RelationsConstructor = RanksORM.DataRelationsConstructor;
import {DataRelationsNamespace} from "./DataRelations.namespace";
import DataRelationDescriptor = DataRelationsNamespace.DataRelationDescriptor;
import DataDescriptor = DataRelationsNamespace.DataDescriptor;

export class RelationManager {
  public static readonly RELATION_TYPE_HAS_MANY = 'hasMany';
  public static readonly RELATION_TYPE_BELONGS_TO = 'belongsTo';
  private readonly mediator: RanksMediator;
  private relations: DataRelations;

  constructor(mediator: RanksMediator, relationsConstruct: RelationsConstructor) {
    this.mediator = mediator;
    this.relations = new relationsConstruct();
    this.setRelations();
  }

  public getRelationsFor(type: string, id: number): any {
    return this.relations.getRelationsFor(type, id);
  }

  private setRelations() {
    const data: any = this.mediator.getRelatedData();
    Object.keys(data).forEach(type => data[type].forEach( (model: DataDescriptor) => this.setDataDescriptorRelations(model) ) );
  }

  private setDataDescriptorRelations(from: DataDescriptor) {
    throwErrorIfUndefined(from, 'parentDataDescriptor');
    const schema = this.mediator.getTypeSchema(from.type);
    for (const relationName of Object.keys(schema.relations)) {
      const descriptor: DataRelationDescriptor = this.mediator.getRelationDescriptor(from, relationName);
      if (descriptor.relationType === RelationManager.RELATION_TYPE_BELONGS_TO) {
        const toDataDescriptor: DataDescriptor = this.mediator.getDataDescriptorByTypeAndId(descriptor.relationToType, from[relationName]);
        if (!toDataDescriptor) return;
        // TODO: Don't need a parent relation descriptor on the child. But if it at some point we do. We will need to support many of them.
        // toModel.setRelationDescriptor(descriptor);
        this.relations.setBelongsTo(from, relationName, toDataDescriptor)
      } else if (descriptor.relationType === RelationManager.RELATION_TYPE_HAS_MANY) {
        const toDataDescriptors: DataDescriptor[] = this.mediator.getDataDescriptorsByTypeAndIds(descriptor.relationToType, from[relationName]);
        this.relations.setHasMany(from, relationName, toDataDescriptors);
      }
    }
  }

  getRelation= <T>(type: string, id: number, relation: string): T => this.relations.get(type, id, relation);

  public attachToRelation(from: DataDescriptor, relationName: string, to: DataDescriptor, inverseRelationName: any = '') {
    throwErrorIfUndefined(from, 'parent model');
    throwErrorIfUndefined(to, 'child model');
    const descriptor = this.mediator.getRelationDescriptor(from, relationName);
    const inverseDescriptor: DataRelationDescriptor = inverseRelationName === false ? null : this.mediator.getInverseRelationDescriptor(descriptor, to, inverseRelationName);
    if (inverseDescriptor) { this.addToRelation(inverseDescriptor, from); }
    this.addToRelation(descriptor, to);
  }

  public addToRelation(descriptor: DataRelationDescriptor, to: DataDescriptor) {
    const from: DataDescriptor = descriptor.from;
    const relationName: string = descriptor.relationName;
    if (descriptor.relationType === RelationManager.RELATION_TYPE_BELONGS_TO) {
      from[relationName] = to.id;
      this.relations.pushToBelongsTo(from, relationName, to);
    } else if (descriptor.relationType === RelationManager.RELATION_TYPE_HAS_MANY) {
      this.relations.pushToHasMany(from, relationName, to);
    }
  }

  public detachFromRelation(from: DataDescriptor, relationName: string, to: DataDescriptor, inverseRelationName: any = '') {
    throwErrorIfUndefined(from, 'parent model');
    throwErrorIfUndefined(to, 'child model');
    const descriptor: DataRelationDescriptor = this.mediator.getRelationDescriptor(from, relationName);
    const inverseDescriptor = inverseRelationName === false ? null : this.mediator.getInverseRelationDescriptor(descriptor, to);
    if (inverseDescriptor) { this.removeFromRelation(inverseDescriptor, from) }
    this.removeFromRelation(descriptor, to);
  }

  public removeFromRelation(descriptor: DataRelationDescriptor, to: DataDescriptor) {
    const from: DataDescriptor = descriptor.from;
    const relationName: string = descriptor.relationName;
    if (descriptor.relationType === RelationManager.RELATION_TYPE_BELONGS_TO) {
      from[relationName] = null;
     this.relations.shiftFromBelongsTo(from, relationName, to);
    } else if (descriptor.relationType === RelationManager.RELATION_TYPE_HAS_MANY) {
      this.relations.shiftFromHasMany(from, relationName, to);
    }
  }
}
