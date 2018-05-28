import {DocModel} from "./DocModel";
import t from 'tcomb';
import {DocCollection} from "./DocCollection";
import {DataRelations} from "./DataRelations";
import {DataRelationsNamespace} from "./DataRelations.namespace";

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

  export interface DocQuery {
    (): Promise<DocModel|DocCollection>;
  }

  export interface RootDocDescriptor {
    ids: number[];
    type: string;
    plurality: 'model' | 'collection';
    query: DocQuery;
  }

  export interface DocRelationDescriptor extends DataRelationsNamespace.DataRelationDescriptor {
    relationType: string;
    relationToType: string;
    relationName: string;
    from: DocModel;
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