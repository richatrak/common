/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosResponseHeaders } from 'axios';
import { AnyType } from './extension/Extension.full';


/* eslint-disable no-magic-numbers */
export enum HTTPStatusCode {
  // ReadyState
  OK = 200,
  Created = 201,
  Accepted = 202,
  NoContent = 204,

  // Error
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  Conflict = 409,
  Gone = 410,
  UnsupportedMediaType = 415,
  UnprocessableEntity = 422,
  TooManyRequests = 429,

  // Server Error
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503,
  GatewayTimeout = 504
}

type HttpCallback = ( result: AnyType, headers: Partial<AxiosResponseHeaders> , statusCode: number ) => void ;


export class HTTPHelper {

  public static readonly StatusCode = HTTPStatusCode ;

  public static get ( url: string , config: AxiosRequestConfig , httpCallback: HttpCallback ) {
    this.httpRequest ( url , config , 'get'    , null       , ( res ) => { return httpCallback (res.data, res.headers, res.status); } ) ;
  }

  public static delete ( url: string , config: AxiosRequestConfig , httpCallback: HttpCallback ) {
    this.httpRequest ( url , config , 'delete' , null       , ( res ) => { return httpCallback ( res.data , res.headers , res.status ) ; } ) ;
  }

  public static post ( url: string , config: AxiosRequestConfig , objectData: AnyType , httpCallback: HttpCallback ) {
    this.httpRequest ( url , config , 'post'   , objectData , ( res ) => { return httpCallback ( res.data, res.headers , res.status ) ; } ) ;
  }

  public static patch ( url: string , config: AxiosRequestConfig , objectData: AnyType , httpCallback: HttpCallback ) {
    this.httpRequest ( url , config , 'patch'  , objectData , ( res ) => { return httpCallback ( res.data , res.headers , res.status ) ; } ) ;
  }

  public static put ( url: string , config: AxiosRequestConfig , objectData: AnyType , httpCallback: HttpCallback ) {
    this.httpRequest ( url , config , 'put'    , objectData , ( res ) => { return httpCallback ( res.data , res.headers , res.status ) ; } ) ;
  }


  /**
 * Sends an HTTP request to the given URL with the given data and configuration.
 * @param {string} url - The URL to send the request to.
 * @param {AxiosRequestConfig} config - The configuration options for the request.
 * @param {string} method - The HTTP method to use for the request.
 * @param {any} data - The data to send with the request.
 * @returns {Promise<AxiosResponse>} - A promise that resolves to the response from the server.
 * @throws {Error} - If an invalid HTTP method is provided.
 */
  private static httpRequest ( url: string, config: AxiosRequestConfig , method: string , objectData: AnyType , callback: ( res: AxiosResponse ) => void ) {
    const errorHandler = ( reason: AnyType ) => {
      console.error ( reason ) ;
      throw new Error("HTTP request failed.");
    }

    switch ((method ?? '').trim().toLowerCase()) {
      case 'get':
        return axios.get(url, config).then(callback).catch ( errorHandler );
      case 'post':
        return axios.post(url, objectData, config).then(callback).catch ( errorHandler );
      case 'delete':
        axios.delete(url, config).then(callback).catch ( errorHandler );
        break;
      case 'patch':
        axios.patch(url, objectData, config).then(callback).catch ( errorHandler );
        break;
      case 'put':
        axios.put(url, objectData, config).then(callback).catch ( errorHandler );
        break;
      default:
        throw new Error(`Invalid HTTP method: ${method}`);
    }
  }
}





