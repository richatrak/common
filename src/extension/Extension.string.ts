/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */

import { base32, base64 } from 'rfc4648';
import { AnyType, OrNull, TypedRecords } from './Extension.type';

export { };

declare global {
  interface String {

    // ----- Padding -----
    /**
     * Returns a new string containing the original string repeated a specified number of times.
     * @param times - the number of times to repeat the string
     * @returns a new string containing the repeated string
     */
    repeatString: (times: number) => string;

    /**
     * Returns a new string containing the original string repeated a specified number of times.
     * @param length - the number of times to repeat the string
     * @returns a new string containing the repeated string
     */
    padLeft:      (length: number, paddingString?: string) => string;

    /**
     * Pads the string on the right side with a specified character or string until it reaches the specified length.
     * @param length - the desired length of the string after padding
     * @param paddingString - the character or string to use for padding (defaults to " ")
     * @returns a new string padded on the right side
     */
    padRight:     (length: number, paddingString?: string) => string;



    // ----- Encoding -----
    /**
     * Encodes the string as a base64 string.
     * @param removePadding - whether or not to remove padding from the resulting string (defaults to false)
     * @returns the base64-encoded string
     */
    encodeBase64:         (removePadding?: boolean) => string;

    /**
     * Decodes the base64-encoded string into a Uint8Array.
     * @returns the decoded bytes
     */
    decodeBase64:         () => Uint8Array;

    /**
     * Decodes the base64-encoded string into a regular string.
     * @returns the decoded string
     */
    decodeBase64ToString: () => string;

    /**
     * Encodes the string as a base32 string.
     * @param removePadding - whether or not to remove padding from the resulting string (defaults to false)
     * @returns the base32-encoded string
     */
    encodeBase32:         (removePadding?: boolean) => string;

    /**
     * Decodes the base32-encoded string into a Uint8Array.
     * @returns the decoded bytes
     */
    decodeBase32:         () => Uint8Array;


    // ----- Others -----
    /**
     * Escapes all special characters in the string so that it can be used as a regular expression.
     * @returns the escaped string
     */
    escapeRegExp:   () => string;

    /**
     * Returns a new string with the first character converted to uppercase.
     * @returns the new string
     */
    upperCaseFirst: () => string;

    /**
     * Returns a new string with the first character converted to uppercase.
     * @returns the new string
     */
    lowerCaseFirst: () => string;

    /**
     * Check if the string matches email format
     * @returns true if the string is a valid email address, false otherwise
     */
    isValidEmailAddress: () => boolean;

    /**
     * Check if the string matches JSON format.
     * @returns true if the string is a valid JSON string, false otherwise
     */
    isJSONString: () => boolean;
    jsonParse: <T>(elseObj: AnyType) => T | typeof elseObj;


    /**
     * Replace substrings in the string using a dictionary
     *
     * @param dictionary - the dictionary for replacement
     * @param leftPattern - the start indicator of a replace target
     * @param rightPattern - the end indicator of a replace target
     * @returns the replaced string
     */
    dictionaryReplace: (
      dictionary: TypedRecords<string> | null,
      leftPattern?: string,
      rightPattern?: string
    ) => string;

    /**
     * Split the string into an array using the given separator
     *
     * @param separator - the separator to split the string
     * @param limit - the maximum number of items to return
     * @returns an array of strings
     */
    explode: (separator: string, limit?: number) => string[];


    // ----- Tag -----
    /**
     * Split a tag string into an array with the specified format
     *
     * @param left - the left tag indicator, default: '['
     * @param right - the right tag indicator, default: ']'
     * @param replaceChar - for specific condition, special replace character will be used
     * @returns an array of tag strings
     */
    getTagArray: (left?: string, right?: string, replaceChar?: string) => string[];


    /**
     * Convert a tag string or an array of tags into an array of key-value pairs
     *
     * @param separator - the separator between category and value. default: ':'
     * @param options - options to convert input string to tags array
     * @returns an array of key-value tuples
     */
    getDetailedTagArray: (separator?: string, options?: TypedRecords<string>) => Array<{ key: string; value: string }>;


    /**
     * Convert a tag string or an array of tags into an object with the tags grouped by category
     *
     * @param separator - the separator between category and value. default: ':'
     * @param options - options to convert input string to tags array
     * @returns an object where the keys are the category names and the values are arrays of tag values
     */
    getDetailedAggregatedTagDictionary: ( separator?: string, options?: TypedRecords<string> ) => Record<string, string[]>;

    /**
     * Convert a tag string or an array of tags into a dictionary with the tags as key-value pairs
     *
     * @param options - options to convert input string to tags array
     * @returns an object where the keys are the tag names and the values are the tag values
     */
    getTagDictionary: (options?: TypedRecords<string>) => Record<string, string>;

    versionCompare: ( comparingString: string) => 0 | 1 | -1 ;
  }
}


