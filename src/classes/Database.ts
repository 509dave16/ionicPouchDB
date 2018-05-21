import PouchDB from 'pouchdb';
import TypeSchema = Resource.TypeSchema;
import RelationalDatabase = Resource.RelationalDatabase;
import FindOptions = Resource.FindOptions;
import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import SideloadedData = Resource.SideloadedData;
import RootResourceDescriptor = Resource.RootResourceDescriptor;
import ParsedDocId = Resource.ParsedDocId;
import MaxDocIdCache = Resource.MaxDocIdCache;

export interface ResourceQuery {
  (): Promise<SideloadedDataManager>;
}

export class Database {
  private schema: TypeSchema[];
  private db: RelationalDatabase;
  private maxDocIdCache: MaxDocIdCache = {};

  constructor(schema: TypeSchema[], localName: string = 'relational-db', remoteName: string = '') {
    this.schema = schema;
    this.db = new PouchDB(localName);
    this.db.setSchema(schema);
    this.initializeMaxDocIdCache();
    const remoteDB = new PouchDB(remoteName);

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

  async save(type: string, object: any): Promise<SideloadedDataManager> {
    let writeCompleted = false;
    let promise = null;
    let descriptor: RootResourceDescriptor = null;
    while (!writeCompleted) {
      try {
        if (object.id === undefined) {
          object.id = this.getNextMaxDocId(type);
        }
        const query: ResourceQuery = () => this.findById(type, object.id);
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
    return this.wrapWithDataManager(descriptor, promise);
  }

  findAll(type: string): Promise<SideloadedDataManager> {
    const query: ResourceQuery = () => this.db.rel.find(type);
    const descriptor: RootResourceDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithDataManager(descriptor, query());
  }

  findById(type: string, id: number): Promise<SideloadedDataManager> {
    const query: ResourceQuery = () => this.db.rel.find(type, id);
    const descriptor: RootResourceDescriptor = { type, ids: [id], plurality: 'model', query};
    return this.wrapWithDataManager(descriptor, query());
  }

  findByIds(type: string, ids: number[]): Promise<SideloadedDataManager> {
    const query = () => this.db.rel.find(type, ids);
    const descriptor: RootResourceDescriptor = { type, ids, plurality: 'collection', query};
    return this.wrapWithDataManager(descriptor, query());
  }

  // Update this later if we need to include options in the query object
  findByOptions(type: string, options: FindOptions): Promise<SideloadedDataManager> {
    const query: ResourceQuery = () => this.db.rel.find(type, options);
    const descriptor: RootResourceDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithDataManager(descriptor, query());
  }
  findHasMany(type: string, belongsToKey: string, belongsToId: number): Promise<SideloadedDataManager> {
    const query: ResourceQuery = () => this.db.rel.findHasMany(type, belongsToKey, belongsToId);
    const descriptor: RootResourceDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithDataManager(descriptor, query());
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

  putAttachment(type: string, object: any, attachmentId: string, attachment: any, attachmentType: string): Promise<SideloadedDataManager> {
    const ids = [object.id];
    const plurality = 'model';
    const query = () => this.db.rel.find(type, object.id);
    const descriptor: RootResourceDescriptor = { type, ids, plurality, query };
    return this.wrapWithDataManager(descriptor,this.db.rel.putAttachment(type, object, attachmentId, attachment, attachmentType));
  }

  removeAttachment(type: string, object: any, attachmentId: string): Promise<SideloadedDataManager> {
    const ids = [object.id];
    const query = () => this.findById(type, object.id);
    const plurality = 'model';
    const descriptor: RootResourceDescriptor = { type, ids, plurality, query };
    return this.wrapWithDataManager(descriptor, this.db.rel.removeAttachment(type, object, attachmentId));
  }

  parseDocID(docID: string): ParsedDocId {
    return this.db.rel.parseDocID(docID);
  }

  makeDocID(parsedDocID: ParsedDocId): string {
    return this.db.rel.makeDocID(parsedDocID);
  }

  parseRelDocs(rootResourceDescriptor, pouchDocs: any): any {
    return this.wrapWithDataManager(rootResourceDescriptor, this.db.rel.parseRelDocs(rootResourceDescriptor.type, pouchDocs));
  }

  setSchema(schema: TypeSchema[]): void {
    this.schema = schema;
    this.db.setSchema(schema);
  }

  getSchema() {
    return this.schema;
  }

  private async wrapWithDataManager(rootResoureDescriptor: RootResourceDescriptor, promise: Promise<any>): Promise<SideloadedDataManager>
  {
    const data: SideloadedData = await promise;
    return new SideloadedDataManager(rootResoureDescriptor, data, this);
  }

  private async initializeMaxDocIdCache() {
    for(const schema of this.schema) {
      const results = await this.db.allDocs({
        endkey: schema.singular,
        startkey: `${schema.singular}\ufff0`,
        limit: 1,
        descending: true
      });
      if (!results.rows.length) {
        continue;
      }
      const parsedDocId: ParsedDocId = this.parseDocID(results.rows[0].id);
      this.maxDocIdCache[schema.plural] = parsedDocId.id;
    }
    console.log(this.maxDocIdCache);
  }

  private getNextMaxDocId(type: string): number {
    if (this.maxDocIdCache[type] === undefined) {
      throw new Error(`type ${type} does not exist as key in cache.`);
    }
    return this.maxDocIdCache[type] = ++this.maxDocIdCache[type];
  }
}
