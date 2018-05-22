import {Resource} from "../namespaces/Resource.namespace";
import SideloadedData = Resource.SideloadedData;
import {SideloadedDataManager} from "./SideloadedDataManager";

export class SideloadedDataClass {
  protected dataKey = 'sideloadedData';
  protected sideloadedData: SideloadedData;
  protected  dm: SideloadedDataManager;

  constructor(sideloadedData: SideloadedData, dm: SideloadedDataManager, dataKey: string = 'sideloadedData') {
    this.sideloadedData = sideloadedData;
    this.dataKey = dataKey;
    this.dm = dm;
  }

  public getCollectionByType(type: string): any[] {
    if (this[this.dataKey][type] === undefined) {
      this[this.dataKey][type] = [];
    }
    return this[this.dataKey][type];
  }

  public getResourceModelByTypeAndId(type: string, id: number): any {
    const models: any[] =  this.getCollectionByType(type);
    if (!models) {
      return null;
    }
    let resourceModel= models.find((model) => model.id === id);
    if (!resourceModel) {
      return null;
    }
    return resourceModel;
  }

  public getResourceModelsByTypeAndIds(type: string, ids: number[]): any[] {
    return ids.map(id => this.getResourceModelByTypeAndId(type, id)).filter(resource => resource !== null);
  }

  public getData(): SideloadedData {
    return this[this.dataKey];
  }
}
