namespace Resource {
  export interface RelationalData {
    [resourceName: string]: any[];
  }

  export interface TypeSchema {
    singular: string;
    plural: string;
    relations?: {
      [relationKey: string] : {
        hasMany?: string;
        belongsTo?: string;
      };
    }
  }

  export interface FindOptions {
    startKey?: number,
    endKey?: number,
    limit?: number,
    skip?: boolean,
  }

  export interface RelationalDatabase extends PouchDB.Database {
    setSchema?(schema: any);
    rel?: any;
    schema?: any;
  }
}
