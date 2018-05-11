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
  export interface ResourceQuery {
    ids?: number[];
    attachmentId?: string;
    options?: FindOptions;
    belongsToKey?: string;
    belongsToId?: number;
    type: string;
  }

  export interface FindOptions {
    startKey?: number,
    endKey?: number,
    limit?: number,
    skip?: boolean,
  }
}
