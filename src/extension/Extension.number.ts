/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */

import { BitsInByte } from "./GeneralConstant";

const _NumberGroupLength = 3 ;

export { };


declare global {
  interface Number {
    /**
     * Get formatted string of the number
     *
     * @param decimals: the decimals be rounded
     * @param decimalsSeparator: the decimal separator for format
     * @param groupSeparator: the group separator for the format
     * @param groupDigits the amount of a group
     */
    toFormattedString: (decimals: number, decimalSeparator?: string, groupSeparator?: string, groupDigits?: number) => string;

    /**
     * Convert the number to an array of bytes
     *
     * @returns an array of bytes
     */
    toByteArray: () => number[];

    /**
     * Returns a value that is within the specified range.
     *
     * @param min: the minimum value of the range
     * @param max: the maximum value of the range
     * @returns a random number
     */
    getNumberInRange: ( min: number, max: number ) => number ;

  }
}

/**
 * This module extends the Number prototype with two methods: toFormattedString and toByte.
 *
 * @module Number.prototype
 */
Number.prototype.toFormattedString = function ( decimals = 0, decimalSeparator = '.', groupSeparator = ',', groupDigits = _NumberGroupLength ): string {
  const [ intStr, floatStr ] = this.toFixed ( decimals < 0 ? 0 : decimals ).split ('.');
  const intReadyStr = intStr.replace( new RegExp (`\\B(?=(\\d{${groupDigits}})+(?!\\d))`, 'g'), groupSeparator);
  return ( 0 <= decimals ? [intReadyStr] : [intReadyStr, floatStr ] ).join (decimalSeparator) ;
};

Number.prototype.toByteArray = function (): number[] {
  const buffer = new ArrayBuffer(BitsInByte);
  const view = new DataView(buffer);
  view.setFloat64(0, <number>this);

  const byteArray = [];
  for ( let i = 0 ; i < BitsInByte ; i++ )
  { byteArray.push ( view.getUint8(i) ) ; }

  return byteArray ;
};

Number.prototype.getNumberInRange = function ( min: number, max: number): number {
  if ( min > max ) { return this.getNumberInRange ( max , min ) ; }

  const thisValue = <number>this ;
  if ( thisValue <= min ) { return min ; }
  if ( thisValue >= max ) { return max ; }

  return thisValue ;
}