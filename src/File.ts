/* Copyright (C) 2019 by IAdea Corporation, All Rights Reserved. */

import * as fs from 'fs-extra';
import * as path from 'path';
import { AsyncTaskHelper } from './AsyncTaskHelper';
import { OneOrMany, OrNull, OrNullCallback } from './extension/Extension.full';

const _SYNC_MODE = null;


/**
 * Information about a file path.
 * @typedef {Object} PathInfo
 * @property {string} root - The root directory of the path.
 * @property {string} directoryPath - The directory path of the path.
 * @property {string} fileName - The file name of the path.
 * @property {string} baseName - The base name of the path.
 * @property {string} extension - The extension of the path.
 * @property {string[]} pathTree - An array representing the path.
 */
export type PathInfo = {
  root: string;
  directoryPath: string;
  fileName: string;
  baseName: string;
  extension: string;
  pathTree: string[];
}

/**
 * Returns information about a file path.
 * @param {string} filePath - The file path to get information for.
 * @param {boolean} [toAbsolutePath=false] - Whether to return the absolute path.
 * @returns {PathInfo} - The path information.
 */
export function getPathInfo(filePath: string, toAbsolutePath = false): PathInfo {
  // Get the target file path.
  const targetFilePath = toAbsolutePath ? path.resolve(filePath) : filePath;

  // Parse the target file path.
  const parsedInfo = path.parse(targetFilePath);

  // Initialize the path information.
  const pathInfo: PathInfo = {
    root: parsedInfo.root,
    directoryPath: parsedInfo.dir,
    fileName: parsedInfo.name,
    baseName: parsedInfo.base,
    extension: parsedInfo.ext,
    pathTree: [],
  };

  const pathParts = targetFilePath.replace(/\\/g, '/').split('/');

  // Build the path tree.
  pathParts.forEach((pathPart) => {
    if ((pathPart = pathPart.trim()).length) {
      pathInfo.pathTree.push(
        pathInfo.pathTree.length
          ? pathInfo.pathTree[pathInfo.pathTree.length - 1] + path.sep + pathPart
          : filePath[0] === path.sep
          ? path.sep + pathPart
          : pathPart
      );
    }
  });

  return pathInfo;
}


/**
 * Creates a directory and any necessary subdirectories synchronously or asynchronously.
 * @param {string} directoryPath - The directory path to create.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {string[]|null} - An array of the created directories, or null if called asynchronously.
 */
export function makeDirectoriesRecursive(directoryPath: string, callback: OrNull<(directoryPathList: string[]) => void> = _SYNC_MODE): OrNull<string[]> {
  const directoryPathList = getPathInfo(directoryPath).pathTree;

  switch (callback) {
    case _SYNC_MODE: // Synchronous mode.
      fs.mkdirSync(directoryPath, { recursive: true });
      return directoryPathList;
    default:         // Asynchronous mode.
      fs.mkdir(directoryPath, { recursive: true }, (err) => { err ? console.error(err) : callback(directoryPathList); });
  }
  return null;
}


/**
 * Removes a directory and all its contents recursively synchronously or asynchronously.
 * @param {string} directoryPath - The directory path to remove.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {void} - Nothing is returned when called asynchronously.
 */
export function removeDirectoryRecursive(directoryPath: OrNull<string>, callback: OrNullCallback = _SYNC_MODE): void {
  if (directoryPath) {
    switch (callback) {
      case _SYNC_MODE: // Synchronous mode.
        return fs.removeSync(directoryPath);
      default:         // Asynchronous mode.
        fs.remove(directoryPath, (err) => { err ? console.error(err) : callback();});
    }
  }
}

/**
 * Resolves the real path of a file synchronously or asynchronously.
 * @param {string} pathString - The path to the file to resolve.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {string|null} - The real path of the file, or null if called asynchronously.
 */
export function getRealPath(pathString: string, callback: OrNull<(realPath: string) => void> = _SYNC_MODE): OrNull<string> {
  switch (callback) {
    case _SYNC_MODE: // Synchronous mode.
      return fs.realpathSync(pathString);
    default:         // Asynchronous mode.
      fs.realpath(pathString, (err, realPath) => { err ? console.error(err) : callback(realPath.toString()); });
  }
  return null;
}
export const resolvePath = getRealPath;



/**
 * Check existence of file(s)
 *
 * @param filePathList - target file path(s)
 * @param callback - optional, this function like to use callback once callback is provided.
 * @returns true if file(s) is(are) existing
 */
