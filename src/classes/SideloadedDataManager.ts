import {Database} from "./Database";
import TypeSchema = Resource.TypeSchema;
import RootResourceDescriptor = Resource.RootResourceDescriptor;
import {Resource} from "../namespaces/Resource.namespace";
import SideloadedData = Resource.SideloadedData;
import {ResourceCollection} from "./ResourceCollection";
import {ResourceModel} from "./ResourceModel";
import {objectEqual} from "../utils/object.util";
import SaveOptions = Resource.SaveOptions;
import {SideloadedDataClass} from "./SideloadedDataClass";
import {SideloadedModelData} from "./SideloadedModelData";
import {RelationData} from "./RelationData";


export class SideloadedDataManager {
  private static readonly PLURALITY_MANY = 'collection';
  private static readonly PLURALITY_ONE = 'model';

  protected rootResourceDescriptor: RootResourceDescriptor;
  protected sideloadedData: SideloadedData;
  public sideloadedDataClass: SideloadedDataClass;
  public sideloadeModelData: SideloadedModelData;
  public relationData: RelationData;
  protected db: Database;

  constructor(rootDescriptor: RootResourceDescriptor, sideloadedData: SideloadedData, db: Database) {
    this.rootResourceDescriptor = rootDescriptor;
    this.sideloadedData = sideloadedData;
    this.db = db;
    this.sideloadedDataClass = new SideloadedDataClass(this.sideloadedData, this);
    this.init();
  }

  private init() {
    this.sideloadeModelData = new SideloadedModelData(this.sideloadedDataClass.getData(), this);
    this.relationData = new RelationData(this);
  }

  public getRelation(type: string, id: number, relation: string): ResourceModel|ResourceCollection {
    return this.relationData.getRelation(type, id, relation);
  }

  public attachToRelation(parentModel: ResourceModel, relationName: string, model: ResourceModel): ResourceModel {
    return this.relationData.attachToRelation(parentModel, relationName, model);
  }

  public detachFromRelation(parentModel: ResourceModel, relationName: string, modelOrId: ResourceModel|number): ResourceModel {
    return this.relationData.detachFromRelation(parentModel, relationName, modelOrId);
  }

  public getTypeSchema(type: string): TypeSchema {
    return this.db.getSchema().find((typeSchema: TypeSchema) => typeSchema.plural === type);
  }

  public refetch(): Promise<ResourceModel|ResourceCollection> {
    return this.rootResourceDescriptor.query();
  }

  public async save(options: SaveOptions): Promise<ResourceModel|ResourceCollection> {
    const modelOrCollection: ResourceModel|ResourceCollection = this.getRoot();
    if (options.related) {
      await this.saveAll();
    } else if (modelOrCollection instanceof  ResourceModel) {
      await this.saveModel(modelOrCollection);
    } else {
      const writes: Promise<any>[] = modelOrCollection.map((model: ResourceModel) => this.saveModel(model));
      await Promise.all(writes);
    }

    if (!options.refetch) {
      return modelOrCollection;
    }
    return this.refetch();
  }

  private async saveModel(model: ResourceModel): Promise<ResourceModel> {
    const originalData = this.sideloadedDataClass.getData();
    const originalResourceIndex = originalData[model.type].findIndex(resource => model.id === resource.id );
    let changed = false;
    if (originalResourceIndex === -1) {
      changed = true;
    } else {
      const originalResource = originalData[model.type][originalResourceIndex];
      changed = !objectEqual(model.getResource(), originalResource);
    }

    if (!changed) {
      return model;
    }
    const updatedModel: ResourceModel = await this.db.save(model.type, model.getResource()) as ResourceModel;
    const data = updatedModel.getResource();
    model.setResource(data);
    if ( originalResourceIndex !== -1) {
      originalData[model.type][originalResourceIndex] = data;
    } else {
      originalData[model.type].push(data);
    }
    return model;
  }

  private async saveAll() {
    const writes: Promise<any>[] = [];
    const data: any = this.sideloadeModelData.getData();
    for (const type of Object.keys(data)) {
      data[type].map((model: ResourceModel) => writes.push(this.saveModel(model)));
    }
    await Promise.all(writes);
    this.init();
    return this;
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
      models = this.sideloadeModelData.getCollectionByType(this.rootResourceDescriptor.type);
    } else {
      models = this.sideloadeModelData.getResourceModelsByTypeAndIds(this.rootResourceDescriptor.type, this.rootResourceDescriptor.ids);
    }
    if (models.length === 0) return null;
    return new ResourceCollection(models, null, this);
  }

  public getModelRoot(): ResourceModel {
    return this.sideloadeModelData.getResourceModelByTypeAndId(this.rootResourceDescriptor.type, this.rootResourceDescriptor.ids[0]);
  }
}
