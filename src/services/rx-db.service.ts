import {Injectable} from "@angular/core";
import RxDB from 'rxdb';
import {SuperLoginService} from "./superlogin.service";

@Injectable()
export class RxDBService {
  public db: any;
  constructor(public superLoginService: SuperLoginService) {
  }

  public async init() {
    const remoteName = this.superLoginService.SuperLoginClient.getDbUrl('relational');
    this.db = await RxDB.create({
      name: remoteName,
      password: 'myPassword',
      adapter: 'idb',
      multiInstance: false
    });
    return true;
  }
}