String.prototype.repeatString = function (times: number): string {
  if ( this.repeat ) {
    return this.repeat (times ) ;
  }

  switch  ( times )
  {
    case 0:
      return '';
    case 1:
      return String(this);
    default:
      return this.concat(String(this)).repeatString(Math.floor(times / 2)).concat(this.repeatString(times % 2)); // eslint-disable-line no-magic-numbers
  }
};


String.prototype.padLeft = function (length: number, paddingString = ' '): string {
  const targetPaddingString = paddingString ? ( paddingString.length ? paddingString : ' ' ) : ' ' ;
  const requiredPaddingTimes = Math.ceil ( ( length - this.length ) / targetPaddingString.length ) ;
  const fullPaddingString = targetPaddingString.repeat ( requiredPaddingTimes );
  return fullPaddingString.substring ( 0 , length - this.length ) + String(this) ;
};

String.prototype.padRight = function (length: number, paddingString = ' '): string {
  const targetPaddingString = paddingString ? (paddingString.length ? paddingString : ' ') : ' ' ;
  const requiredPaddingTimes = Math.ceil ( ( length - this.length ) / targetPaddingString.length ) ;
  const fullPaddingString = targetPaddingString.repeat ( requiredPaddingTimes );
  return String(this) + fullPaddingString.substring(0, length - this.length) ;
};


String.prototype.encodeBase64 = function (removePadding = false): string {
  return base64.stringify(new TextEncoder().encode(String(this)), { pad: !removePadding });
};

String.prototype.decodeBase64 = function (): Uint8Array {
  return base64.parse(String(this), { loose: true });
};
String.prototype.decodeBase64ToString = function (): string {
  return new TextDecoder().decode(base64.parse(String(this), { loose: true }));
};

String.prototype.encodeBase32 = function (removePadding = false): string {
  return base32.stringify(new TextEncoder().encode(String(this)), { pad: !removePadding });
};

String.prototype.decodeBase32 = function (): Uint8Array {
  return base32.parse(String(this), { loose: true });
};

