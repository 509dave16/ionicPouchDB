import {Injectable} from "@angular/core";
import {SuperLoginService} from "./superlogin.service";
import PouchDB from "pouchdb";
import Database = PouchDB.Database;

interface RelationalDatabase extends Database {
  setSchema?(schema: any);
  rel?: any;
}

@Injectable()
export class RelationalService {
  public db: RelationalDatabase;
  public remote: string;
  public data: any;
  constructor(public superLoginService: SuperLoginService){}
  init() {
    this.db = new PouchDB('relational');
    this.db.setSchema([
      {singular: 'author', plural: 'authors', relations: { books: {hasMany: 'book'}}},
      {singular: 'book', plural: 'books', relations: {author: {belongsTo: 'author'}}}
    ]);
    this.remote = this.superLoginService.SuperLoginClient.getDbUrl('relational');
    const remoteDB = new PouchDB(this.remote);

    let options = {
      live: true,
      retry: true,
      continuous: true
    };

    this.db.replicate.to(remoteDB, options)
      .on('change', function (info) {
        // handle change
        console.log('info', info);
      }).on('paused', function (err) {
        // replication paused (e.g. replication up to date, user went offline)
        console.log('paused', err);
        // NOTE: This happens all the time should only log for more specific instances
        // NOTE: This is happening frequently due to inherited docs that don't exist in CouchDB that are somehow made available in PouchDB.
      }).on('denied', function (err) {
        // a document failed to replicate (e.g. due to permissions)
        console.log('denied', err);
      }).on('complete', function (info) {
        // handle complete
        console.log('complete', info);
      }).on('error', function (err) {
        // handle error
        console.log('error', err);
      })
    ;
    this.db.replicate.from(remoteDB, options);
  }

  seedTestData()
  {
    return this.getTestData()
      .then((data) => {
        if (data.authors.length != 0) {
          return;
        }
        this.db.rel.save('author', {
          name: 'George R. R. Martin', id: 1, books: [6, 7]
        }).then(() => {
          return this.db.rel.save('book', { title: 'A Game of Thrones', id: 6, author: 1});
        }).then(() =>  {
          return this.db.rel.save('book', {title: 'The Hedge Knight', id: 7, author: 1});
        }).catch(console.log.bind(console));
      })
    ;

  }

  getTestData()
  {
    return this.db.rel.find('author', 1);
  }
}
