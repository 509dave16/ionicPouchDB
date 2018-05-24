import {ResourceQuery} from "../classes/Database";
import {ResourceModel} from "../classes/ResourceModel";
import t from 'tcomb';

export namespace SideORM {
  export interface SideloadedData {
    [type: string]: any[];
  }

  export interface ISideloadedModelData {
    [type: string]: ResourceModel[];
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

  export interface Properties {
    [propName: string] : { type: t.Type<any>, elementType?: t.Type<any>, default: any };
  }

  export interface TypeSchema {
    singular: string;
    plural: string;
    relations?: Relations;
    props: {

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
    bulk?: boolean;
  }

  export interface RelationalDatabase extends PouchDB.Database {
    setSchema?(schema: any);
    rel?: any;
    schema?: any;
  }
}
