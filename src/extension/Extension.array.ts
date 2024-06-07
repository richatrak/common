/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */

import { AnyType, Keys, TypedRecords } from "./Extension.full";


export { };

declare global {
  interface Array<T> {
    /**
     * Get shuffled array
     * @returns new shuffled array
     */
    shuffle: () => Array<T>;

    /**
     * Get array that all the elements are unique
     * @return new element-unique array
     */
    unique: () => Array<T>;

    /**
     * Get common elements of other array
     * @param referenceArray The reference array to compare with
     * @return new array which contains the common elements
     */
    getIntersection: (referenceArray: Array<T>) => Array<T>;

    /**
     * Get the maximum item in the array according to a comparison function
     * @param comparisonFunction The function used to determine max value
     * @return the defined max item
     */
    maxBy: (comparisonFunction: (a: T, b: T) => number, ...objectList: T[]) => T;

    /**
     * Split array into chunks of a specified size
     * @param size The size of each chunk
     * @returns An array of chunked arrays
     */
    split: (size: number) => Array<Array<T>>;

    /**
     * Convert the array to a dictionary object
     * @param keyFieldName - the name of the field to use as the key
     * @param valueFieldName - the name of the field to use as the value
     * @returns a new dictionary object
     */
    toTypedRecords: (keyFieldName: string, valueFieldName?: Keys<T>) => TypedRecords<T | AnyType>;
  }
}

Array.prototype.shuffle = function <T>(): Array<T> {
  for (let i = this.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this[i], this[j]] = [this[j], this[i]];
  }
  return this;
};

Array.prototype.unique = function <T>(): Array<T> {
  return this.filter((element: T, index: number, array: Array<T>) => index === array.indexOf(element));
};

Array.prototype.getIntersection = function <T>(referenceArray: Array<T>): Array<T> {
  return this.filter((element: T) => referenceArray.indexOf(element) !== -1);
};

Array.prototype.maxBy = function <T>(comparisonFunction: (a: T, b: T) => number): T {
  let maxObject: T = this[0] ?? null;
  for (let i = 1; i < this.length; i++) {
    if (comparisonFunction(this[i], maxObject) > 0) {
      maxObject = this[i];
    }
  }
  return maxObject;
};

Array.prototype.split = function <T>(size: number): Array<Array<T>> {
  size = Math.max(1, size ?? 0);
  const chunkList = [];
  for (let i = 0; i < this.length; i += size) {
    chunkList.push(this.slice(i, i + size));
  }
  return chunkList;
};


Array.prototype.toTypedRecords = function<T> (keyFieldName: string, valueFieldName?: Keys<T>): TypedRecords<T | T[Keys<T>]> {

  return this.reduce((currentRecord: Record<string | number, AnyType>, currentValue: AnyType) => {
    const fieldName =
    keyFieldName ?? ('string' === typeof currentValue || 'number' === typeof currentValue ? currentValue : null);
    if (null === fieldName) {
      throw new Error('Cannot figure out fieldName for dictionary conversion');
    }
    currentRecord[fieldName] = null === valueFieldName ? currentValue : currentValue[<string>valueFieldName];
    return currentRecord;
  }, {});
};