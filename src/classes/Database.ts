import PouchDB from 'pouchdb';
import TypeSchema = SideORM.TypeSchema;
import RelationalDatabase = SideORM.RelationalDatabase;
import FindOptions = SideORM.FindOptions;
import {SideloadedDataManager} from "./SideloadedDataManager";
import {SideORM} from "../namespaces/Resource.namespace";
import SideloadedData = SideORM.SideloadedData;
import RootResourceDescriptor = SideORM.RootResourceDescriptor;
import ParsedDocId = SideORM.ParsedDocId;
import MaxDocIdCache = SideORM.MaxDocIdCache;
import {ResourceModel} from "./ResourceModel";
import {ResourceCollection} from "./ResourceCollection";

export interface ResourceQuery {
  (): Promise<ResourceModel|ResourceCollection>;
}

export class Database {
  private schema: TypeSchema[];
  private localName: string;
  private remoteName: string;
  private db: RelationalDatabase;
  private maxDocIdCache: MaxDocIdCache = {};

  constructor(schema: TypeSchema[], localName: string = 'relational-db', remoteName: string = '') {
    this.schema = schema;
    this.localName = localName;
    this.remoteName = remoteName;
  }

  init (): Promise<any> {
    this.setupReplication();
    return this.initializeMaxDocIdCache();
  }

  setupReplication() {
    this.db = new PouchDB(this.localName);
    this.db.setSchema(this.schema);
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

  async save(type: string, object: any): Promise<ResourceModel> {
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
    return this.wrapWithResourceModel(descriptor, promise);
  }

  findAll(type: string): Promise<ResourceCollection> {
    const query: ResourceQuery = () => this.db.rel.find(type);
    const descriptor: RootResourceDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithResourceCollection(descriptor, query());
  }

  findById(type: string, id: number): Promise<ResourceModel> {
    const query: ResourceQuery = () => this.db.rel.find(type, id);
    const descriptor: RootResourceDescriptor = { type, ids: [id], plurality: 'model', query};
    return this.wrapWithResourceModel(descriptor, query());
  }

  findByIds(type: string, ids: number[]): Promise<ResourceCollection> {
    const query = () => this.db.rel.find(type, ids);
    const descriptor: RootResourceDescriptor = { type, ids, plurality: 'collection', query};
    return this.wrapWithResourceCollection(descriptor, query());
  }

  // Update this later if we need to include options in the query object
  findByOptions(type: string, options: FindOptions): Promise<ResourceCollection> {
    const query: ResourceQuery = () => this.db.rel.find(type, options);
    const descriptor: RootResourceDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithResourceCollection(descriptor, query());
  }
  findHasMany(type: string, belongsToKey: string, belongsToId: number): Promise<ResourceCollection> {
    const query: ResourceQuery = () => this.db.rel.findHasMany(type, belongsToKey, belongsToId);
    const descriptor: RootResourceDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithResourceCollection(descriptor, query());
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

  putAttachment(type: string, object: any, attachmentId: string, attachment: any, attachmentType: string): Promise<ResourceModel> {
    const ids = [object.id];
    const plurality = 'model';
    const query = () => this.db.rel.find(type, object.id);
    const descriptor: RootResourceDescriptor = { type, ids, plurality, query };
    return this.wrapWithResourceModel(descriptor,this.db.rel.putAttachment(type, object, attachmentId, attachment, attachmentType));
  }

  removeAttachment(type: string, object: any, attachmentId: string): Promise<ResourceModel> {
    const ids = [object.id];
    const query = () => this.findById(type, object.id);
    const plurality = 'model';
    const descriptor: RootResourceDescriptor = { type, ids, plurality, query };
    return this.wrapWithResourceModel(descriptor, this.db.rel.removeAttachment(type, object, attachmentId));
  }

  parseDocID(docID: string): ParsedDocId {
    return this.db.rel.parseDocID(docID);
  }

  makeDocID(parsedDocID: ParsedDocId): string {
    return this.db.rel.makeDocID(parsedDocID);
  }

  parseRelDocs(rootResourceDescriptor, pouchDocs: any): Promise<ResourceCollection> {
    return this.wrapWithResourceCollection(rootResourceDescriptor, this.db.rel.parseRelDocs(rootResourceDescriptor.type, pouchDocs));
  }

  bulkDocs(docs: any[]): Promise<any> {
    return this.db.bulkDocs(docs);
  }

  setSchema(schema: TypeSchema[]): void {
    this.schema = schema;
    this.db.setSchema(schema);
  }

  getSchema() {
    return this.schema;
  }

  private async wrapWithResourceModel(descriptor: RootResourceDescriptor, promise: Promise<any>): Promise<ResourceModel> {
    const data: SideloadedData = await promise;
    const dm: SideloadedDataManager = new SideloadedDataManager(descriptor, data, this);
    return dm.getModelRoot();
  }

  private async wrapWithResourceCollection(descriptor: RootResourceDescriptor, promise: Promise<any>): Promise<ResourceCollection> {
    const data: SideloadedData = await promise;
    const dm: SideloadedDataManager = new SideloadedDataManager(descriptor, data, this);
    return dm.getCollectionRoot();
  }

  private initializeMaxDocIdCache(): Promise<any> {
    return Promise.all(this.schema.map((schema) => this.setMaxDocId(schema)));
  }

  private async setMaxDocId(schema: TypeSchema): Promise<any> {
    const results = await this.db.allDocs({
      endkey: schema.singular,
      startkey: `${schema.singular}\ufff0`,
      limit: 1,
      descending: true
    });
    this.maxDocIdCache[schema.plural] = !results.rows.length ? 0 : this.parseDocID(results.rows[0].id).id;
    return true;
  }

  public getNextMaxDocId(type: string): number {
    if (this.maxDocIdCache[type] === undefined) {
      throw new Error(`type ${type} does not exist as key in cache.`);
    }
    return this.maxDocIdCache[type] = ++this.maxDocIdCache[type];
  }
}
