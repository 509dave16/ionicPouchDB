import {Injectable} from "@angular/core";
import PouchDB from 'pouchdb';
import {LoggingUtil} from "../utils/logging.util";
import {NetworkService} from "./network.service";

export interface Todo {
  _id: string;
  title: string;
  completed: boolean;
}


@Injectable()
export class PouchdbService {
  public db: PouchDB.Database;
  private remote: string;
  constructor(public networkService: NetworkService) {
    this.db = new PouchDB('todos');
    const credentials: string = 'davidfall:davidfall@';
    this.remote = this.networkService.buildUrl('todos', 5984, credentials, 'www.pouchdb-local.com');
    const remoteDB = new PouchDB(this.remote);

    let options = {
      live: true,
      retry: true,
      continuous: true,
    };

    this.db.replicate.to(remoteDB, options)
      .on('denied', function (err) {
        // a document failed to replicate (e.g. due to permissions)
        console.log('denied', err);
      })
    ;
    this.db.replicate.from(remoteDB, options);
  }


  addTodo(todo: Todo): Promise<PouchDB.Core.Response> {
    return this.db.put(todo);
  }

  getTodos(): Promise<PouchDB.Core.AllDocsResponse<Todo>> {
    return this.db.allDocs<Todo>({ include_docs: true });
  }

  deleteTodo(todoDoc: PouchDB.Core.ExistingDocument<Todo>): Promise<PouchDB.Core.Response>  {
    return this.db.remove(todoDoc);
  }
}
