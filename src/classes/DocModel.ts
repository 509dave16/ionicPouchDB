import {objectClone, objectEqual} from "../utils/object.util";
import {RanksMediator} from "./RanksMediator";
import {RanksORM} from "../namespaces/RanksORM.namespace";
import RelationDescriptor = RanksORM.DocRelationDescriptor;
import TypeSchema = RanksORM.TypeSchema;
import SaveOptions = RanksORM.SaveOptions;
import t from 'tcomb';
import _ from 'lodash';
import ParsedDocId = RanksORM.ParsedDocId;
import DataDescriptor = RanksORM.DataDescriptor;

export class DocModel implements DataDescriptor {
  private doc: any;
  private originalDoc: any;
  public type: string;
  private mediator: RanksMediator;
  private typeSchema: TypeSchema;

  private relationDesc: RelationDescriptor;
  constructor(doc: any, type: string, mediator: RanksMediator) {
    this.errorOnInvalid();
    this.type = type;
    this.mediator = mediator;
    this.typeSchema = this.mediator.getTypeSchema(this.type);
    this.originalDoc = doc;
    this.doc = objectClone(doc);
  }

  setRelationDescriptor(relationDesc: RelationDescriptor) {
    this.relationDesc = relationDesc;
  }

  get[]

  get id(): number {
    return this.doc.id;
  }

  getDoc(): any {
    return this.doc;
  }

  setDoc(doc: any) {
    this.doc = doc;
  }

  refreshOriginalDoc() {
    this.originalDoc = objectClone(this.doc);
  }

  hasChanged(): boolean {
    return this.isNew() || !objectEqual(this.doc, this.originalDoc);
  }

  get(relation: string) {
    return this.mediator.getRelation(this, relation);
  }

  attach(relation: string, modelOrDoc: DocModel|any, inverseRelation?: string): DocModel {
    this.mediator.attachToRelation(this, relation, modelOrDoc, inverseRelation);
    return this;
  }

  detach(relation: string, modelOrId: DocModel|number, inverseRelation?: string): DocModel {
    this.mediator.detachFromRelation(this, relation, modelOrId, inverseRelation);
    return this;
  }

  getField(field: string): any {
    this.errorOnFieldNotExist(field);
    if (this.doc[field] === undefined) {
      return this.doc[field] = this.typeSchema.props[field].default();
    }
    return this.doc[field];
  }

  setField(field: string, value: any): DocModel {
    this.errorOnFieldNotExist(field);
    this.errorOnValueTypeConflict(field, value);
    this.doc[field] = value;
    return this;
  }

  addToField(field: string, value: any): DocModel {
    this.errorOnFieldNotExist(field);
    this.errorOnFieldNotArray(field);
    this.errorOnValueElementTypeConflict(field, value);
    const ara = this.getField(field) as any[];
    ara.push(value);
   return this;
  }

  errorOnFieldNotArray(field: string) {
    if (!this.fieldIsArray(field)) {
      throw new Error(`Field ${field} is not of type Array.`);
    }
  }

  errorOnFieldNotExist(field: string) {
    if (!this.hasField(field)) {
      throw new Error(`Field ${field} does not exist on type.`);
    }
  }

  errorOnValueTypeConflict(field, value) {
    this.typeSchema.props[field].type.is(value);
  }

  errorOnValueElementTypeConflict(field, value) {
    this.typeSchema.props[field].elementType.is(value);
  }

  errorOnInvalid() {
    if (!this.isValid()) {
      throw new Error('Doc is invalid');
    }
  }

  hasField(field: string): boolean {
    return this.typeSchema.props[field] !== undefined;
  }

  fieldIsArray(field: string): boolean {
    return this.typeSchema.props[field].type === t.Array;
  }

  invalidFieldValue(field: string, value: any): boolean|string {
    try {
      this.errorOnValueTypeConflict(field, value);
    } catch (e) {
      return e.message;
    }
    return false;
  }

  isValid(): boolean {
    return this.validate().length === 0;
  }

  validate(): string[] {
    const errors: string[] = [];
    for(const field in this.doc) {
      const value = this.doc[field];
      const reason = this.invalidFieldValue(field, value);
      if (reason !== false) {
        errors.push(reason as string);
      }
    }
    return errors;
  }

  isNew(): boolean {
    return this.doc['rev'] == undefined;
  }

  createDoc(): any {
    const isNewDoc: boolean = this.isNew();
    // 1. Don't change models data
    const clonedDoc: any = objectClone(this.doc);
    // 2. Make a relational pouch id
    const parsedDocID: ParsedDocId = { type: this.type, id: this.id};
    const rpId: string = this.mediator.db.makeDocID(parsedDocID);
    // 3. Remove unwanted id/rev in favor of Pouch/Couch spec of _sid/_rev
    const blacklistedKeys = ['_id'];
    clonedDoc._id = rpId;
    delete clonedDoc.id;
    if (!isNewDoc) {
      clonedDoc._rev = clonedDoc.rev;
      delete clonedDoc.rev;
      blacklistedKeys.push('_rev');
    }
    // 4. Make an object with _id, _rev, and data(which is everything but _id/_rev
    const formattedDoc = _.pick(clonedDoc, blacklistedKeys);
    formattedDoc.data = _.omit(clonedDoc, blacklistedKeys);
    return formattedDoc;
  }

  save(options: SaveOptions = { refetch: false, related: false, bulk: true }): Promise<any> {
    return this.mediator.save(options);
  }
}
