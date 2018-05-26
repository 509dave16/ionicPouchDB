import {Injectable} from "@angular/core";
import {SuperLoginService} from "./superlogin.service";
import {Database} from "../classes/Database";
import TypeSchema = RanksORM.TypeSchema;
import {DocModel} from "../classes/DocModel";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import {DocCollection} from "../classes/DocCollection";
import t from 'tcomb';
import Properties = RanksORM.Properties;

@Injectable()
export class RelationalService {
  public db: Database;
  public data: any;

  constructor(public superLoginService: SuperLoginService) {
  }

  init(): Promise<any> {
    const remote = this.superLoginService.SuperLoginClient.getDbUrl('relational');
    const commonProps: Properties = {
      deleted_at: { type: t.maybe(t.Date), default: () => null },
      updated_at: { type: t.maybe(t.Date), default: () => null },
      created_at: { type: t.maybe(t.Date), default: () => null },
      id: {type: t.Number, default: () => null},
      rev: {type: t.String, default: () => null}
    }
    const authorProps: Properties = {
      ...commonProps,
      name: {type: t.String, default: () => ''},
      books: {type: t.Array, elementType: t.Number, default: () => []},
    };
    const bookProps: Properties = {
      ...commonProps,
      title: {type: t.String, default: () => ''},
      author: {type: t.maybe(t.Number), default: () => null},
    };

    const schemas: TypeSchema[] = [
      {singular: 'author', plural: 'authors', props: authorProps , relations: {books: {hasMany: 'books'}}},
      {singular: 'book', plural: 'books', props: bookProps, relations: {author: {belongsTo: 'authors'}}}
    ];
    this.db = new Database(schemas, 'relationalDB', remote);
    return this.db.init();
  }

  async seedTestData(): Promise<DocModel> {
      let author: DocModel = await this.getTestData();
      if (author) {
        return author;
      }
    const gotBook = {title: 'A Game of Thrones', id: 1};
    const hkBook = {title: 'The Hedge Knight', id: 2};
    const grmAuthor = {name: 'George R. R. Martin'};
    author = await this.db.save('authors', grmAuthor);
    await author.attach('books', gotBook)
      .attach('books', hkBook)
      .save({ related: true, bulk: true})
    ;
    return author;
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
    author.attach('books', data);
    return author.save({ related: true, bulk: true });
  }

  async removeBookFromAuthor(bookId: number, authorId: number): Promise<DocModel> {
    const author: DocModel = await this.db.findById('authors', authorId);
    author.detach('books', bookId);
    return author.save({related: true, bulk: true});
  }

  async troubleshoot() {
    // Doc Id Parsing
    const parsedId: any = this.db.parseDocID('book_1_0000000000000012');
    console.log(`Book ID Parsed: ${parsedId.id}`);
    // Doc conflicts from missing rev
    const response = await this.db.bulkDocs([{
      _id: 'book_1_0000000000000012',
      data: { name: 'its me'},
    }]);
    console.log(response);
  }
}
