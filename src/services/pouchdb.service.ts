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
    this.remote = this.networkService.buildUrl('todos', 5894);

    let options = {
      live: true,
      retry: true,
      continuous: true,
      auth: {
        username: '509dave16',
        password: 'dsf0@mia',
      },
    };
    this.db.sync(this.remote, options);

    this.db.info()
      .then((info) => {
        LoggingUtil.logObject(info, 'logging pouchdb.info');
      })
      .catch((error) => {
        LoggingUtil.logObject(error, 'logging pouchdb.info error');
      });
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
