/* Copyright (C) 2019 by IAdea Corporation, All Rights Reserved. */



/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyType = any ;

export type SimpleFunction = (...args: AnyType[]) => void ;
export type TypedFunction<T> = (arg: T) => void;

export type OrNull<T> = T | null;
export type OrNullCallback = OrNull<SimpleFunction>;
export type OneOrMany<T> = T | T[];
export type OneOrManyOrNull<T> = OrNull<OneOrMany<T>>;
export type Keys<T> = keyof T;
export type Values<T> = T[Keys<T>];
export type PickObj<T, U extends Keys<T>> = T[U];
export type PrimitiveType = string | number | boolean | null | undefined;
export type TypedRecords<T> = Record<string,T>
export type FreeRecords = TypedRecords<AnyType> ;
export type NestedRecords<T> = TypedRecords<T | TypedRecords<T>>;

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

