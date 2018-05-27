import {throwErrorIfUndefined} from "../utils/error.util";

import {RanksMediator} from "./RanksMediator";
import {DocModel} from "./DocModel";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import RelationDescriptor = RanksORM.DocRelationDescriptor;
import {DataRelations} from "./DataRelations";
import RelationsConstructor = RanksORM.DataRelationsConstructor;
import {DataRelationsNamespace} from "../namespaces/DataRelations.namespace";
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
    Object.keys(data).forEach(type => data[type].forEach( (model: DocModel) => this.setDataDescriptorRelations(model) ) );
  }

  private setDataDescriptorRelations(from: DataDescriptor) {
    throwErrorIfUndefined(from, 'parentDataDescriptor');
    const schema = this.mediator.getTypeSchema(from.type);
    for (const relationName of Object.keys(schema.relations)) {
      const descriptor: DataRelationDescriptor = this.mediator.getRelationDescriptor(from, relationName);
      if (descriptor.relationType === RelationManager.RELATION_TYPE_BELONGS_TO) {
        const toModel: DocModel = this.mediator.ranks.getDocModelByTypeAndId(descriptor.relationToType, from.getField(relationName));
        if (!toModel) return;
        // TODO: Don't need a parent relation descriptor on the child. But if it at some point we do. We will need to support many of them.
        // toModel.setRelationDescriptor(descriptor);
        this.relations.setBelongsTo(parentDataDescriptor, relationName, toModel)
      } else if (descriptor.relationType === RelationManager.RELATION_TYPE_HAS_MANY) {
        const toModels: DocModel[] = this.mediator.ranks.getDocModelsByTypeAndIds(descriptor.relationToType, fromModel.getField(relationName));
        this.relations.setHasMany(parentDataDescriptor, relationName, toModels);
      }
    }
  }

  getRelation= <T>(type: string, id: number, relation: string): T => this.relations.get(type, id, relation);

  public attachToRelation(parentModel: DocModel, relationName: string, childModel: DocModel, inverseRelationName: any = '') {
    throwErrorIfUndefined(parentModel, 'parent model');
    throwErrorIfUndefined(childModel, 'child model');
    const descriptor = this.mediator.getDocRelationDescriptor(parentModel, relationName);
    const inverseDescriptor: RelationDescriptor = inverseRelationName === false ? null : this.mediator.getInverseDocRelationDescriptor(descriptor, childModel, inverseRelationName);
    if (inverseDescriptor) { this.addToRelation(inverseDescriptor, parentModel); }
    this.addToRelation(descriptor, childModel);
  }

  public addToRelation(descriptor: RelationDescriptor, childModel: DocModel) {
    const parentModel: DocModel = descriptor.from;
    const relationName: string = descriptor.relationName;
    if (descriptor.relationType === RelationManager.RELATION_TYPE_BELONGS_TO) {
      parentModel.setField(relationName, childModel.id);
      this.relations.pushToBelongsTo(parentModel, relationName, childModel);
    } else if (descriptor.relationType === RelationManager.RELATION_TYPE_HAS_MANY) {
      this.relations.pushToHasMany(parentModel, relationName, childModel);
    }
  }

  public detachFromRelation(parentModel: DocModel, relationName: string, childModelOrId: DocModel|number, inverseRelationName: any = '') {
    throwErrorIfUndefined(parentModel, 'parent model');
    const descriptor: RelationDescriptor = this.mediator.getDocRelationDescriptor(parentModel, relationName);
    let childModel: DocModel;
    if (this.mediator.isModel(childModelOrId)) {
      childModel = childModelOrId as DocModel;
    } else{
      childModel = this.mediator.ranks.getDocModelByTypeAndId(descriptor.relationToType, childModelOrId as number);
    }
    throwErrorIfUndefined(childModel, 'child model');
    const inverseDescriptor = inverseRelationName === false ? null : this.mediator.getInverseDocRelationDescriptor(descriptor, childModel);
    if (inverseDescriptor) { this.removeFromRelation(inverseDescriptor, parentModel) }
    this.removeFromRelation(descriptor, childModel);
  }

  public removeFromRelation(descriptor: RelationDescriptor, childModel: DocModel) {
    const parentModel: DocModel = descriptor.from;
    const relationName: string = descriptor.relationName;
    if (descriptor.relationType === RelationManager.RELATION_TYPE_BELONGS_TO) {
      parentModel.setField(relationName, null);
     this.relations.shiftFromBelongsTo(parentModel, relationName, childModel);
    } else if (descriptor.relationType === RelationManager.RELATION_TYPE_HAS_MANY) {
      this.relations.shiftFromHasMany(parentModel, relationName, childModel);
    }
  }
}
