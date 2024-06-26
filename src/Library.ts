/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */

import './extension/Extension.full';
import { AnyType, FreeRecords, Keys, OrNull, TypedRecords } from './extension/Extension.full';
import './HttpHelper';

export * as EventLog from './EventLog';
export * as File from './File';
export * as JSONEx from './JSONEx';
export * as Logger from './Logger';
export * as Mail from './Mail';
export * as MongoDB from './MongoDB';
export * as Security from './Security';


/**
 * Converts a dictionary of key-value pairs into a URL query string.
 *
 * @param data - An object containing key-value pairs to be converted.
 *               If the value is an object, it will be stringified.
 * @returns The resulting URL query string.
 */
export function buildQueryString (dictionary: OrNull<FreeRecords>): string {

  if ( null === dictionary ) { return ''; }

  const params = new URLSearchParams();
  for (const [fieldName, fieldValue] of Object.entries(dictionary)) {
    switch (typeof fieldValue) {
      case 'object':
        params.append ( fieldName, JSON.stringify(fieldValue) );
        break;
      default:
        params.append ( fieldName, String(fieldValue));
    }
  }
  return params.toString();
}



/**
 * Returns a new object with only the specified fields from the original object.
 *
 * @param obj - The original object to extract fields from.
 * @param fieldList - The list of field names to include in the new object.
 * @returns A new object with only the specified fields from the original object.
 */
export function extractFields<T>(obj: OrNull<T>, extractFieldList: OrNull<string[]> = null, excludeFieldList: OrNull<string[]> = null): OrNull<Partial<T>> {

  if ( !obj || 'object' !== typeof obj ) {
    return obj;
  }

  const extractedObj = {} as Partial<T>;
  for ( const fieldName of extractFieldList ?? Object.keys(obj)) {
    if ( fieldName in obj ) {
      extractedObj[fieldName as Keys<typeof obj>] = obj[fieldName as Keys<typeof obj>] ;
    }
  }

  const excludeObj = {} as Partial<typeof extractedObj>;
  for ( const fieldName of Object.keys (extractedObj) as Array<Keys<typeof extractedObj>>) {
    if ( ! excludeFieldList?.includes(fieldName as string) ) {
      excludeObj[fieldName] = extractedObj[fieldName];
    }
  }
  return excludeObj;
}



/**
 * Returns a new object with all fields except the specified ones from the original object.
 *
 * @param obj - The original object to exclude fields from.
 * @param fieldList - The list of field names to exclude from the new object.
 * @returns A new object with all fields except the specified ones from the original object.
 */
export function excludeFields<T>(obj: T, excludeFieldList: string[]): OrNull<Partial<T>> {
  return extractFields<T> (obj , null , excludeFieldList);
}

/**
 * Extracts values from a dictionary based on a list of accepted and ignored keys and returns them as an array.
 *
 * @param dic - The dictionary object to extract values from.
 * @param acceptedKeyList - The list of keys to include in the extracted values.
 * @param ignoreKeyList - The list of keys to exclude from the extracted values.
 * @returns An array of values from the dictionary.
 */
export function extractValues<T>(dic: TypedRecords<T>, acceptedKeyList?: string[], ignoreKeyList?: string[]): T[] {
  const extractedObject = extractFields ( dic, acceptedKeyList, ignoreKeyList ) ;
  return Object.values ( extractedObject ?? {} as Partial<T>);
}



/**
 * Get the first matching field name from a list of candidates.
 * @param candidateList A list of field name candidates to search for.
 * @param data The data object to search for the field names.
 * @returns The first matching field name or null if no matches are found.
 */
export function getCandidateFieldName(candidateList: string[], data: TypedRecords<unknown>): OrNull<string> {

  if (data) {
    for (const candidate of candidateList ?? []) {
      if (candidate in data) {
        return candidate ;
      }
    }
  }
  return null;
}



/**
 * Extend the properties of an object with properties from one or more additional objects.
 * @param obj The object to extend.
 * @param objList Additional objects to extend the base object with.
 * @returns The extended object.
 */

