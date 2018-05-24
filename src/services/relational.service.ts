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
    const authorProps: Properties = {
      name: {type: t.String, default: ''},
      books: {type: t.Array, elementType: t.Number, default: []},
      id: {type: t.Number, default: null},
      rev: {type: t.String, default: null}
    };
    const bookProps: Properties = {
      title: {type: t.String, default: ''},
      author: {type: t.maybe(t.Number), default: null},
      id: {type: t.Number, default: null},
      rev: {type: t.String, default: null}
    };

    const schemas: TypeSchema[] = [
      {singular: 'author', plural: 'authors', props: authorProps , relations: {books: {hasMany: 'books'}}},
      {singular: 'book', plural: 'books', props: bookProps, relations: {author: {belongsTo: 'authors'}}}
    ];
    this.db = new Database(schemas, 'relationalDB', remote);
    return this.db.init();
  }

  async seedTestData(): Promise<ResourceModel> {
    // try {
      let author: ResourceModel = await this.getTestData();
      if (author) {
        return author;
      }
      const gotBook = {title: 'A Game of Thrones'};
      const hkBook = {title: 'The Hedge Knight'};
      const grmAuthor = {name: 'George R. R. Martin'};
      author = await this.db.save('authors', grmAuthor);
      author.attach('books', gotBook);
      author.attach('books', hkBook);
      await author.save({ related: true, bulk: true});
      return author;
    // } catch (error) {
    //   console.error(error.message);
    // }
  }

  getTestData(): Promise<ResourceModel> {
    return Promise.resolve(null);
    // return this.db.findById('authors', 1);
  }

  getBooks(): Promise<ResourceCollection> {
    return this.db.findAll('books');
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
    const response = await this.db.bulkDocs([{
     'test': 'if bulk docs works'
    }]);
    console.log(`Book ID Parsed: ${parsedId.id}`);
  }
}
