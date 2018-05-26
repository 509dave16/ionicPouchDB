/**
 * There are 3 different ways that we can currently save docs
 * 1. Save only the Root Model or Collection
 * 2. Save all Related Models in addition to the Root Model or Collection one at a time
 * 3. 2. But in bulk
 *
 * We have some logic in here for updating Models ids. This should be moved to the specific cache implementation that is affects
 */

import {ResourceCollection} from "./ResourceCollection";
import {ResourceModel} from "./ResourceModel";
import {SideloadedDataManager} from "./SideloadedDataManager";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import SaveOptions = RanksORM.SaveOptions;
import ParsedDocId = RanksORM.ParsedDocId;
import TypeSchema = RanksORM.TypeSchema;
import ISideloadedModelData = RanksORM.ISideloadedModelData;
import {RelationDataManager} from "./RelationDataManager";
import RelationDescriptor = RanksORM.RelationDescriptor;

export class PersistenceManager {
  private dm: SideloadedDataManager;
  private newDocIds: any;
  constructor(dm: SideloadedDataManager) {
    this.dm = dm;
  }

  public async save(options: SaveOptions, modelOrCollection: ResourceModel|ResourceCollection): Promise<ResourceModel|ResourceCollection> {
    if (options.related) {
      await options.bulk ? this.saveAllBulk() : this.saveAllIndividually();
    } else if (modelOrCollection instanceof  ResourceModel) {
      await this.saveModel(modelOrCollection);
    } else {
      const writes: Promise<any>[] = modelOrCollection.map((model: ResourceModel) => this.saveModel(model));
      await Promise.all(writes);
    }
    return modelOrCollection;
  }

  private async saveAllIndividually() {
    const writes: Promise<any>[] = [];
    const data: ISideloadedModelData = this.dm.sideloadedModelData.getData();
    for (const type of Object.keys(data)) {
      data[type].map((model: ResourceModel) => writes.push(this.saveModel(model)));
    }
    await Promise.all(writes);
    return this;
  }

  private async saveModel(model: ResourceModel): Promise<ResourceModel> {
    if (!model.hasChanged()) {
      return model;
    }
    const updatedModel: ResourceModel = await this.dm.db.save(model.type, model.getResource()) as ResourceModel;
    const data = updatedModel.getResource();
    model.setResource(data);
    model.refreshOriginalResource();
    return model;
  }

  private async saveAllBulk() {
    await  this.saveNewResources();
    await this.saveUpdatedResources();
    return this;
  }

  private async saveNewResources() {
    const changedModels: ResourceModel[] = this.getChangedModels();
    const newResources: any[] = changedModels.filter((model: ResourceModel) => model.isNew()).map((model: ResourceModel) => model.makeBulkDocsResource());
    const responses: any[] = await this.dm.db.bulkDocs(newResources);
    return Promise.all(responses.map((response: any, index: number) => this.handleResponse(response, index)));
  }

  private async saveUpdatedResources() {
    const changedModels: ResourceModel[] = this.getChangedModels();
    const updatedResources: any[] = changedModels.filter((model: ResourceModel) => !model.isNew()).map((model: ResourceModel) => model.makeBulkDocsResource());
    const responses: any[] = await this.dm.db.bulkDocs(updatedResources);
    return Promise.all(responses.map((response: any, index) => this.handleResponse(response, index)));
  }

  private getChangedModels(): ResourceModel[] {
    const models: ResourceModel[] = this.dm.sideloadedModelData.getFlattenedData() as ResourceModel[];
    return models.filter((model: ResourceModel) => model.hasChanged());
  }


  private async handleResponse(response: any, index: number) {
    if (response.error && response.name === 'conflict') {
      if (index === 0) {
        await this.dm.db.initializeMaxDocIdCache();
      }
      const newResponse = await this.retrySavingNewResource(response);
      return this.handleResponse(newResponse, 0);
    } else if(response.ok || response instanceof  ResourceModel) {
      this.updateResourceModelRev(response);
    } else {
      console.error(response);
    }
    return true;
  }

  private updateResourceModelRev(response: any) {
    const model: ResourceModel = this.getModelFromResponse(response);
    const rev: string = response instanceof  ResourceModel ? (response as ResourceModel).getField('rev') : response.rev;
    model.setField('rev', rev);
    model.refreshOriginalResource();
  }

  private retrySavingNewResource(response: any) {
    const model: ResourceModel = this.getModelFromResponse(response);
    const newDocId = this.dm.db.getNextMaxDocId(model.type);
    this.updateParentsDocIds(model, newDocId);
    model.setField('id', newDocId);
    return this.dm.db.save(model.type, model.getResource());
  }

  private updateParentsDocIds(model: ResourceModel, newDocId: number) {
    const { type, id } = model;
    const relationsToModels = this.dm.rdm.getCacheOf(RelationDataManager.CHILD_TO_PARENT_CACHE, type, id);
    for(const relationName in relationsToModels) {
      const model = relationsToModels[relationName];
      const descriptor: RelationDescriptor = this.dm.rdm.getRelationDescriptor(model, relationName);
      if (descriptor.relationType === RelationDataManager.RELATION_TYPE_BELONGS_TO) {
        descriptor.parent.setField(relationName, newDocId);
      } else if (descriptor.relationType === RelationDataManager.RELATION_TYPE_HAS_MANY) {
        const oldIds = model.getField(relationName);
        const indexOfOldId = oldIds.indexOf(id);
        oldIds[indexOfOldId] = newDocId;
      }
    }
  }

  private getModelFromResponse(response: any) {
    let id, type;
    if (response instanceof ResourceModel) {
      id = response.id;
      type = response.type;
    } else {
      const parsedDocID: ParsedDocId = this.dm.db.parseDocID(response.id);
      const typeSchema: TypeSchema = this.dm.getTypeSchema(parsedDocID.type);
      id = parsedDocID.id;
      type = typeSchema.plural;
    }
    return this.dm.sideloadedModelData.getResourceModelByTypeAndId(type,id);
  }
}
