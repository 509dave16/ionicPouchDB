import {Database} from "./Database";
import TypeSchema = RanksORM.TypeSchema;
import RootDocDescriptor = RanksORM.RootDocDescriptor;
import {RanksORM} from "./RanksORM.namespace";
import SideloadedData = RanksORM.SideloadedData;
import {DocCollection} from "./DocCollection";
import {DocModel} from "./DocModel";
import {objectClone} from "../utils/object.util";
import SaveOptions = RanksORM.SaveOptions;
import {Ranks} from "./Ranks";
import {RelationManager} from "./RelationManager";
import {PersistenceManager} from "./PersistenceManager";
import {ParentDocRelations} from "./ParentDocRelations";
import {DependentDocRelations} from "./DependentDocRelations";
import DocRelationDescriptor = RanksORM.DocRelationDescriptor;
import {DataRelationsNamespace} from "./DataRelations.namespace";
import DataDescriptor = DataRelationsNamespace.DataDescriptor;
import DataRelationDescriptor = DataRelationsNamespace.DataRelationDescriptor;

export class RanksMediator {
  private static readonly PLURALITY_MANY = 'collection';
  private static readonly PLURALITY_ONE = 'model';

  protected rootDocDescriptor: RootDocDescriptor;
  public ranks: Ranks;
  public parentRelations: RelationManager;
  public dependentRelations: RelationManager;
  public db: Database;
  public pm: PersistenceManager;

  constructor(rootDescriptor: RootDocDescriptor, sideloadedData: SideloadedData, db: Database) {
    this.rootDocDescriptor = rootDescriptor;
    this.db = db;
    const copiedSideloadedData: SideloadedData = objectClone(sideloadedData);
    this.ranks = new Ranks(copiedSideloadedData, this);
    this.pm = new PersistenceManager(this);
    this.init();
  }

  private init() {
    this.parentRelations = new RelationManager(this, ParentDocRelations);
    this.dependentRelations = new RelationManager(this, DependentDocRelations);
  }

  public getRelation(parent: DocModel, relationName: string): DocModel|DocCollection {
    const { type, id } = parent;
    const descriptor: DocRelationDescriptor = this.getDocRelationDescriptor(parent, relationName);
    this.db.schema.errorIfRelationDoesntExist(type, relationName);
    const value: any = this.parentRelations.getRelation(type, id, relationName);
    if (value instanceof Array) {
      return new DocCollection(value as Array<DocModel>, descriptor, this);
    }
    return value as DocModel;
  }

  public getDependentRelations(type: string, id: number): object {
    return this.dependentRelations.getRelationsFor(type, id);
  }

  public attachToRelation(parentModel: DocModel, relationName: string, modelOrDoc: DocModel|any, inverseRelation: string) {
    const descriptor = this.getDocRelationDescriptor(parentModel, relationName);
    const childModel: DocModel = this.ranks.newDocModel(modelOrDoc, descriptor.relationToType);
    const docModel: DocModel = this.ranks.getDocModelByTypeAndId(descriptor.relationToType, childModel.id);
    if (!docModel) { this.ranks.getRankByType(childModel.type).push(childModel); }
    this.db.schema.errorIfRelationDoesntExist(parentModel.type, relationName);
    this.parentRelations.attachToRelation(parentModel, relationName, childModel,inverseRelation);
    this.dependentRelations.attachToRelation(parentModel, relationName, childModel, inverseRelation);
  }

  public detachFromRelation(parentModel: DocModel, relationName: string, modelOrId: DocModel|number, inverseRelation: string) {
    this.db.schema.errorIfRelationDoesntExist(parentModel.type, relationName);
    const descriptor: DataRelationDescriptor = this.getDocRelationDescriptor(parentModel, relationName);
    let childModel: DocModel;
    if (this.isModel(modelOrId)) {
      childModel = modelOrId as DocModel;
    } else{
      childModel = this.ranks.getDocModelByTypeAndId(descriptor.relationToType, modelOrId as number);
    }
    this.parentRelations.detachFromRelation(parentModel, relationName, childModel, inverseRelation);
    this.dependentRelations.detachFromRelation(parentModel, relationName, childModel, inverseRelation);
  }

  public getTypeSchema(type: string): TypeSchema {
    return this.db.schema.getTypeSchema(type);
  }

  public getNextDocId(type: string): number {
    return this.db.docIdCache.getNextDocId(type);
  }

  public isModel(value: any): boolean {
    return value !== undefined && (value as DocModel).type !== undefined;
  }

  public initializeDocIdCache() {
    return this.db.docIdCache.initializeDocIdCache();
  }

  public refetch(): Promise<DocModel|DocCollection> {
    return this.rootDocDescriptor.query();
  }

  public async save(options: SaveOptions): Promise<DocModel|DocCollection> {
    const modelOrCollection = await this.pm.save(options, this.getRoot());
    if (options.bulk) {
      this.init();
    }
    if (!options.refetch) {
      return modelOrCollection;
    }
    return this.refetch();
  }

  public getRoot(): DocCollection | DocModel {
    if (this.rootDocDescriptor.plurality === RanksMediator.PLURALITY_MANY) {
     return this.getCollectionRoot();
    } else if (this.rootDocDescriptor.plurality === RanksMediator.PLURALITY_ONE) {
      return this.getModelRoot();
    }
    return null;
  }

  public getCollectionRoot(): DocCollection {
    let models: DocModel[] = [];
    if (this.rootDocDescriptor.ids === null) {
      models = this.ranks.getRankByType(this.rootDocDescriptor.type);
    } else {
      models = this.ranks.getDocModelsByTypeAndIds(this.rootDocDescriptor.type, this.rootDocDescriptor.ids);
    }
    if (models.length === 0) return null;
    return new DocCollection(models, null, this);
  }

  public getModelRoot(): DocModel {
    return this.ranks.getDocModelByTypeAndId(this.rootDocDescriptor.type, this.rootDocDescriptor.ids[0]);
  }

  public getDataDescriptorByTypeAndId(type: string, id: number): DataDescriptor {
    return this.ranks.getDocModelByTypeAndId(type, id);
  }


  public getDataDescriptorsByTypeAndIds(type: string, ids: number[]): DataDescriptor[] {
    return this.ranks.getDocModelsByTypeAndIds(type, ids);
  }

  public getDocRelationDescriptor(model: DocModel, relationName): DocRelationDescriptor {
    return this.getRelationDescriptor(model, relationName) as DocRelationDescriptor;
  }

  public getRelationDescriptor(dataDescriptor: DataDescriptor, relationName: string): DataRelationDescriptor {
    return this.db.schema.getRelationDescriptor(dataDescriptor, relationName);
  }

  public getInverseDocRelationDescriptor(parentDescriptor: DocRelationDescriptor, childModel: DocModel, relationName: string = ''): DocRelationDescriptor {
    return this.db.schema.getInverseRelationDescriptor(parentDescriptor, childModel, relationName) as DocRelationDescriptor;
  }

  public getInverseRelationDescriptor(parentRelationDescriptor: DataRelationDescriptor, childDataDescriptor: DataDescriptor, relationName: string = ''): DataRelationDescriptor {
    return this.db.schema.getInverseRelationDescriptor(parentRelationDescriptor, childDataDescriptor, relationName)
  }

  public getRelatedData() {
    return this.ranks.getRanks();
  }

  public getRelationData() {

  }
}
