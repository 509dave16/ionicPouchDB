import {DocModel} from "../classes/DocModel";
import t from 'tcomb';
import {DocCollection} from "../classes/DocCollection";
import {DataRelations} from "../classes/DataRelations";

export namespace RanksORM {
  export interface SideloadedData {
    [type: string]: any[];
  }

  export interface ISideloadedRankModels {
    [type: string]: DocModel[];
  }

  export interface DataRelationsConstructor {
    new (): DataRelations;
  }

  export interface DataDescriptor {
    id: number;
    type: string;
  }

  export interface DataDescriptorCollection {

  }

  export interface DocQuery {
    (): Promise<DocModel|DocCollection>;
  }

  export interface RootDocDescriptor {
    ids: number[];
    type: string;
    plurality: 'model' | 'collection';
    query: DocQuery;
  }

  export interface RelationDescriptor {
    relationType: string;
    relationDocType: string;
    relationName: string;
    parent: DocModel;
    parentDocType: string;
  }

  export interface Relations {
    [relationName: string] : { hasMany?: string, belongsTo?: string }
  }

  export interface Properties {
    [propName: string] : { type: t.Type<any>, elementType?: t.Type<any>, default: Function };
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
