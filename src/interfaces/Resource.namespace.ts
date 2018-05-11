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
}
