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
import {ResourceModel} from "./ResourceModel";
import {ResourceCollection} from "./ResourceCollection";

export interface ResourceQuery {
  (): Promise<ResourceModel|ResourceCollection>;
}

export class Database {
  private schema: TypeSchema[];
  private db: RelationalDatabase;
  private maxDocIdCache: MaxDocIdCache = {};

  constructor(schema: TypeSchema[], localName: string = 'relational-db', remoteName: string = '') {
    this.init(schema, localName, remoteName);
  }

  async init (schema: TypeSchema[], localName: string, remoteName: string) {
    this.schema = schema;
    this.db = new PouchDB(localName);
    this.db.setSchema(schema);
    await this.initializeMaxDocIdCache();
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

  setSchema(schema: TypeSchema[]): void {
    this.schema = schema;
    this.db.setSchema(schema);
  }

  getSchema() {
    return this.schema;
  }

  private async wrapWithResourceModel(descriptor: RootResourceDescriptor, promise: Promise<any>): Promise<ResourceModel> {
    const data: SideloadedData = await promise;
    const dm: SideloadedDataManager = await new SideloadedDataManager(descriptor, data, this);
    return dm.getModelRoot();
  }

  private async wrapWithResourceCollection(descriptor: RootResourceDescriptor, promise: Promise<any>): Promise<ResourceCollection> {
    const data: SideloadedData = await promise;
    const dm: SideloadedDataManager = await new SideloadedDataManager(descriptor, data, this);
    return dm.getCollectionRoot();
  }

  private async initializeMaxDocIdCache(): Promise<any> {
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
    return true;
  }

  private getNextMaxDocId(type: string): number {
    if (this.maxDocIdCache[type] === undefined) {
      throw new Error(`type ${type} does not exist as key in cache.`);
    }
    return this.maxDocIdCache[type] = ++this.maxDocIdCache[type];
  }
}
