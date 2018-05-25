import {Injectable} from "@angular/core";
import {SuperLoginService} from "./superlogin.service";
import {Database} from "../classes/Database";
import TypeSchema = RanksORM.TypeSchema;
import {ResourceModel} from "../classes/ResourceModel";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import {ResourceCollection} from "../classes/ResourceCollection";
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

  async seedTestData(): Promise<ResourceModel> {
      let author: ResourceModel = await this.getTestData();
      if (author) {
        return author;
      }
      // const gotBook = {title: 'A Game of Thrones', id: 132};
      // const hkBook = {title: 'The Hedge Knight', id: 133};
    const gotBook = {title: 'A Game of Thrones'};
    const hkBook = {title: 'The Hedge Knight'};
      const grmAuthor = {name: 'George R. R. Martin'};
      author = await this.db.save('authors', grmAuthor);
      await author.attach('books', gotBook)
        .attach('books', hkBook)
        .save({ related: true, bulk: true})
      ;
      return author;
  }

  getTestData(): Promise<ResourceModel> {
    return Promise.resolve(null);
    // return this.db.findById('authors', 1);
  }

  getBooks(): Promise<ResourceCollection> {
    return this.db.findAll('books');
  }

  async createAuthor(authorId) {
    const grmAuthor = {name: 'George R. R. Martin'};
    const author: ResourceModel = await this.db.save('authors', grmAuthor);
    return author;
  }

  async addBookToAuthor(data: any, authorId: number): Promise<ResourceModel> {
    const author: ResourceModel = await this.db.findById('authors', authorId);
    author.attach('books', data);
    return author.save({ related: true, bulk: true });
  }

  async removeBookFromAuthor(bookId: number, authorId: number): Promise<ResourceModel> {
    const author: ResourceModel = await this.db.findById('authors', authorId);
    author.detach('books', bookId);
    return author.save({related: true, bulk: true});
  }

  async troubleshoot() {
    const parsedId: any = this.db.parseDocID('book_1_0000000000000012');
    console.log(`Book ID Parsed: ${parsedId.id}`);
    const response = await this.db.bulkDocs([{
      _id: 'book_1_0000000000000012',
      data: { name: 'its me'},
    }]);
    console.log(response);
  }
}
