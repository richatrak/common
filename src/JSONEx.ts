/* Copyright (C) 2019 by IAdea Corporation, All Rights Reserved. */

import { AnyType, FreeRecords, TypedRecords, isNullLike } from "./extension/Extension.type";




/**
 * Recursively normalize the keys in a JSON object by converting any keys with '.' to nested objects.
 * @param obj The input JSON object to normalize.
 * @param debug Flag to enable debug logging.
 * @returns A new JSON object with normalized keys.
 */
export function getNormalizeKeyedObject (obj: object, debug = false): AnyType {

  if (null === obj || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((v) => getNormalizeKeyedObject(v, debug));
  }


  const jsonObject: FreeRecords = { ...obj };
  Object.keys(jsonObject).forEach((fullKeyName) => {
    if (-1 !== fullKeyName.indexOf('.')) {

      const keyNameList = fullKeyName.split('.');
      const lastKeyName = keyNameList.pop() as string;

      let curObj = jsonObject;
      keyNameList.forEach((keyName) => {
        if ( isNullLike ( curObj[keyName] ) ) {
          curObj[keyName] = {};
        }
        curObj = curObj[keyName];
      });

      curObj[lastKeyName] = getNormalizeKeyedObject(jsonObject[fullKeyName], debug);
      delete jsonObject[fullKeyName];
    } else {
      jsonObject[fullKeyName] = getNormalizeKeyedObject(jsonObject[fullKeyName], debug);
    }
  });

  return jsonObject;
}

/**
 * Recursively get the value of an object's property at a specified path.
 * @param obj The input object to get the value from.
 * @param valuePath The path to the value to retrieve.
 * @param debugMode Flag to enable debug logging.
 * @returns The value at the specified path or null if the path does not exist.
 */
export function getValueByJSONPath(obj: TypedRecords<unknown>, valuePath: string, debugMode = false): AnyType {
  if (debugMode) {
    console.debug(`[getValueByPath] ${valuePath}`, obj);
  }
  const [pathHead, pathTail] = (valuePath ?? '').trim().explode('.', 2); // eslint-disable-line no-magic-numbers

  const nObj = getNormalizeKeyedObject(obj);
  if (!pathHead) {
    return nObj;
  }

  if (nObj && pathHead in nObj) {
    const subObj = nObj[pathHead];

    if (!pathTail) {
      return subObj;
    } else if ( ! isNullLike ( subObj ) ) {
      return getValueByJSONPath(subObj, pathTail, debugMode);
    }
  }

  return null;
}

