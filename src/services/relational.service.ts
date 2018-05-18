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

  seedTestData(): Promise<ResourceModel>
  {
    return this.getTestData()
      .then((dm: SideloadedDataManager) => {
        const author: ResourceModel = dm.getModelRoot();
        if (author) {
          return author;
        }
        const gotBook = { title: 'A Game of Thrones', id: 6, author: 1};
        const hkBook = {title: 'The Hedge Knight', id: 7, author: 1};
        const grmAuthor = { name: 'George R. R. Martin', id: 1, books: [6, 7] };
        return this.db.save('books', gotBook)
          .then(() =>  {
            return this.db.save('books', hkBook);
          })
          .then(() => {
            return this.db.save('authors', grmAuthor);
          })
          .then((dm: SideloadedDataManager) => {
            return dm.getModelRoot();
          })
          .then((refetchedAuthor: ResourceModel) => {
            return refetchedAuthor;
          })
          .catch(console.log.bind(console))
        ;
      })
    ;
  }

  getTestData(): Promise<SideloadedDataManager>
  {
    return this.db.findById('authors', 1);
  }
}
