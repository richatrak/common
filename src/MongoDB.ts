/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */


import * as mongoose from 'mongoose';
import { AsyncTaskHelper } from './AsyncTaskHelper';
import * as Library from './Library';
import { PagedData } from './Message';
import { AnyType, FreeRecords, Keys, OrNull, TypedRecords } from './extension/Extension.full';

const _QueryLimitDefault = 200 ;

/**
 * The settings for creating indexes in MongoDB.
 */
export type MongoDBIndexSettings = {
  /**
   * The fields to be indexed with their corresponding index type.
   */
  indexSpecific: TypedRecords<number>;

  /**
   * Additional options for the index creation.
   */
  options?: mongoose.IndexOptions;
};


export function ensureMongodbIndexes(indexSettings: MongoDBIndexSettings[], model: mongoose.Model<AnyType>): void {
  indexSettings.forEach(({ indexSpecific, options }) => {
    model.collection.createIndex(indexSpecific, options ?? {} ) ;
  });
}




export function getPagedDataList<T>(model: mongoose.Model<AnyType>,searchConditions: mongoose.FilterQuery<AnyType>,projection: OrNull<AnyType>,searchOptions: OrNull<mongoose.QueryOptions & FreeRecords>, pagedCallback: (result: PagedData<T>) => void): void {

  const asyncTaskHelper = new AsyncTaskHelper ()
  let total = 0

  if ( searchOptions?.total ) { total = searchOptions.total; delete searchOptions.total ;}
  else {
    asyncTaskHelper.add( () => {
      model.countDocuments(searchConditions, (err: unknown , count: number) => {
        if (err) { asyncTaskHelper.quit() ; return console.error(err); }
        total = count;
      } ) ;
    } ) ;
  }


  asyncTaskHelper.start ( () => {
    const targetSearchOptions: mongoose.QueryOptions = {
      skip: searchOptions?.skip ?? 0,
      limit: (searchOptions?.limit ?? _QueryLimitDefault).getNumberInRange ( 1 , _QueryLimitDefault ) ,
      readPreference: 'primaryPreferred',
      ...searchOptions,
    } ;


    model.find ( searchConditions, projection , targetSearchOptions ).exec().then ( ( docList: Array<mongoose.Document> ) => {
      const result: PagedData<T> = {
        skip: searchOptions?.skip ?? 0,
        limit: (searchOptions?.limit ?? _QueryLimitDefault).getNumberInRange ( 1 , _QueryLimitDefault ) ,
        total: total,
        itemList: (docList ?? []).map((doc) => docToJSON<T>(doc)),
      };
      pagedCallback(result);
    } ).catch ( ( err: mongoose.CallbackError ) => {
      return console.error (err) ;
    } ) ;
  } ) ;
}


/**
 * Convert a Mongoose document to a plain object, and remove the specified fields.
 * @param doc - The Mongoose document to convert.
 * @param ignoreFieldList - The list of field names to ignore.
 * @returns The plain object that represents the Mongoose document.
 */
export function docToJSON<T>(doc: OrNull<mongoose.Document>, ignoreFieldList: string[] = ['id', '_id']): T {
  if ( ! doc ) { return {} as T ; }

  const obj = doc.toJSON({ virtuals: true });
  ignoreFieldList = ignoreFieldList ?? [];

  const result = {} as T;
  for ( const [fieldName, fieldValue] of Object.entries(obj) ) {
    if ( ! ignoreFieldList.includes ( fieldName ) ) { result[fieldName as Keys<T>] = fieldValue as T[Keys<T>] ; }
  }
  return result ;
}


export function connectToMongoDB ( connectionURI: string, connectionOptions: mongoose.ConnectOptions, callback: (err: mongoose.CallbackError) => void ): void {
  mongoose.connect ( connectionURI , connectionOptions ).then ( () => {
    return callback ( null ) ;
  } ).catch ( ( err: mongoose.CallbackError ) => {
    const errorMessage = `Error connecting to MongoDB: ${err?.message}`;
    Library.Logger.logError (errorMessage);
    return callback ( err ) ;
  } ) ;
}

export function populateWithDictionary<T,K> ( data: T , fieldName: string, dictionary: Record<string ,K> ): T & { [fieldName: string]: K } {
  return Object.assign ( {} , data , { [fieldName]: dictionary[ data[fieldName as keyof T] as string] }) ;
}


/**
 * Returns the limit and skip values for a data query, ensuring they are within the allowed range.
 *
 * @param limit - The limit value of the query, or null if no limit is specified.
 * @param skip - The skip value of the query, or null if no skip is specified.
 * @param maxLimit - The maximum limit value allowed for the query.
 * @returns An object containing the limit and skip values for the query.
 */
export function getLimitAndSkip ( limit?: string | number, skip?: string | number, maxLimit = _QueryLimitDefault): { limit: number, skip: number } {
  const limitAndSkip = {
    limit: ( ( undefined === limit ) ? (maxLimit ?? _QueryLimitDefault ) : ( ( 'string' === typeof limit ) ? parseInt(limit) : limit ) ).getNumberInRange ( 1, maxLimit ?? _QueryLimitDefault ) ,
    skip:  ( ( undefined === skip )  ? 0 : ( ( 'string' === typeof skip )  ? parseInt(skip)  : skip ) ).getNumberInRange ( 0 , Number.POSITIVE_INFINITY ) ,
  } ;

  return limitAndSkip;
}