import {Injectable} from "@angular/core";
import {SuperLoginService} from "./superlogin.service";
import t from 'tcomb';
import PouchDB from "pouchdb";
import { Database, DocCollection, DocModel, RanksDB } from 'ranksdb';

@Injectable()
export class RelationalService {
  public db: Database;
  public data: any;

  constructor(public superLoginService: SuperLoginService) {
  }

  async init(): Promise<any> {
    const remote = this.superLoginService.SuperLoginClient.getDbUrl('relational');
    const commonProps: RanksDB.Properties = {
      deleted_at: { type: t.maybe(t.Date), default: () => null },
      updated_at: { type: t.maybe(t.Date), default: () => null },
      created_at: { type: t.maybe(t.Date), default: () => null },
      id: {type: t.Number, default: () => null},
      rev: {type: t.String, default: () => null}
    };
    const authorProps: RanksDB.Properties = {
      ...commonProps,
      name: {type: t.String, default: () => ''},
      books: {type: t.Array, elementType: t.Number, default: () => []},
      publishers: {type: t.maybe(t.Array), elementType: t.Number, default: () => []},
    };
    const bookProps: RanksDB.Properties = {
      ...commonProps,
      title: {type: t.String, default: () => ''},
      author: {type: t.maybe(t.Number), default: () => null},
      publisher: {type: t.maybe(t.Number), default: () => null},
    };
    const publisherProps: RanksDB.Properties = {
      ...commonProps,
      name: {type: t.String, default: () => ''},
      books: {type: t.maybe(t.Array), elementType: t.Number, default: () => []},
      authors: {type: t.maybe(t.Array), elementType: t.Number, default: () => []},
    };

    const schemas: RanksDB.TypeSchema = [
      {singular: 'author', plural: 'authors', props: authorProps , relations: {books: {hasMany: 'books'}, publishers: {hasMany: 'publishers'} }},
      {singular: 'book', plural: 'books', props: bookProps, relations: {author: {belongsTo: 'authors'}, publisher: { belongsTo: 'publishers'}}},
      {singular: 'publisher', plural: 'publishers', props: publisherProps, relations: {authors: { hasMany: 'authors' }, books: { hasMany: 'books'}}}
    ];
    const pouch = this.setupReplication(remote);
    this.db = new Database(schemas, pouch);
    return this.db.init();
  }

  setupReplication(remote: string) {
    const pouch = new PouchDB('relationalDB');
    const remoteDB: PouchDB.Database = new PouchDB(remote);
    let options = {
      live: true,
      retry: true,
      continuous: true
    };

    pouch.replicate.to(remoteDB, options)
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
    pouch.replicate.from(remoteDB, options);
    return pouch;
  }

  async seedTestData(): Promise<DocModel> {
    let author: DocModel = await this.getTestData();
    if (author) {
      return author;
    }
    const bsPublisher = { name: 'Bantam Spectra' };
    const publisher = await this.db.save('publishers', bsPublisher);
    const gotBook = {title: 'A Game of Thrones'};
    const hkBook = {title: 'The Hedge Knight'};
    const grmAuthor = {name: 'George R. R. Martin'};
    const gotBookModel: DocModel = await publisher.attach('books', gotBook);
    const hkBookModel: DocModel = await publisher.attach('books', hkBook);
    const grmAuthorModel: DocModel = await publisher.attach('authors', grmAuthor);
    await grmAuthorModel.attach('books', gotBookModel);
    await grmAuthorModel.attach('books', hkBookModel);
    await publisher.save({ related: true, bulk: true});
    return grmAuthorModel;
  }

  getTestData(): Promise<DocModel> {
    return Promise.resolve(null);
    // return this.db.findById('authors', 1);
  }

  removeAllData(): Promise<any> {
    return this.db.deleteAllDocs();
  }

  getBooks(): Promise<DocCollection> {
    return this.db.findAll('books');
  }

  async createAuthor(authorId) {
    const grmAuthor = {name: 'George R. R. Martin'};
    const author: DocModel = await this.db.save('authors', grmAuthor);
    return author;
  }

  async addBookToAuthor(data: any, authorId: number): Promise<DocModel> {
    const author: DocModel = await this.db.findById('authors', authorId);
    const book: DocModel = await author.attach('books', data);
    const publishers: DocCollection = (await author.get('publishers')) as DocCollection;
    await publishers.first().attach('books', book);
    return author.save({ related: true, bulk: true });
  }

  async removeBookFromAuthor(bookId: number, authorId: number): Promise<DocModel> {
    const author: DocModel = await this.db.findById('authors', authorId);
    await author.detach('books', bookId);
    const publishers: DocCollection = (await author.get('publishers')) as DocCollection;
    await publishers.first().detach('books', bookId);
    return author.save({related: true, bulk: true});
  }

  async troubleshoot() {
    // Doc Id Parsing
    // const parsedId: any = this.db.parseDocID('book_1_0000000000000012');
    // console.log(`Book ID Parsed: ${parsedId.id}`);
    // Doc conflicts from missing rev
    // const response = await this.db.bulkDocs([{
    //   _id: 'book_1_0000000000000012',
    //   data: { name: 'its me'},
    // }]);
    // console.log(response);
  }
}
