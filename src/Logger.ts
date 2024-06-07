/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */


import * as fs from 'node:fs';
import { LogSeverity } from './EventLog';
import './extension/Extension.full';
import { Keys } from './extension/Extension.full';

const _LoggerDefaultSeparatorLength = 40;

/**
 * get a log message with an optional category and timestamp.
 *
 * @param message The log message.
 * @param category The category of the log message. (Optional)
 * @returns The formatted log message string.
 *
 * @api getLogMessage
 * @apiName getLogMessage
 */
export function getLogMessage(message: string, category: string | null = null): string {
  return `${new Date().yyyymmdd({ appendTime: true })}${(category ? ` [${category}]` : '')} ${message}`;
}


/**
 * Logs a message to the console and optionally to a file stream.
 *
 * @param message The log message.
 * @param category The category of the log message.
 * @param logMethod The logging method to use. (Default: console.log)
 * @param stream The write stream to log to. (Optional)
 * @returns The formatted log message string.
 */
export function logMessage(message: string,category: string | Keys<LogSeverity> ,logMethod: typeof console.log = console.log, stream?: fs.WriteStream): string {
  const logMessage: string = getLogMessage(message, category);
  switch (category) {
    case 'Warn':
      logMethod('\x1b[33m%s\x1b[0m', logMessage);
      break;
    case 'Error':
      logMethod('\x1b[31m%s\x1b[0m', logMessage);
      break;
    default:
      logMethod(logMessage);
      break;
  }

  if (stream) {
    stream.write(`${logMessage}\n`);
  }
  return logMessage;
}

/**
 * Logs a separator line.
 *
 * @param length The length of the separator line. (Default: 40)
 * @param stream The write stream to log to. (Optional)
 * @returns The formatted separator line string.
 */
export function logSeparator(length = _LoggerDefaultSeparatorLength , stream?: fs.WriteStream): string {
  return logMessage('-'.repeatString(length), '----', console.info, stream);
}

/**
 * Logs an informational message to the console and optionally to a file stream.
 *
 * @param message The log message.
 * @param stream The write stream to log to. (Optional)
 * @returns The formatted log message string.
 */
export function logInfo(message: string, stream?: fs.WriteStream): string {
  return logMessage(message, 'Info' , console.info, stream);
}

/**
 * Logs a warning message to the console and optionally to a file stream.
 *
 * @param message The log message.
 * @param stream The write stream to log to. (Optional)
 * @returns The formatted log message string.
 */
export function logWarn(message: string, stream?: fs.WriteStream): string {
  return logMessage(message, 'Warn' , console.warn, stream);
}

/**
 * Logs a warning message to the console and optionally to a file stream.
 *
 * @param message The log message.
 * @param stream The write stream to log to. (Optional)
 * @returns The formatted log message string.
 */
export function logError(message: string, stream?: fs.WriteStream): string {
  return logMessage(message, 'Error', console.error, stream);
}

/**
 * Logs a debugging message to the console and optionally to a file stream.
 *
 * @param message The log message.
 * @param stream The write stream to log to. (Optional)
 * @returns The formatted log message string.
 */
export function logDebug(message: string, stream?: fs.WriteStream): string {
  return logMessage(message, 'Debug', console.debug, stream);
}

/**
 * AdvancedLogger provides an interface for logging messages with indentation and a file stream.
 */
export class AdvancedLogger {
  private logStream?: fs.WriteStream ;
  private indent = 0 ;

  constructor ( public logFilePath?: string ) {
    if (logFilePath) {
      this.logStream = fs.createWriteStream(logFilePath);
    }
  }

  increaseIndent(size = 1):  number { return this.setIndent ( this.indent + size ); }
  decreaseIndent(size = 1):  number { return this.setIndent ( this.indent - size ); }
  setIndent(indent: number): number { return this.indent = Math.max ( 0 , indent ) ; }
  getIndent():               number { return this.indent; }

  logInfo(message: string):  string { return logInfo ( `${' '.repeatString(this.indent)} ${message}`, this.logStream); }
  logDebug(message: string): string { return logDebug( `${' '.repeatString(this.indent)} ${message}`, this.logStream); }
  logWarn(message: string):  string { return logWarn ( `${' '.repeatString(this.indent)} ${message}`, this.logStream); }
  logError(message: string): string { return logError( `${' '.repeatString(this.indent)} ${message}`, this.logStream); }
  logSeparator(length = _LoggerDefaultSeparatorLength): string { return logSeparator(length, this.logStream); }

}