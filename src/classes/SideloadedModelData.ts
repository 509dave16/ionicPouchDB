import {SideloadedDataClass} from "./SideloadedDataClass";
import {ResourceModel} from "./ResourceModel";
import {Resource} from "../namespaces/Resource.namespace";
import SideloadedData = Resource.SideloadedData;
import {SideloadedDataManager} from "./SideloadedDataManager";

export class SideloadedModelData extends SideloadedDataClass {
  public sideloadedModelData: any = {};
  constructor(sideloadedData: SideloadedData, dm: SideloadedDataManager) {
    super(sideloadedData, dm, 'sideloadedModelData');
    this.transformSideloadedData();
  }

  private transformSideloadedData = () => {
    for (const type of Object.keys(this.sideloadedData))
      this.sideloadedModelData[type] = this.sideloadedData[type].map(resource => new ResourceModel(resource, type, this.dm));
  };

  public getCollectionByType(type: string): ResourceModel[] {
    return super.getCollectionByType(type) as ResourceModel[];
  }

  public getResourceModelByTypeAndId(type: string, id: number): any {
   return super.getResourceModelByTypeAndId(type, id);
  }

  public getResourceModelsByTypeAndIds(type: string, ids: number[]): ResourceModel[] {
    return ids.map(id => this.getResourceModelByTypeAndId(type, id)).filter(resource => resource !== null) as ResourceModel[];
  }

  public getData(): any {
    return super.getData() as any;
  }
}
