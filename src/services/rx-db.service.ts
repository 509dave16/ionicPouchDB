import {Injectable} from "@angular/core";
import 'rxjs';
// import 'babel-polyfill';
import RxDB from 'rxdb';
import {SuperLoginService} from "./superlogin.service";
import pouchdbAdapterIdb from 'pouchdb-adapter-idb';

@Injectable()
export class RxDBService {
  constructor(public superLoginService: SuperLoginService) {
  }

  public async init() {
    const remoteName = this.superLoginService.SuperLoginClient.getDbUrl('relational');
    RxDB.plugin(pouchdbAdapterIdb);
    const db = await RxDB.create({
      name: remoteName,           // <- name,          // <- storage-adapter
      password: 'myPassword',     // <- password (optional)
      adapter: 'idb',
      multiInstance: true         // <- multiInstance (default: true)
    });
    console.dir(db);
    return true;
  }
}
