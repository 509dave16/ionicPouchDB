import {ResourceQuery} from "../classes/Database";
import {ResourceModel} from "../classes/ResourceModel";

export namespace Resource {
  export interface SideloadedData {
    [resourceName: string]: ResourceModel[];
  }

  export interface RootResourceDescriptor {
    ids: number[];
    type: string;
    plurality: 'model' | 'collection';
    query: ResourceQuery;
  }

  export interface RelationDescriptor {
    relationType: string;
    relationResourceType: string;
    relationName: string;
    parent: ResourceModel;
    parentResourceType: string;
  }

  export interface Relations {
    [relationName: string] : { hasMany?: string, belongsTo?: string }
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

  export interface ParsedDocId {
    type: string;
    id: number
  }

  export interface MaxDocIdCache {
    [typeKey: string] : number;
  }

  export interface FindOptions {
    startKey?: number,
    endKey?: number,
    limit?: number,
    skip?: boolean,
  }

  export interface SaveOptions {
    refetch?: boolean;
    related?: boolean;
  }

  export interface RelationalDatabase extends PouchDB.Database {
    setSchema?(schema: any);
    rel?: any;
    schema?: any;
  }
}
