import {Injectable} from "@angular/core";
import {SuperLoginService} from "./superlogin.service";
import {Database} from "../classes/Database";
import TypeSchema = Resource.TypeSchema;
import {ResourceModel} from "../classes/ResourceModel";
import {Resource} from "../namespaces/Resource.namespace";
import {ResourceCollection} from "../classes/ResourceCollection";

@Injectable()
export class RelationalService {
  public db: Database;
  public data: any;

  constructor(public superLoginService: SuperLoginService) {
  }

  async init() {
    const remote = this.superLoginService.SuperLoginClient.getDbUrl('relational');
    const schema: TypeSchema[] = [
      {singular: 'author', plural: 'authors', relations: {books: {hasMany: 'books'}}},
      {singular: 'book', plural: 'books', relations: {author: {belongsTo: 'authors'}}}
    ];
    this.db = new Database(schema, 'relationalDB', remote);
    await this.db.init();
    return this;
  }

  async seedTestData(): Promise<ResourceModel> {
    // try {
      let author: ResourceModel = await this.getTestData();
      if (author) {
        return author;
      }
      // const gotBook = {title: 'A Game of Thrones', id: 6, author: 1};
      // const hkBook = {title: 'The Hedge Knight', id: 7, author: 1};
      // const grmAuthor = {name: 'George R. R. Martin', id: 1, books: [6, 7]};
      const gotBook = {title: 'A Game of Thrones'};
      const hkBook = {title: 'The Hedge Knight'};
      const grmAuthor = {name: 'George R. R. Martin'};
      // await this.db.save('books', gotBook);
      // await this.db.save('books', hkBook);
      author = await this.db.save('authors', grmAuthor);
      author.attach('books', gotBook);
      author.attach('books', hkBook);
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
