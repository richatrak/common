/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */


/**
 * Defines the severity levels of log messages.
 */
export enum LogSeverity {

  EMERGENCY = 0, /* eslint-disable-line no-magic-numbers */
  ALERT     = 1, /* eslint-disable-line no-magic-numbers */
  CRITICAL  = 2, /* eslint-disable-line no-magic-numbers */
  ERROR     = 3, /* eslint-disable-line no-magic-numbers */
  WARN      = 4, /* eslint-disable-line no-magic-numbers */
  NOTICE    = 5, /* eslint-disable-line no-magic-numbers */
  INFO      = 6, /* eslint-disable-line no-magic-numbers */
  DEBUG     = 7, /* eslint-disable-line no-magic-numbers */
}

/**
 * The default log severity used when not specified.
 */
export const DEFAULT_LOG_Severity = LogSeverity.INFO;

/**
 * Defines the structure of a log level.
 */
export type LogLevel ={
  level: number;
  code: string;
}


/**
 * Returns the log level information based on the specified log severity.
 *
 * @param {LogSeverity} logSeverity The log severity.
 * @returns {LogLevel} The log level information.
 */
export function getLogLevel(logSeverity: LogSeverity): LogLevel {
  switch (logSeverity) {
    case LogSeverity.EMERGENCY:
      return { level: 0, code: 'Emergency' };
    case LogSeverity.ALERT:
      return { level: 1, code: 'Alert' };
    case LogSeverity.CRITICAL:
      return { level: 2, code: 'Critical' };
    case LogSeverity.ERROR:
      return { level: 3, code: 'Error' };
    case LogSeverity.WARN:
      return { level: 4, code: 'Warn' };
    case LogSeverity.NOTICE:
      return { level: 5, code: 'Notice' };
    case LogSeverity.INFO:
      return { level: 6, code: 'Info' };
    case LogSeverity.DEBUG:
      return { level: 7, code: 'Debug' };
    default:
      return getLogLevel ( DEFAULT_LOG_Severity );
  }
}

/**
 * The default log level used when not specified.
 */
export const DEFAULT_LOG_LEVEL = getLogLevel ( DEFAULT_LOG_Severity );