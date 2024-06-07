/* Copyright (C) 2019 by IAdea Corporation, All Rights Reserved. */

// ----- Time -----
export const MillisecondsInSecond = 1000 ;
export const SecondsInMinute      = 60 ;
export const MinutesInHour        = 60 ;
export const HoursInDay           = 24 ;
export const DaysInWeek           = 7 ;

export const SecondsInHour        = SecondsInMinute * MinutesInHour ;
export const SecondsInDay         = SecondsInHour * HoursInDay ;

export const MillisecondsInHour   = SecondsInHour * MillisecondsInSecond ;
export const MillisecondsInDay    = SecondsInDay * MillisecondsInSecond ;


// ----- Bits and Bytes -----
export const BitsInByte           = 8 ;


// ----- HTTP Status -----
export const HTTP_STATUS_NOT_FOUND = 404 ;


// ----- Port -----
export const PORT_HTTP     = 80 ;
export const PORT_HTTPS    = 443 ;