export function pathExists ( filePath: OneOrMany<string>, callback: OrNull<(isFileExisting: boolean) => void> = _SYNC_MODE): OrNull<boolean> {

  const targetFilePathList: string[] = Array.isArray (filePath) ? filePath : [filePath];
  switch (callback) {
    case _SYNC_MODE:
      return targetFilePathList.reduce ( (curResult, curPath) => curResult && fs.pathExistsSync(curPath), true) ;
    default:
      new AsyncTaskHelper ( { asyncTaskList:
        targetFilePathList.map ( (curPath) => (qCallback: (exists: boolean) => void) => {
          fs.pathExists ( curPath, (err, exists) => {
            if ( err ) { console.error(err) ; }
            qCallback ( exists ) ;
          } ) ;
        } )
      }).pool ( ( resultList ) => {
        callback ( (resultList as boolean[]).reduce ( (curResult, curExists) => curResult && curExists, true ) ) ;
      } );
  }
  return null ;
}



/**
 * Gets the file stats synchronously or asynchronously.
 * @param {string} filePath - The path to the file.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {fs.Stats|null} - The file stats, or null if called asynchronously.
 */
export function getFileStat(filePath: string, callback: OrNull<(stats: fs.Stats) => void> = _SYNC_MODE): OrNull<fs.Stats> {
  switch (callback) {
    case _SYNC_MODE: // Synchronous mode.
      return fs.statSync(filePath);
    default:         // Asynchronous mode.
      fs.stat(filePath, (err, stats) => { err ? console.error(err) : callback(stats); });
  }
  return null;
}


/**
 * Writes data to a file synchronously or asynchronously.
 * @param {string} filePath - The path to the file.
 * @param {string|NodeJS.ArrayBufferView} data - The data to write to the file.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {void} - Nothing is returned.
 */
export function writeFile(filePath: string,data: string | NodeJS.ArrayBufferView,callback: OrNullCallback = _SYNC_MODE): void {
  switch (callback) {
    case _SYNC_MODE: // Synchronous mode.
      return fs.writeFileSync(filePath, data);
    default:         // Asynchronous mode.
      fs.writeFile(filePath, data, (err) => { err ? console.error(err) : callback(); });
  }
}


/**
 * Reads data from a file synchronously or asynchronously.
 * @param {string} filePath - The path to the file.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {Buffer|null} - The data, or null if called asynchronously.
 */
export function readFile(filePath: string, callback: OrNull<(data: Buffer) => void> = _SYNC_MODE): OrNull<Buffer> {
  switch (callback) {
    case _SYNC_MODE: // Synchronous mode.
      return fs.readFileSync(filePath);
    default:         // Asynchronous mode.
      fs.readFile(filePath, (err, data) => { err ? console.error(err) : callback(data); });
  }
  return null;
}


/**
 * Deletes a file synchronously or asynchronously.
 * @param {string} filePath - The path to the file.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {void} - Nothing is returned.
 */
export function unlink(filePath: string, callback: OrNullCallback = _SYNC_MODE): void {
  switch (callback) {
    case _SYNC_MODE: // Synchronous mode.
      return fs.unlinkSync(filePath);
    default:         // Asynchronous mode.
      fs.unlink(filePath, callback);
  }
}


/**
 * Moves a file or directory synchronously or asynchronously.
 * @param {string} fromPath - The path to the file or directory to move.
 * @param {string} toPath - The path to move the file or directory to.
 * @param {fs.MoveOptions} options - The options for the move operation.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {void} - Nothing is returned.
 */
export function move( fromPath: string, toPath: string, options: fs.MoveOptions, callback: OrNull<(err: Error) => void> = _SYNC_MODE ): void {
  switch (callback) {
    case _SYNC_MODE: // Synchronous mode.
      return fs.moveSync(fromPath, toPath, options);
    default:         // Asynchronous mode.
      fs.move(fromPath, toPath, options , callback as fs.NoParamCallbackWithUndefined) ;
  }
}

/**
 * Gets a list of files in a directory synchronously or asynchronously.
 * @param {string} directoryPath - The path to the directory.
 * @param {function} [callback=null] - A callback function to call when the operation is complete.
 * @returns {string[]|null} - The list of files, or null if called asynchronously.
 */
export function listFiles(directoryPath: string, callback: OrNull<(fileList: string[]) => void> = null): OrNull<string[]> {
  switch (callback) {
    case _SYNC_MODE: // Synchronous mode.
      return fs.readdirSync(directoryPath);
    default:         // Asynchronous mode.
      fs.readdir(directoryPath, (err, fileList) => { err ? console.error(err) : callback(fileList); });
  }
  return null;
}

export const fsEx = fs;