export function extend(obj: object, ...objList: AnyType[]): AnyType {
  return objList.reduce((accObj, curObj) => {
    return deepMerge(accObj, curObj);
  }, { ...obj });
}

/**
 * Deeply merges two objects together, with the properties in the second object overwriting properties with the same name in the first object.
 * @param a The object to merge into.
 * @param b The object to merge from.
 * @returns The merged object.
 */

export function deepMerge(a: AnyType, b: AnyType): AnyType {
  if (undefined === a) {
    return b;
  }
  if (undefined === b) {
    return a;
  }

  const objA = JSON.parse(JSON.stringify(a));
  const objB = JSON.parse(JSON.stringify(b));

  if ('object' === typeof objA) {
    if ('object' === typeof objB) {
      const keyAList = Object.keys(objA);
      Object.keys(objB).forEach((keyB) => {
        if ( keyAList.includes(keyB)) {
          objA[keyB] = objB[keyB];
        } else {
          objA[keyB] = deepMerge(objA[keyB], objB[keyB]);
        }
      });
      return objA;
    } else {
      return objB;
    }
  }

  return b;
}

/**
 * Checks if a value is null-like (null or undefined).
 * @param value The value to check.
 * @returns True if the value is null or undefined, false otherwise.
 */
export function isNullLike(value: AnyType): boolean {
  return ( null === value ) || ( undefined === value ) ;
}

/**
 * Determines if two values are deeply equal.
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 * @param ignoreObjectKeyIndicator - A string that if any key of the objects starts with it, it will be ignored in the comparison.
 * @returns Whether the values are equal.
 */

export function isDataEqual(a: AnyType, b: AnyType, ignoreObjectKeyIndicator: OrNull<string> = null): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }


  if ('object' === typeof a) {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) {
        return false;
      } else {
        for (let i = 0; i < a.length; i++) {
          if (!isDataEqual(a[i], b[i], ignoreObjectKeyIndicator)) {
            return false;
          }
        }
        return true;
      }
    } else {
      let aFieldNameList: string[] = Object.keys(a ?? {}).sort();
      let bFieldNameList: string[] = Object.keys(b ?? {}).sort();

      if ( ! isNullLike ( ignoreObjectKeyIndicator ) ) {
        // Dump all fields with ignoreObjectKeyIndicator: if there is a field with ignoreObjectKeyIndicator in any of the lists, then ignore it (in normal form) from both list
        const ignoreFieldNameList: string[] = aFieldNameList.filter((fieldName) => fieldName.startsWith(ignoreObjectKeyIndicator!)).concat(bFieldNameList.filter((fieldName) => fieldName.startsWith(ignoreObjectKeyIndicator!))).unique();

        // Make dictionary for the pattern and real field name
        const ignoreFieldNameDic = ignoreFieldNameList.reduce((ignoreFieldNameDic, ignoreFieldName) => {
          const realFieldName = ignoreFieldName.explode(ignoreObjectKeyIndicator!).pop();

          if (realFieldName) {
            ignoreFieldNameDic[realFieldName] = realFieldName;
          }
          ignoreFieldNameDic[ignoreFieldName] = ignoreFieldName;
          return ignoreFieldNameDic;
        }, {} as TypedRecords<string>);

        aFieldNameList = aFieldNameList.filter((fieldName) => null === ignoreFieldNameDic[fieldName]);
        bFieldNameList = bFieldNameList.filter((fieldName) => null === ignoreFieldNameDic[fieldName]);
      }

      if (aFieldNameList.length !== bFieldNameList.length) {
        return false;
      }
      if (JSON.stringify(aFieldNameList) !== JSON.stringify(bFieldNameList)) {
        return false;
      }

      for (const fieldName in aFieldNameList) {
        if (!isDataEqual(a[fieldName], b[fieldName], ignoreObjectKeyIndicator)) {
          return false;
        }
      }
      return true;
    }
  }

  return a === b;
}


export { };

