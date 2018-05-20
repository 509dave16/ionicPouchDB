import {Injectable} from "@angular/core";
import {SuperLoginService} from "./superlogin.service";
import {Database} from "../classes/Database";
import TypeSchema = Resource.TypeSchema;
import {ResourceModel} from "../classes/ResourceModel";
import {SideloadedDataManager} from "../classes/SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";

@Injectable()
export class RelationalService {
  public db: Database;
  public data: any;
  constructor(public superLoginService: SuperLoginService){}
  init() {
    const remote = this.superLoginService.SuperLoginClient.getDbUrl('relational');
    const schema: TypeSchema[] = [
      {singular: 'author', plural: 'authors', relations: { books: {hasMany: 'books'}}},
      {singular: 'book', plural: 'books', relations: {author: {belongsTo: 'authors'}}}
    ];
    this.db = new Database(schema, 'relationalDB', remote);
  }

  async seedTestData(): Promise<ResourceModel>
  {
    try {
      let dm: SideloadedDataManager = await this.getTestData();
      const author: ResourceModel = dm.getModelRoot();
      if (author) {
        return author;
      }
      const gotBook = { title: 'A Game of Thrones', id: 6, author: 1};
      const hkBook = {title: 'The Hedge Knight', id: 7, author: 1};
      const grmAuthor = { name: 'George R. R. Martin', id: 1, books: [6, 7] };
      await this.db.save('books', gotBook);
      await this.db.save('books', hkBook);
      dm = await this.db.save('authors', grmAuthor);
      return dm.getModelRoot();
    } catch(error) {
      console.error(error.message);
    }
  }

  getTestData(): Promise<SideloadedDataManager>
  {
    return this.db.findById('authors', 1);
  }

  async addBookToAuthor(data: any, authorId: number) {
    const bookDM: SideloadedDataManager = await this.db.save('books', data);
    const book: ResourceModel = bookDM.getModelRoot();
    const authorDM: SideloadedDataManager = await this.db.findById('authors', authorId);
    const author: ResourceModel = authorDM.getModelRoot();
    author.attach('books', book);
    book.attach('author', author);
    return authorDM.saveAll();
  }
}
