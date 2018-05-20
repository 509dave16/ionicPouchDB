import PouchDB from 'pouchdb';
import TypeSchema = Resource.TypeSchema;
import RelationalDatabase = Resource.RelationalDatabase;
import FindOptions = Resource.FindOptions;
import {SideloadedDataManager} from "./SideloadedDataManager";
import {Resource} from "../namespaces/Resource.namespace";
import SideloadedData = Resource.SideloadedData;
import RootResourceDescriptor = Resource.RootResourceDescriptor;

export interface ResourceQuery {
  (): Promise<SideloadedDataManager>;
}

export class Database {
  private schema: TypeSchema[];
  private db: RelationalDatabase;

  constructor(schema: TypeSchema[], localName: string = 'relational-db', remoteName: string = '') {
    this.schema = schema;
    this.db = new PouchDB(localName);
    this.db.setSchema(schema);
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

  save(type: string, object: any): Promise<SideloadedDataManager> {
    const query: ResourceQuery = () => this.findById(type, object.id);
    const descriptor: RootResourceDescriptor = { type, ids: null, plurality: 'collection', query};
    return this.wrapWithDataManager(descriptor, this.db.rel.save(type, object));
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

  parseDocID(docID: number): string {
    return this.db.rel.parseDocID(docID);
  }

  makeDocID(docID: number): string {
    return this.db.rel.makeDocID(docID);
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

  private async wrapWithDataManager(rootResoureDescriptor: RootResourceDescriptor, promise): Promise<SideloadedDataManager>
  {
    const data: SideloadedData = await promise;
    return new SideloadedDataManager(rootResoureDescriptor, data, this);
  }
}
