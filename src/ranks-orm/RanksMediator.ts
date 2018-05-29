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
import ISideloadedRankModels = RanksORM.ISideloadedRankModels;
import {Schema} from "./Schema";

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

  public refetch(): Promise<DocModel|DocCollection> {
    return this.rootDocDescriptor.query();
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

  //<editor-fold desc="Relations">
  public getDependentRelations(type: string, id: number): object {
    return this.dependentRelations.getRelationsFor(type, id);
  }

  public async getRelation(parent: DocModel, relationName: string): Promise<DocModel|DocCollection> {
    const { type, id } = parent;
    const ref = parent[relationName];
    if (!ref) { return null; }
    const descriptor: DocRelationDescriptor = this.getDocRelationDescriptor(parent, relationName);
    this.db.schema.errorIfRelationDoesntExist(type, relationName);
    let value: any = this.parentRelations.getRelation(type, id, relationName);

    if (value === null) {
      value = await descriptor.relationType === RelationManager.RELATION_TYPE_BELONGS_TO ?
        this.db.findById(descriptor.relationToType, parent[relationName]) :
        this.db.findByIds(descriptor.relationToType, parent[relationName])
      ;
      this.ranks.addToRanks(value);
      this.parentRelations.setDataDescriptorRelation(parent, relationName);
      this.dependentRelations.setDataDescriptorRelation(parent, relationName);
    }
    if (value instanceof  DocCollection) {
      return value; // could be DocCollection if it was fetched;
    }
    if (value instanceof Array) {
      return new DocCollection(value as Array<DocModel>, descriptor, this);
    }
    return value as DocModel;
  }

  public async attachToRelation(parentModel: DocModel, relationName: string, modelOrDoc: DocModel|any, inverseRelation: string) {
    const descriptor = this.getDocRelationDescriptor(parentModel, relationName);
    // Only matters for hasMany since attaching a DocModel toa Belongs To is just a replacement
    if (descriptor.relationType === RelationManager.RELATION_TYPE_HAS_MANY) {
      await this.getRelation(parentModel, relationName);
    }
    const childModel: DocModel = this.ranks.useExistingOrMakeNewDocModel(modelOrDoc, descriptor.relationToType);
    this.ranks.addToRanks(childModel);
    this.db.schema.errorIfRelationDoesntExist(parentModel.type, relationName);
    this.parentRelations.attachToRelation(parentModel, relationName, childModel,inverseRelation);
    this.dependentRelations.attachToRelation(parentModel, relationName, childModel, inverseRelation);
    return true;
  }

  public async detachFromRelation(parentModel: DocModel, relationName: string, modelOrId: DocModel|number, inverseRelation: string) {
    this.db.schema.errorIfRelationDoesntExist(parentModel.type, relationName);
    const descriptor: DataRelationDescriptor = this.getDocRelationDescriptor(parentModel, relationName);
    // Only matters for hasMany since attaching a DocModel since belongsTo is just a simple unset
    if (descriptor.relationType === RelationManager.RELATION_TYPE_HAS_MANY) {
      await this.getRelation(parentModel, relationName);
    }
    let childModel: DocModel;
    if (this.isModel(modelOrId)) {
      childModel = modelOrId as DocModel;
    } else{
      childModel = this.ranks.getDocModelByTypeAndId(descriptor.relationToType, modelOrId as number);
    }
    this.parentRelations.detachFromRelation(parentModel, relationName, childModel, inverseRelation);
    this.dependentRelations.detachFromRelation(parentModel, relationName, childModel, inverseRelation);
    return true;
  }

  public isModel(value: any): boolean {
    return value !== undefined && (value as DocModel).type !== undefined;
  }
  //</editor-fold>

  //<editor-fold desc="Doc IDs">

  public initializeDocIdCache() {
    return this.db.docIdCache.initializeDocIdCache();
  }

  public getNextDocId(type: string): number {
    return this.db.docIdCache.getNextDocId(type);
  }
  //</editor-fold>

  //<editor-fold desc="Ranks">

  public getRanks(): ISideloadedRankModels {
    return this.ranks.getRanks();
  }

  public getRelatedData() {
    return this.getRanks();
  }

  public getFlattenedRanks(): DocModel[] {
    return this.ranks.getFlattenedRanks();
  }

  public getDataDescriptorByTypeAndId(type: string, id: number): DataDescriptor {
    return this.getDocModelByTypeAndId(type, id);
  }

  public getDocModelByTypeAndId(type: string, id): DocModel{
    return this.ranks.getDocModelByTypeAndId(type, id);
  }

  public getDataDescriptorsByTypeAndIds(type: string, ids: number[]): DataDescriptor[] {
    return this.ranks.getDocModelsByTypeAndIds(type, ids);
  }
  //</editor-fold>

  //<editor-fold desc="Schema">
  public getTypeSchema(type: string): TypeSchema {
    return this.db.schema.getTypeSchema(type);
  }

  public getDocRelationDescriptor(model: DocModel, relationName): DocRelationDescriptor {
    return this.getDataRelationDescriptor(model, relationName) as DocRelationDescriptor;
  }

  public getDataRelationDescriptor(dataDescriptor: DataDescriptor, relationName: string): DataRelationDescriptor {
    return this.db.schema.getRelationDescriptor(dataDescriptor, relationName);
  }

  public getInverseDocRelationDescriptor(parentDescriptor: DocRelationDescriptor, childModel: DocModel, relationName: string = ''): DocRelationDescriptor {
    return this.getInverseDataRelationDescriptor(parentDescriptor, childModel, relationName) as DocRelationDescriptor;
  }

  public getInverseDataRelationDescriptor(parentRelationDescriptor: DataRelationDescriptor, childDataDescriptor: DataDescriptor, relationName: string = ''): DataRelationDescriptor {
    return this.db.schema.getInverseRelationDescriptor(parentRelationDescriptor, childDataDescriptor, relationName)
  }
  //</editor-fold>
}
