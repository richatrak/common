/* Copyright (C) 2019 by IAdea Corporation, All Rights Reserved. */

import { MillisecondsInDay } from "./GeneralConstant";

export { };



declare global {


  interface Date {
    /**
     * Convert date to yyyymmdd string
     * @param formatOptions
     * @returns date in specific format
     */
    yyyymmdd: (formatOptions?: {
      dateSeparator?: string;
      dateTimeSeparator?: string;
      timeSeparator?: string;
      appendTime?: boolean;
      appendMilliSeconds?: boolean;
    }) => string;

    /**
     * Get the date to the 00:00:00.000 of reference date.
     * @returns new specific date (the fist second of the date)
     */
    getStartOfDay: () => Date;

    /**
     * Get the date to the 23:56:59.999 of reference date.
     * @returns new specific date (the last second of the date)
     */
    getEndOfDay: () => Date;
  }
}

Date.prototype.yyyymmdd = function (formatOptions?: {
  dateSeparator?: string;
  dateTimeSeparator?: string;
  timeSeparator?: string;
  appendTime?: boolean;
  appendMilliSeconds?: boolean;
}): string {
  const { dateSeparator = '-', dateTimeSeparator = ' ', timeSeparator = ':', appendTime = false, appendMilliSeconds = false } = formatOptions || {};

  const isoString = new Date(this).toISOString();
  const [dateString, timeString, msString] = isoString.replace('T', ' ').replace('.', ' ').trim().split(' ');

  const formattedDateString = dateString.split('-').join(dateSeparator);
  const formattedTimeString = timeString.split(':').join(timeSeparator);
  const formattedMsString = appendMilliSeconds ? `.${msString}` : '';

  return appendTime ? `${formattedDateString}${dateTimeSeparator}${formattedTimeString}${formattedMsString}` : formattedDateString;
};

Date.prototype.getStartOfDay = function (): Date {
  const dateTime = new Date(this).getTime();
  return new Date(dateTime - (dateTime % MillisecondsInDay));
};

Date.prototype.getEndOfDay = function (): Date {
  const startOfDay = new Date(this).getStartOfDay().getTime();
  return new Date(startOfDay + MillisecondsInDay - 1);
};
