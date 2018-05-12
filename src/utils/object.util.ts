import _clone from 'fast-clone';
import _equal from 'fast-deep-equal';
export function objectClone(data) {
  // Naive way
  // return JSON.parse(JSON.stringify(data));
  return _clone(data);
}

export function objectEqual(thisData, thatData) {
  // Naive way
  // return JSON.stringify(thisData) === JSON.stringify(thatData);
  return _equal(thisData, thatData);
}

// TODO: We need to figure out how to do use this for PouchDB
// TODO: where we need to keep the _id and _rev at the very least
export function objectPatch(thisData, thatData) {
  return thatData; // naive way for now until we figure this out ;)
}