String.prototype.escapeRegExp = function (): string {
  return String(this).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

String.prototype.upperCaseFirst = function (): string {
  return String(this).charAt(0).toUpperCase() + String(this).slice(1);
};

String.prototype.lowerCaseFirst = function (): string {
  return String(this).charAt(0).toLowerCase() + String(this).slice(1);
};

String.prototype.isValidEmailAddress = function (): boolean {
  const namePattern = /[a-zA-Z0-9_\-.]+/;
  const domainPattern = /[a-zA-Z0-9_\-.]+(\.[a-zA-Z0-9_-]+)+/;

  const [account, domain] = String(this).explode('@', 2); // eslint-disable-line no-magic-numbers
  if (!namePattern.test(account)) {
    return false;
  }
  if (!domainPattern.test(domain)) {
    return false;
  }

  return true;
};

String.prototype.isJSONString = function (): boolean {
  try {
    JSON.parse(String(this));
  } catch (e) {
    return false;
  }
  return true;
};

String.prototype.jsonParse = function <T>(elseObj: AnyType): T | typeof elseObj {
  if (this.isJSONString()) {
    return JSON.parse(String(this)) as T;
  }
  return elseObj;
};

String.prototype.dictionaryReplace = function ( dictionary: OrNull<TypedRecords<string>> = null, leftPattern = '{{', rightPattern = '}}' ): string {
  if (!dictionary) {
    return String(this);
  }

  return Object.keys(dictionary).reduce((currentText, keyword) => {
    return currentText.replaceAll(leftPattern + keyword + rightPattern, dictionary[keyword]);
  }, String(this)).toString();
};

String.prototype.explode = function (separator: string, limit?: number): string[] {
  let strList = this.split(separator);
  if (limit && limit - 1 > 0) {
    strList = strList.slice(0, limit - 1).concat(strList.slice(limit - 1).join(separator));
  }
  return strList;
};

String.prototype.getTagArray = function ( left = '[', right = ']', replaceChar: string = String.fromCharCode(0)): string[] {
  const escapedLeft  = (left ?? '[').escapeRegExp();
  const escapedRight = (right ?? ']').escapeRegExp();
  const pattern = new RegExp(`${escapedRight}${escapedLeft}`, 'g');
  const replacedString = String(this).replace(pattern, replaceChar);
  const tags = replacedString.substring(escapedLeft.length, replacedString.length - escapedRight.length).split(replaceChar ?? String.fromCharCode(0));
  return tags;
};

String.prototype.getDetailedTagArray = function (separator = ':', options = {}): { key: string; value: string }[] {
  options = options ?? {};
  const tags = String(this).getTagArray(options.left, options.right, options.replaceChar);
  const detailedTagArray = tags.map((tagFullName) => {
    const [key, value] = tagFullName.explode(separator ?? ':', 2); // eslint-disable-line no-magic-numbers
    return { key: key, value: value };
  });
  return detailedTagArray ;
};

String.prototype.getDetailedAggregatedTagDictionary = function ( separator = ':', options = {}): TypedRecords<string[]> {
  options = options ?? {};
  const result: TypedRecords<string[]> = {};

  new String(this).getTagArray(options.left, options.right, options.replaceChar).forEach((tagFullName) => {
    const [key, value] = tagFullName.explode(separator ?? ':', 2); // eslint-disable-line no-magic-numbers
    if (null === result[key]) {
      result[key] = [];
    }
    result[key].push(value);
  });
  return result;
};

String.prototype.getTagDictionary = function (options = {}): TypedRecords<string> {
  options = options ?? {};
  const detailedTagArray = String(this).getDetailedTagArray(options.separator, options);
  return detailedTagArray.toDictionary ( 'key', 'value' ) ;
};





String.prototype.versionCompare = function ( comparingString: string ): 0 | 1 | -1 {
  const captureString = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)-?(?<build>.+)$/

  const versionA = String(this).match ( captureString )?.groups ?? { major: -1, minor: -1, patch: -1, build: -1 } ;
  const versionB = comparingString.match ( captureString )?.groups ?? { major: -1, minor: -1, patch: -1, build: -1 } ;

  if ( ( ! Number.isInteger(versionA.build) ) || ( ! Number.isInteger(versionB.build)) ) {
    return 0 ;
  }

  if ( versionA.build !== versionB.build ) { return ( versionA.build > versionB.build ) ? 1 : -1 ; }
  if ( versionA.major !== versionB.major ) { return ( versionA.major > versionB.major ) ? 1 : -1 ; }
  if ( versionA.minor !== versionB.minor ) { return ( versionA.minor > versionB.minor ) ? 1 : -1 ; }
  if ( versionA.patch !== versionB.patch ) { return ( versionA.patch > versionB.patch ) ? 1 : -1 ; }

  return 0 ;
}