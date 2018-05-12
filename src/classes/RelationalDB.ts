import PouchDB from 'pouchdb';
import {ResourceCollection} from "./ResourceCollection";
import {ResourceModel} from "./ResourceModel";
import TypeSchema = Resource.TypeSchema;
import RelationalDatabase = Resource.RelationalDatabase;
import FindOptions = Resource.FindOptions;

export interface ResourceQuery {
  (): Promise<ResourceCollection|ResourceModel>;
}

export class RelationalDB {

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

  save(type: string, object: any): Promise<ResourceModel> {
    return this.wrapWithModel(
      type,
      [object.id],
      this.db.rel.save(type, object),
      () => this.findById(type, object.id)
    );
  }

  findAll(type: string): Promise<ResourceCollection> {
    return this.wrapWithCollection(
      type,
      null,
      this.db.rel.find(type),
      () => this.db.rel.find(type)
    );
  }

  findById(type: string, id: number): Promise<ResourceModel> {
    return this.wrapWithModel(
      type,
      [id],
      this.db.rel.find(type, id),
      () => this.db.rel.find(type, id)
    );
  }

  findByIds(type: string, ids: number[]): Promise<ResourceCollection> {
    return this.wrapWithCollection(
      type,
      ids,
      this.db.rel.find(type, ids),
      () => this.db.rel.find(type, ids)
    );
  }
  // Update this later if we need to include options in the query object
  findByOptions(type: string, options: FindOptions): Promise<ResourceCollection> {
    return this.wrapWithCollection(
      type,
      null,
      this.db.rel.find(type, options),
      () => this.db.rel.find(type, options)
    );
  }
  findHasMany(type: string, belongsToKey: string, belongsToId: number): Promise<ResourceCollection> {
    return this.wrapWithCollection(
      type,
      null,
      this.db.rel.findHasMany(type, belongsToKey, belongsToId),
      () => this.db.rel.findHasMany(type, belongsToKey, belongsToId)
    );
  }
  delete(type: any, object: any): Promise<any> {
    return this.db.rel.del(type, object);
  }

  isDeleted(type: any, id: number): Promise<any> {
    return this.db.rel(type, id);
  }

  getAttachment(type: string, id: number, attachmentId: string): Promise<Blob> {
    return this.db.rel.getAttachment(type, id, attachmentId)
  }

  putAttachment(type: string, object: any, attachmentId: string, attachment: any, attachmentType: string): Promise<ResourceModel> {
    return this.wrapWithModel(
      type,
      [object.id],
      this.db.rel.putAttachment(type, object, attachmentId, attachment, attachmentType),
      () => this.db.rel.find(type, object.id)
    );
  }

  removeAttachment(type: string, object: any, attachmentId: string): Promise<ResourceModel> {
    return this.wrapWithModel(
      type,
      [object.id],
      this.db.rel.removeAttachment(type, object, attachmentId),
      () => this.findById(type, object.id)
    );
  }

  parseDocID(docID: number): string {
    return this.db.rel.parseDocID(docID);
  }

  makeDocID(docID: number): string {
    return this.db.rel.makeDocID(docID);
  }

  parseRelDocs(type: string, ids: number[], pouchDocs: any, query: ResourceQuery): any {
    return new ResourceCollection(type, query, this.db.rel.parseRelDocs(type, pouchDocs), ids, this.schema, this);
  }

  setSchema(schema: any): void {
    this.db.setSchema(schema);
  }

  private wrapWithCollection(type: string, ids: number[], promise, query: ResourceQuery): Promise<ResourceCollection>
  {
    return promise.then((data) => {
      return new ResourceCollection(type, query, data,ids || [], this.schema, this);
    });
  }

  private wrapWithModel(type: string, ids: number[], promise: Promise<any>, query: ResourceQuery): Promise<ResourceModel> {
    return promise.then((data) => {
      return new ResourceCollection(type, query, data, ids, this.schema, this).first();
    });
  }

}
