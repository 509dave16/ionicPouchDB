import {DataRelations} from "../classes/DataRelations";
import {DocModel} from "../classes/DocModel";

export namespace DataRelationsNamespace {
  export interface DataRelationsConstructor {
    new (): DataRelations;
  }

  export interface DataDescriptor {
    id: number;
    type: string;

  }

  export interface DataRelationDescriptor {
    relationType: string;
    relationToType: string;
    relationName: string;
    from: DataDescriptor;
  }
}
