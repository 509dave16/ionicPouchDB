import {Database} from "./Database";
import TypeSchema = RanksORM.TypeSchema;
import RootResourceDescriptor = RanksORM.RootResourceDescriptor;
import {RanksORM} from "../namespaces/RanksORM.namespace";
import SideloadedData = RanksORM.SideloadedData;
import {ResourceCollection} from "./ResourceCollection";
import {ResourceModel} from "./ResourceModel";
import {objectClone} from "../utils/object.util";
import SaveOptions = RanksORM.SaveOptions;
import {SideloadedModelData} from "./SideloadedModelData";
import {RelationDataManager} from "./RelationDataManager";
import {PersistenceManager} from "./PersistenceManager";

export class SideloadedDataManager {
  private static readonly PLURALITY_MANY = 'collection';
  private static readonly PLURALITY_ONE = 'model';

  protected rootResourceDescriptor: RootResourceDescriptor;
  public sideloadedModelData: SideloadedModelData;
  public rdm: RelationDataManager;
  public db: Database;
  public pm: PersistenceManager;

  constructor(rootDescriptor: RootResourceDescriptor, sideloadedData: SideloadedData, db: Database) {
    this.rootResourceDescriptor = rootDescriptor;
    this.db = db;
    const copiedSideloadedData: SideloadedData = objectClone(sideloadedData);
    this.sideloadedModelData = new SideloadedModelData(copiedSideloadedData, this);
    this.pm = new PersistenceManager(this);
    this.init();
  }

  private init() {
    this.rdm = new RelationDataManager(this);
  }

  public getRelation(type: string, id: number, relation: string): ResourceModel|ResourceCollection {
    return this.rdm.getRelation(type, id, relation);
  }

  public attachToRelation(parentModel: ResourceModel, relationName: string, modelOrResource: ResourceModel|any, inverseRelation: string) {
    return this.rdm.attachToRelation(parentModel, relationName, modelOrResource,inverseRelation);
  }

  public detachFromRelation(parentModel: ResourceModel, relationName: string, modelOrId: ResourceModel|number, inverseRelation: string) {
    return this.rdm.detachFromRelation(parentModel, relationName, modelOrId, inverseRelation);
  }

  public getTypeSchema(type: string): TypeSchema {
    return this.db.getSchema().find((typeSchema: TypeSchema) => typeSchema.plural === type || typeSchema.singular === type);
  }

  public refetch(): Promise<ResourceModel|ResourceCollection> {
    return this.rootResourceDescriptor.query();
  }

  public async save(options: SaveOptions): Promise<ResourceModel|ResourceCollection> {
    const modelOrCollection = await this.pm.save(options, this.getRoot());
    if (options.bulk) {
      this.init();
    }
    if (!options.refetch) {
      return modelOrCollection;
    }
    return this.refetch();
  }

  public getRoot(): ResourceCollection | ResourceModel {
    if (this.rootResourceDescriptor.plurality === SideloadedDataManager.PLURALITY_MANY) {
     return this.getCollectionRoot();
    } else if (this.rootResourceDescriptor.plurality === SideloadedDataManager.PLURALITY_ONE) {
      return this.getModelRoot();
    }
    return null;
  }

  public getCollectionRoot(): ResourceCollection {
    let models: ResourceModel[] = [];
    if (this.rootResourceDescriptor.ids === null) {
      models = this.sideloadedModelData.getCollectionByType(this.rootResourceDescriptor.type);
    } else {
      models = this.sideloadedModelData.getResourceModelsByTypeAndIds(this.rootResourceDescriptor.type, this.rootResourceDescriptor.ids);
    }
    if (models.length === 0) return null;
    return new ResourceCollection(models, null, this);
  }

  public getModelRoot(): ResourceModel {
    return this.sideloadedModelData.getResourceModelByTypeAndId(this.rootResourceDescriptor.type, this.rootResourceDescriptor.ids[0]);
  }
}
