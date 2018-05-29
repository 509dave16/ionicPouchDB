import {Injectable} from "@angular/core";
import {SuperLoginService} from "./superlogin.service";
import {Database} from "../ranks-orm/Database";
import TypeSchema = RanksORM.TypeSchema;
import {DocModel} from "../ranks-orm/DocModel";
import {RanksORM} from "../ranks-orm/RanksORM.namespace";
import {DocCollection} from "../ranks-orm/DocCollection";
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
    };
    const authorProps: Properties = {
      ...commonProps,
      name: {type: t.String, default: () => ''},
      books: {type: t.Array, elementType: t.Number, default: () => []},
      publishers: {type: t.maybe(t.Array), elementType: t.Number, default: () => []},
    };
    const bookProps: Properties = {
      ...commonProps,
      title: {type: t.String, default: () => ''},
      author: {type: t.maybe(t.Number), default: () => null},
      publisher: {type: t.maybe(t.Number), default: () => null},
    };
    const publisherProps: Properties = {
      ...commonProps,
      name: {type: t.String, default: () => ''},
      books: {type: t.maybe(t.Array), elementType: t.Number, default: () => []},
      authors: {type: t.maybe(t.Array), elementType: t.Number, default: () => []},
    };

    const schemas: TypeSchema[] = [
      {singular: 'author', plural: 'authors', props: authorProps , relations: {books: {hasMany: 'books'}, publishers: {hasMany: 'publishers'} }},
      {singular: 'book', plural: 'books', props: bookProps, relations: {author: {belongsTo: 'authors'}, publisher: { belongsTo: 'publishers'}}},
      {singular: 'publisher', plural: 'publishers', props: publisherProps, relations: {authors: { hasMany: 'authors' }, books: { hasMany: 'books'}}}
    ];
    this.db = new Database(schemas, 'relationalDB', remote);
    return this.db.init();
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
    // await publisher.attach('books', book);
    return author.save({ related: true, bulk: true });
  }

  async removeBookFromAuthor(bookId: number, authorId: number): Promise<DocModel> {
    const author: DocModel = await this.db.findById('authors', authorId);
    await author.detach('books', bookId);
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
