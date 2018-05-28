import {RanksORM} from "./RanksORM.namespace";
import SideloadedData = RanksORM.SideloadedData;
import {RanksMediator} from "./RanksMediator";
import {DocModel} from "./DocModel";
import ISideloadedRankModels = RanksORM.ISideloadedRankModels;

export class Ranks {
  public sideloadedRankModels: ISideloadedRankModels = {};
  private  dm: RanksMediator;

  constructor(sideloadedData: SideloadedData, dm: RanksMediator) {
    this.dm = dm;
    this.transformSideloadedData(sideloadedData);
  }
  private transformSideloadedData(sideloadedData: SideloadedData) {
    for (const type of Object.keys(sideloadedData))
      this.sideloadedRankModels[type] = sideloadedData[type].map(doc => new DocModel(doc, type, this.dm));
  }

  public getRankByType(type: string): DocModel[] {
    if (this.sideloadedRankModels[type] === undefined) {
      this.sideloadedRankModels[type] = [];
    }
    return this.sideloadedRankModels[type];
  }

  public getDocModelByTypeAndId(type: string, id: number): DocModel {
    const models: any[] =  this.getRankByType(type);
    if (!models) {
      return null;
    }
    return models.find((model) => model.id === id);
  }

  public getDocModelsByTypeAndIds(type: string, ids: number[]): DocModel[] {
    return ids.map(id => this.getDocModelByTypeAndId(type, id)).filter(doc => doc !== null);
  }

  public getDocModelIndexByTypeAndId(type: string, id: number): number {
    const models: any[] =  this.getRankByType(type);
    if (!models) {
      return -1;
    }
    return models.findIndex((model) => model.id === id);
  }

  public getRanks(): ISideloadedRankModels {
    return this.sideloadedRankModels;
  }

  public getFlattenedRanks(): DocModel[] {
    const ara = [];
    for(const key in this.sideloadedRankModels) {
      const collection = this.sideloadedRankModels[key];
      collection.map((doc) => ara.push(doc));
    }
    return ara;
  }
}
