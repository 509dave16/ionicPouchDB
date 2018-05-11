import PouchDB from 'pouchdb';
import Database = PouchDB.Database;
import {ResourceCollection} from "./ResourceCollection";
import {ResourceModel} from "./ResourceModel";
import TypeSchema = Resource.TypeSchema;
import ResourceQuery = Resource.ResourceQuery;
import FindOptions = Resource.FindOptions;
interface RelationalPouch extends Database {
  setSchema?(schema: any);
  rel?: any;
}

export class RelationalDB {
  private schema: TypeSchema[];
  private db: RelationalPouch;

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
    return this.wrapWithModel(this.db.rel.save(type, object), {
      type,
      ids: [object.id],
    });
  }

  findAll(type: string): Promise<ResourceCollection> {
    return this.wrapWithCollection(this.db.rel.find(type), { type });
  }

  findById(type: string, id: number): Promise<ResourceModel> {
    return this.wrapWithModel(this.db.rel.find(type, id), {
      type,
      ids: [id],
    });
  }

  findByIds(type: string, ids: number[]): Promise<ResourceCollection> {
    return this.wrapWithCollection(this.db.rel.find(type, ids), {
      type,
      ids,
    });
  }
  // Update this later if we need to include options in the query object
  findByOptions(type: string, options: FindOptions): Promise<ResourceCollection> {
    return this.wrapWithCollection(this.db.rel.find(type, options), {
      type,
      options
    });
  }
  findHasMany(type: string, belongsToKey: string, belongsToId: number): Promise<ResourceCollection> {
    return this.wrapWithCollection(this.db.rel.findHasMany(type, belongsToKey, belongsToId), {
      type,
      belongsToId,
      belongsToKey
    });
  }

  delete(type: any, object: any): Promise<any> {
    return this.db.rel.del(type, object);
  }

  isDeleted(type: any, id: number): Promise<any> {
    return this.db.rel(type, id);
  }

  putAttachment(type: string, object: any, attachmentId: string, attachment: any, attachmentType: string): Promise<ResourceModel> {
    return this.wrapWithModel(this.db.rel.putAttachment(type, object, attachmentId, attachment, attachmentType), {
      type,
      ids: [object.id],
      attachmentId,
    });
  }
  getAttachment(type: string, id: number, attachmentId: string) {
    return this.wrapWithModel(this.db.rel.getAttachment(type, id, attachmentId), {
      type,
      ids: [id],
      attachmentId,
    });
  }

  removeAttachment(type: string, object: any, attachmentId: string): Promise<ResourceModel> {
    return this.wrapWithModel(this.db.rel.removeAttachment(type, object, attachmentId), {
      type,
      ids: [object.id],
      attachmentId
    });
  }

  parseDocID(docID: number): string {
    return this.db.rel.parseDocID(docID);
  }

  makeDocID(docID: number): string {
    return this.db.rel.makeDocID(docID);
  }

  parseRelDocs(type: string, pouchDocs: any, query: ResourceQuery): any {
    return new ResourceCollection(type, this.schema, query, this.db.rel.parseRelDocs(type, pouchDocs));
  }

  setSchema(schema: any): void {
    this.db.setSchema(schema);
  }


  private wrapWithCollection(promise, query: ResourceQuery): Promise<ResourceCollection>
  {
    return promise.then((data) => {
      return new ResourceCollection(query.type, this.schema, query, data, query.ids || []);
    })
  }

  private wrapWithModel(promise: Promise<any>, query: ResourceQuery): Promise<ResourceModel> {
    return promise.then((data) => {
      return new ResourceCollection(query.type, this.schema, query, data, query.ids).first()
    })
  }

}
