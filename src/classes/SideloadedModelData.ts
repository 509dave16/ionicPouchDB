import {Resource} from "../namespaces/Resource.namespace";
import SideloadedData = Resource.SideloadedData;
import {SideloadedDataManager} from "./SideloadedDataManager";
import {ResourceModel} from "./ResourceModel";
import ISideloadedModelData = Resource.ISideloadedModelData;
import {objectEqual} from "../utils/object.util";

export class SideloadedModelData {
  public sideloadedModelData: ISideloadedModelData = {};
  private  dm: SideloadedDataManager;

  constructor(sideloadedData: SideloadedData, dm: SideloadedDataManager) {
    this.dm = dm;
    this.transformSideloadedData(sideloadedData);
  }
  private transformSideloadedData(sideloadedData: SideloadedData) {
    for (const type of Object.keys(sideloadedData))
      this.sideloadedModelData[type] = sideloadedData[type].map(resource => new ResourceModel(resource, type, this.dm));
  }

  public getCollectionByType(type: string): ResourceModel[] {
    if (this.sideloadedModelData[type] === undefined) {
      this.sideloadedModelData[type] = [];
    }
    return this.sideloadedModelData[type];
  }

  public getResourceModelByTypeAndId(type: string, id: number): ResourceModel {
    const models: any[] =  this.getCollectionByType(type);
    if (!models) {
      return null;
    }
    return models.find((model) => model.id === id);
  }

  public getResourceModelsByTypeAndIds(type: string, ids: number[]): ResourceModel[] {
    return ids.map(id => this.getResourceModelByTypeAndId(type, id)).filter(resource => resource !== null);
  }

  public getResourceModelIndexByTypeAndId(type: string, id: number): number {
    const models: any[] =  this.getCollectionByType(type);
    if (!models) {
      return -1;
    }
    return models.findIndex((model) => model.id === id);
  }

  public resourceModelHasChanged(modifiedModel: ResourceModel) {
    const originalModel = this.getResourceModelByTypeAndId(modifiedModel.type, modifiedModel.id);
    return !originalModel ? true : !objectEqual(modifiedModel.getResource(), originalModel.getResource());
  }

  public updateResourceModel(model: ResourceModel) {
    const { type, id } = model;
    const resource = model.getResource();
    const index = this.getResourceModelIndexByTypeAndId(type, id);
    const collection: any[] = this.getCollectionByType(type);
    if ( index !== -1) {
      collection[index] = resource;
    } else {
      collection.push(resource);
    }
  }

  public getData(): ISideloadedModelData {
    return this.sideloadedModelData;
  }

  public getFlattenedData(): ResourceModel[] {
    const ara = [];
    for(const key in this.sideloadedModelData) {
      const collection = this.sideloadedModelData[key];
      collection.map((resource) => ara.push(resource));
    }
    return ara;
  }
}
