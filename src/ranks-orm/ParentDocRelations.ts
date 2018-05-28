import {DataRelations} from "./DataRelations";
import {DocModel} from "./DocModel";

export class ParentDocRelations extends DataRelations {
  constructor() {
    super();
  }
  setBelongsTo(from: DocModel, relation: string, to: DocModel) {
    const { type, id } = from;
    super.set<DocModel>(type, id, relation, to);
  }
  setHasMany(from: DocModel, relation: string, to: Array<DocModel>) {
    const { type, id } = from;
    super.set(type, id, relation, to);

  }
  pushToBelongsTo(from: DocModel, relation: string, to: DocModel) {
    this.setBelongsTo(from, relation, to);
  }
  pushToHasMany(from: DocModel, relation: string, to: DocModel) {
    const models: Array<DocModel> = super.get<Array<DocModel>>(from.type, from.id, relation);
    const modelExists = models.find((model: DocModel) => model.id === to.id );
    if (!modelExists) {
      models.push(to);
      from.addToField(relation, to.id);
    }
  }
  shiftFromBelongsTo(from: DocModel, relation: string, to: DocModel) {
    const { type, id } = from;
    super.unset(type, id, relation);
  }
  shiftFromHasMany(from: DocModel, relation: string, to: DocModel) {
    const models: Array<DocModel> = super.get<Array<DocModel>>(from.type, from.id, relation);
    const modelIndex= models.findIndex((model: DocModel) => model.id === to.id );
    if (modelIndex !== -1) {
      models.splice(modelIndex, 1);
    }
    const idIndex = from.getField(relation).findIndex((id: number) => id === to.id);
    if (idIndex !== -1) { from.getField(relation).splice(idIndex, 1); }
  }
}
