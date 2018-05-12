import {Injectable} from "@angular/core";
import {SuperLoginService} from "./superlogin.service";
import {RelationalDB} from "../classes/RelationalDB";
import TypeSchema = Resource.TypeSchema;
import {ResourceModel} from "../classes/ResourceModel";

@Injectable()
export class RelationalService {
  public db: RelationalDB;
  public data: any;
  constructor(public superLoginService: SuperLoginService){}
  init() {
    const remote = this.superLoginService.SuperLoginClient.getDbUrl('relational');
    const schema: TypeSchema[] = [
      {singular: 'author', plural: 'authors', relations: { books: {hasMany: 'books'}}},
      {singular: 'book', plural: 'books', relations: {author: {belongsTo: 'authors'}}}
    ];
    this.db = new RelationalDB(schema, 'relationalDB', remote);

  }

  seedTestData(): Promise<ResourceModel>
  {
    return this.getTestData()
      .then((author: ResourceModel) => {
        if (author) {
          return author;
        }
        const gotBook = { title: 'A Game of Thrones', id: 6, author: 1};
        const hkBook = {title: 'The Hedge Knight', id: 7, author: 1};
        const grmAuthor = { name: 'George R. R. Martin', id: 1, books: [6, 7] };
        return this.db.save('books', gotBook)
          .then((book: ResourceModel) =>  {
            return this.db.save('books', hkBook);
          })
          .then((book: ResourceModel) => {
            return this.db.save('authors', grmAuthor);
          })
          .then((author: ResourceModel) => {
            return author.refetch();
          })
          .then((refetchedAuthor: ResourceModel) => {
            return refetchedAuthor;
          })
          .catch(console.log.bind(console))
        ;
      })
    ;
  }

  getTestData(): Promise<ResourceModel>
  {
    return this.db.findById('authors', 1);
  }
}
