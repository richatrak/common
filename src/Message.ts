/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */

import { AnyType, Keys, OrNull } from './extension/Extension.full';

export type Message_ErrorCode = number | string ;
export type Message_ErrorMessage = OrNull<string> ;
export type Message_DataType<T> = OrNull<T> ;
export type Message_Callback<T> = (message: Message<T>) => void ;
export type PagedMessage_Callback<T> = (message: PagedMessage<T>) => void ;
export type MessageFunction<T> = ( callback: Message_Callback<T> ) => void ;

export const NonImplementedMessageFunction: MessageFunction<null> = ( callback: Message_Callback<null> ) => {
  console.warn ( "NonImplementedMessageFunction!" );
  return callback ( new Message ( null ) )
};

export const Message_NoError = 0


/**
 * A data object that contains a list of items with additional metadata.
 */
export type PagedData<T> = { skip: number; limit: number; total: number; itemList: OrNull<OrNull<T>[]> };

/**
 * A data object that contains a single item.
 */
export type SingleData<T> = T;


export class Message<T> {
  /**
   * A generic message object that can contain data, an error code, and an error message.
   */
  constructor( public data: Message_DataType<T> = null, public error: Message_ErrorCode = Message_NoError, public errorMessage: Message_ErrorMessage = null) {}


  /**
   * Sets the error information for the message.
   * @param error The error code to set. Defaults to Message_NoError.
   * @param errorMessage The error message to set. Defaults to null.
   * @returns The updated Message object.
   */
  public setError(error: Message_ErrorCode = Message_NoError, errorMessage: Message_ErrorMessage = null): Message<T> {
    this.error = error;
    this.errorMessage = errorMessage;
    return this;
  }

  /**
   * Creates a new Message object based on a partial object with similar properties.
   * @param messageLikeObj The partial object to create a Message object from.
   * @returns A new Message object based on the given partial object.
   */
  public static fromPartial<T>(messageLikeObj: Partial<Message<T>>): Message<T> {
    return new Message<T>(messageLikeObj?.data, messageLikeObj?.error, messageLikeObj?.errorMessage);
  }

  public static getErrorMessage ( errorCode: Message_ErrorCode , errorMessage: Message_ErrorMessage ) {
    return new Message<AnyType> ( null , errorCode , errorMessage ) ;
  }


  public static fromCompoundItemPagedMessage<T,U>( compoundItemPagedMessage: PagedMessage<U>, targetFieldName: Keys<U> ): PagedMessage<T> {
    const newMessage = new PagedMessage<T>({
      total: compoundItemPagedMessage.data?.total ?? -1,
      limit: compoundItemPagedMessage.data?.limit ?? -1,
      skip: compoundItemPagedMessage.data?.skip ?? -1,
      itemList: (compoundItemPagedMessage.data?.itemList ?? []).map((item) => item?.[targetFieldName as Keys<typeof item>] as unknown as T),
    }, compoundItemPagedMessage.error, compoundItemPagedMessage.errorMessage);
    return newMessage;
  }


  /**
   * Creates a new Message object with only the error information from the original message.
   * @param errorCode The new error code to set. If omitted, uses the error code from the original message.
   * @returns A new Message object with only the error information from the original message.
   */
  public toErrorMessage<T>(errorCode?: Message_ErrorCode): Message<T> {
    return new Message<T>(null, errorCode ?? this.error, this.errorMessage);
  }



  public toPagedMessage<T> ( ): PagedMessage<T>{
    return new PagedMessage<T>(this.data as unknown as PagedData<T>, this.error, this.errorMessage);
  }
}


/**
 * A paged message object that contains data and metadata.
 */
const defaultPageLimit = 200 ;
export class PagedMessage<T> extends Message<PagedData<T>> {

  private _getNextPageParameters(): { hasNextPage: boolean, resultSkip: number; resultLimit: number , resultTotal: number, nextSkip: number} {
    const resultSkip = this.data?.skip ?? 0;
    const resultLimit = this.data?.limit ?? defaultPageLimit;
    const resultTotal = this.data?.total ?? 0;

    return {
      hasNextPage: (resultSkip + resultLimit) < resultTotal,
      resultSkip: resultSkip,
      resultLimit: resultLimit,
      resultTotal: resultTotal,
      nextSkip: resultSkip + resultLimit,
    } ;
  }

  public hasNextPage(): boolean { return this._getNextPageParameters().hasNextPage ; }

  public getNextPageParameters(): OrNull<{ skip: number; limit: number }> {

    const nextPageInfo = this._getNextPageParameters() ;

    if ( false === nextPageInfo.hasNextPage ) { return null ; }

    return { skip: nextPageInfo.nextSkip, limit: nextPageInfo.resultLimit };
  }


}

