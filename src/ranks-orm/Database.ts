import PouchDB from 'pouchdb';
import TypeSchema = RanksORM.TypeSchema;
import RelationalDatabase = RanksORM.RelationalDatabase;
import FindOptions = RanksORM.FindOptions;
import {RanksMediator} from "./RanksMediator";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import SideloadedData = RanksORM.SideloadedData;
import RootDocDescriptor = RanksORM.RootDocDescriptor;
import ParsedDocId = RanksORM.ParsedDocId;
import {DocModel} from "./DocModel";
import {DocCollection} from "./DocCollection";
import {Schema} from "./Schema";
import {DocIdCache} from "./DocIdCache";
import DocQuery = RanksORM.DocQuery;

export class Database {
  public schema: Schema;
  private localName: string;
  private remoteName: string;
  private db: RelationalDatabase;
  public docIdCache: DocIdCache;

  constructor(typeSchemas: TypeSchema[], localName: string = 'relational-db', remoteName: string = '') {
    this.schema = new Schema(typeSchemas);
    this.localName = localName;
    this.remoteName = remoteName;
  }

  init (): Promise<any> {
    this.setupReplication();
    this.docIdCache = new DocIdCache(this);
    return this.docIdCache.initializeDocIdCache();
  }

  setupReplication() {
    this.db = new PouchDB(this.localName);
    this.db.setSchema(this.schema.getTypeSchemas());

    const remoteDB: PouchDB.Database = new PouchDB(this.remoteName);

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

  async save(type: string, object: any, retry: boolean = true): Promise<DocModel> {
    let writeCompleted = false;
    let promise = null;
    let descriptor: RootDocDescriptor = null;
    while (!writeCompleted) {
      try {
        if (object.id === undefined) {
          object.id = this.docIdCache.getNextDocId(type);
        }
        const query: DocQuery = () => this.findById(type, object.id);
        descriptor = { type, ids: [object.id], plurality: 'model', query};
        const data: SideloadedData = await this.db.rel.save(type, object);
        promise = Promise.resolve(data);
        writeCompleted = true;
      } catch(error) {
        console.log(error);
        if(error.name === 'conflict') {
          object.id = undefined;
        } else {
          writeCompleted = true;
          promise = Promise.resolve({});
        }
      }
    }
    return this.wrapWithDocModel(descriptor, promise);
  }

  findAll(type: string): Promise<DocCollection> {
    const query: DocQuery = () => this.db.rel.find(type);
    const descriptor: RootDocDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithDocCollection(descriptor, query());
  }

  findById(type: string, id: number): Promise<DocModel> {
    const query: DocQuery = () => this.db.rel.find(type, id);
    const descriptor: RootDocDescriptor = { type, ids: [id], plurality: 'model', query};
    return this.wrapWithDocModel(descriptor, query());
  }

  findByIds(type: string, ids: number[]): Promise<DocCollection> {
    const query = () => this.db.rel.find(type, ids);
    const descriptor: RootDocDescriptor = { type, ids, plurality: 'collection', query};
    return this.wrapWithDocCollection(descriptor, query());
  }

  // Update this later if we need to include options in the query object
  findByOptions(type: string, options: FindOptions): Promise<DocCollection> {
    const query: DocQuery = () => this.db.rel.find(type, options);
    const descriptor: RootDocDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithDocCollection(descriptor, query());
  }
  findHasMany(type: string, belongsToKey: string, belongsToId: number): Promise<DocCollection> {
    const query: DocQuery = () => this.db.rel.findHasMany(type, belongsToKey, belongsToId);
    const descriptor: RootDocDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithDocCollection(descriptor, query());
  }
  delete(type: string, object: any): Promise<any> {
    return this.db.rel.del(type, object);
  }

  isDeleted(type: any, id: number): Promise<any> {
    return this.db.rel(type, id);
  }

  getAttachment(type: string, id: number, attachmentId: string): Promise<Blob> {
    return this.db.rel.getAttachment(type, id, attachmentId)
  }

  putAttachment(type: string, object: any, attachmentId: string, attachment: any, attachmentType: string): Promise<DocModel> {
    const ids = [object.id];
    const plurality = 'model';
    const query = () => this.db.rel.find(type, object.id);
    const descriptor: RootDocDescriptor = { type, ids, plurality, query };
    return this.wrapWithDocModel(descriptor, this.db.rel.putAttachment(type, object, attachmentId, attachment, attachmentType));
  }

  removeAttachment(type: string, object: any, attachmentId: string): Promise<DocModel> {
    const ids = [object.id];
    const query = () => this.findById(type, object.id);
    const plurality = 'model';
    const descriptor: RootDocDescriptor = { type, ids, plurality, query };
    return this.wrapWithDocModel(descriptor, this.db.rel.removeAttachment(type, object, attachmentId));
  }

  parseDocID(docID: string): ParsedDocId {
    return this.db.rel.parseDocID(docID);
  }

  makeDocID(parsedDocID: ParsedDocId): string {
    return this.db.rel.makeDocID(parsedDocID);
  }

  parseRelDocs(RootDocDescriptor, pouchDocs: any): Promise<DocCollection> {
    return this.wrapWithDocCollection(RootDocDescriptor, this.db.rel.parseRelDocs(RootDocDescriptor.type, pouchDocs));
  }

  bulkDocs(docs: any[]): Promise<any> {
    return this.db.bulkDocs(docs);
  }

  allDocs(options): Promise<any> {
    return this.db.allDocs(options);
  }

  async deleteAllDocs(): Promise<any> {
    const allDocs = await this.db.allDocs({include_docs: true});
    const deleteDocs = allDocs.rows.map(row => {
      return {_id: row.id, _rev: row.doc._rev, _deleted: true};
    });
    return this.db.bulkDocs(deleteDocs);
  }

  private async wrapWithDocModel(descriptor: RanksORM.RootDocDescriptor, promise: Promise<any>): Promise<DocModel> {
    const data: SideloadedData = await promise;
    const mediator: RanksMediator = new RanksMediator(descriptor, data, this);
    return mediator.getModelRoot();
  }

  private async wrapWithDocCollection(descriptor: RanksORM.RootDocDescriptor, promise: Promise<any>): Promise<DocCollection> {
    const data: SideloadedData = await promise;
    const mediator: RanksMediator = new RanksMediator(descriptor, data, this);
    return mediator.getCollectionRoot();
  }
}
