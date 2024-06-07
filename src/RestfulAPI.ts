/* Copyright (C) 2024 by Rich Hsu, All Rights Reserved. */

import * as express from 'express';
import * as fs from 'fs-extra';
import * as Library from './Library';
import { Message } from './Message';
import { AnyType, FreeRecords, Keys, NestedRecords, OneOrManyOrNull, OrNull, PrimitiveType, TypedRecords, isNullLike } from './extension/Extension.type';
import { HTTP_STATUS_NOT_FOUND, PORT_HTTP } from './extension/GeneralConstant';

const LOG_INDENT = 2 ;


export type RestfulAPI_Request      = express.Request;
export type RestfulAPI_Response     = express.Response;
export type RestfulAPI_NextFunction = express.NextFunction;
export type RestfulAPI_Application  = express.Application;
export type RestfulAPI_RequestValidator = (req: RestfulAPI_Request) => boolean;

export enum RestfulAPISupportMethods {
  GET    = 'GET',
  POST   = 'POST',
  DELETE = 'DELETE',
  PATCH  = 'PATCH',
}

export type RestfulAPIParameterCheckRule = {
  path: string;
  required: boolean;
  type: string;
  isArray: OrNull<boolean>;


  verify: OrNull<(value: AnyType) => boolean>;
};


export type RestfulAPIParameterCheckRuleDictionary = {
  path?: RestfulAPIParameterCheckRule[];
  body?: RestfulAPIParameterCheckRule[];
  query?: RestfulAPIParameterCheckRule[];
};



export type RestfulAPIParameterDictionary = FreeRecords & { path?: FreeRecords; query?: FreeRecords; body?: FreeRecords; }


export type RestfulInternalFunctionOptions  = FreeRecords & { req: RestfulAPI_Request };


export type RestfulInternalFunctionCallback<T> = (message: Message<T>, options?: AnyType) => void
export type RestfulInternalFunction<T> = ( errorCode: string, options: RestfulInternalFunctionOptions, callback: RestfulInternalFunctionCallback<T>) => void;

export type RestfulAPIExecutionOptions<T> = {
  req: RestfulAPI_Request;
  execution: RestfulInternalFunction<T>;
  parameterCheckRules: RestfulAPIParameterCheckRuleDictionary;
  errorCode?: string;
};


export type RestfulExternalFunction = ( req: RestfulAPI_Request, res: RestfulAPI_Response, next: RestfulAPI_NextFunction, self?: RestfulAPIModule ) => void;



export type RestfulAPIServiceOptions = {
  debugMode?: boolean;
  configurationSource?: FreeRecords | string ;
  healthCheckPath?: string;
  requestJSONSizeLimitInKB ?: number ;

  requestValidatorList?: RestfulAPI_RequestValidator[] ;
  allowedHeaderList?: string[] ;
  exposeHeaderList?: string[] ;
} & FreeRecords ;

const RestfulAPIService_DefaultOptions: RestfulAPIServiceOptions = {
  debugMode: false,
  configurationSource: 'config.json',
  healthCheckPath: '/healthCheck.html',
  requestJSONSizeLimitInKB: 10240 ,

  requestValidatorList: [] ,
  allowedHeaderList: [] ,
  exposeHeaderList: [] ,
}


export function parameterCheck(

  data: FreeRecords,
  ruleOrRuleList: OneOrManyOrNull<RestfulAPIParameterCheckRule>,
  errorPrefix: OrNull<string> = null,
  debugMode = false

): Message<OrNull<FreeRecords>> {

  let cookedData: FreeRecords = JSON.parse(JSON.stringify(data));
  const errorCode = 'Parameter.Check';
  const prefix = errorPrefix ?? '';
  const ruleList = (Array.isArray(ruleOrRuleList) ? ruleOrRuleList : [ruleOrRuleList]).filter(
    (r) => ! isNullLike ( r )
  ) as RestfulAPIParameterCheckRule[];

  if (debugMode) {
    console.log('-------- Parameter Check ------------');
  }
  for (const rule of ruleList) {
    let value = Library.JSONEx.getValueByJSONPath(data, rule.path, debugMode);

    if (debugMode) {
      console.debug('[Parameter Check] Rule: ', rule);
    }
    if (debugMode) {
      console.debug('[Parameter Check] Value: ', value);
    }
    if (rule.required && null === value) {
      return new Message(null, errorCode, `${prefix} No required parameter "${rule.path}"`);
    }

    if (! isNullLike(value)) {
      const [comingType, targetType] = rule.type.split(':');

      if (debugMode) {
        console.debug('[Parameter Check] Coming Type: ', comingType);
        console.debug('[Parameter Check] Target Type: ', targetType);
      }

      let checkingType = comingType;

      if (undefined !== targetType && comingType === 'string') {
        checkingType = targetType;
        try {
          value = JSON.parse(value);
        }
        catch {
          // avoid parsing fail
        }
        finally {
          cookedData[rule.path] = value;
          cookedData = Library.JSONEx.getNormalizeKeyedObject(cookedData);
        }
      }

      rule.isArray = rule.isArray ?? -1 !== checkingType.replace(/ /g, '').indexOf('[]');
      checkingType = checkingType.replace(/ /g, '').replace('[]', '');

      if ( ! isNullLike ( rule.isArray ) ) {
        if (debugMode) {
          console.debug(`[Parameter Check] Array (Path: ${rule.path})`, value instanceof Array);
        }
        if (rule.isArray !== value instanceof Array) {
          return new Message(null, errorCode, `${prefix} Parameter should be an array "${rule.path}`);
        }
      }

      if (value instanceof Array) {
        const testee = value?.[0];
        if (  ( !isNullLike ( testee ) ) && checkingType !== typeof testee) {
          {
            return new Message(
              null,
              errorCode,
              `${prefix} Wrong data type of parameter "${rule.path}[0]" (${checkingType}): ${typeof testee}`
            );
          }
        }
      } else {
        if (typeof value !== checkingType) {
          return new Message(
            null,
            errorCode,
            `${prefix} Wrong data type of parameter "${rule.path}" (${rule.type}): ${typeof value}`
          );
        }
      }

      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
      if ( (! isNullLike(rule.verify)) && !rule.verify!(value)) {
        return new Message(null, errorCode, `${prefix} Fail of verification "${rule.path}"`);
      }
    }
  }

  return new Message(cookedData);
}





export abstract class RestfulAPIService {
  public server:        OrNull<RestfulAPI_Application> = null;
  public serviceOptions: RestfulAPIServiceOptions = RestfulAPIService_DefaultOptions ;
  public configuration: NestedRecords<PrimitiveType> = {};

  public static serviceOptions: RestfulAPIServiceOptions = RestfulAPIService_DefaultOptions ;
  public static configuration: NestedRecords<PrimitiveType> = {};

  public static accessLogStream: fs.WriteStream | undefined = undefined;
  public static debugLogStream:  fs.WriteStream | undefined = undefined;
  public static errorLogStream:  fs.WriteStream | undefined = undefined;

  public subModuleList:          Array<typeof RestfulAPIModule> = [];




  /**
   * Represents a Service instance with the specified service name and host ID.
   * Initializes the storage directories, creates the configuration file,
   * attaches the log mechanism, and prepares the HTTP server for incoming requests.
   * @param {string} serviceName - The name of the service.
   * @param {string} hostID - The ID of the host machine.
   */
  constructor(public serviceName: string, public hostID: string, options?: RestfulAPIServiceOptions ) {

    RestfulAPIService.serviceOptions = this.serviceOptions = Object.assign ( {}, RestfulAPIService_DefaultOptions , options ?? {} ) ;

    // Prepare the configuration object from environment variables
    this.prepareConfiguration();

    // Set up the logging mechanism
    this.setupLogging();

    // Prepare the HTTP server
    this.prepareHTTPServer();
  }

  public setDebugMode ( debugMode = false ) {
    RestfulAPIService.configuration.debugMode = this.configuration.debugMode = RestfulAPIService.serviceOptions.debugMode = this.serviceOptions.debugMode = debugMode ;
  }


  /**
   * Prepares the configuration for the service from environment variables.
   */
  private prepareConfiguration(): void {
    // Logs a message indicating that the configuration process has started.
    Library.Logger.logInfo(`Preparing configuration for "${this.serviceName}"...`);

    // Initialize the configuration object
    this.configuration = {};

    let targetConfigurationSource: RestfulAPIServiceOptions = {} ;
    switch ( typeof this.serviceOptions.configurationSource ) {
      case 'string':
        if ( this.serviceOptions.configurationSource.endsWith('.json') && fs.pathExistsSync(this.serviceOptions.configurationSource)) {
          targetConfigurationSource = JSON.parse ( fs.readFileSync ( this.serviceOptions.configurationSource , 'utf8' ) ) ;
        } else {
          targetConfigurationSource = process.env ;
        }
        break ;
      case 'object':
        targetConfigurationSource = this.serviceOptions.configurationSource ;
        break ;
      default:
        targetConfigurationSource = process.env ;
        break ;
    }



    // Define a helper function to extract environment variables for a section or list of sections
    const extractConfigurationVariables = ( sectionOrSectionList: string | string [] ) => {
      // If the input is an array, call the helper function recursively for each item
      if (Array.isArray(sectionOrSectionList)) {
        sectionOrSectionList.forEach((sectionName) => {
          extractConfigurationVariables(sectionName);
        }) ;
      }
      // If the input is a string, extract environment variables for that section
      else
      {
        // Logs a message indicating which section is being used to generate the configuration.
        Library.Logger.logInfo(`  - Preparing config from "${sectionOrSectionList}" section...`);

        // Extracts the environment variables whose names start with the section prefix.
        const sectionPrefix = `${sectionOrSectionList}.`;
        const sectionPrefixLength = sectionPrefix.length;

        Object.entries ( targetConfigurationSource ).filter(( [confKey] ) => confKey.startsWith(sectionPrefix)).forEach (([confKey, confValue]) => {
          this.configuration[confKey.substring (sectionPrefixLength)] = confValue as PrimitiveType;
        } ) ;
      }
    }

    // Calls the helper function for the "Common", "Secret", and service name sections.
    extractConfigurationVariables(['Common', 'Secret', this.serviceName.replace(/ /g, '')]);
    if ( this.serviceOptions.debugMode ) { this.setDebugMode ( true ) ; }

    // Log a message indicating that the configuration process has completed
    Library.Logger.logInfo(`Configuration for "${this.serviceName}" is ready.`);

    if ( this.configuration.debugMode ) {
      console.debug ( this.configuration ) ;
    }
  }


  /**
   * Sets up the logging mechanism for the service, creating log files and streams for access, debug, and error logs.
   * Logs information about the process, including the log directory path, log file paths, and log streams.
   */
  private setupLogging(): void {
    // Logs a message indicating that the logging mechanism is being prepared.
    Library.Logger.logInfo(`Preparing logging mechanism for "${this.serviceName}"...`);

    // Gets the log directory path from the configuration.
    const logDirPath = <string>this.configuration.logDirPath ?? '';


    // If the log directory path is not defined, disable the logging mechanism.
    if (!logDirPath) {
      Library.Logger.logInfo('Logging mechanism is disabled.');
      return;
    }

    // Logs a message indicating that the logging mechanism is enabled and the log directory path.
    Library.Logger.logInfo(`Logging mechanism is enabled. Log directory path: ${logDirPath}`);

    // Creates the log directory if it doesn't exist.
    if (!Library.File.pathExists(logDirPath)) {
      Library.File.makeDirectoriesRecursive(logDirPath);
    }


    // Create the file paths for the access, debug, and error logs
    const accessLogPath = `${logDirPath}/${this.hostID.replace(/ /g, '')}.access.log`;
    const debugLogPath  = `${logDirPath}/${this.hostID.replace(/ /g, '')}.debug.log`;
    const errorLogPath  = `${logDirPath}/${this.hostID.replace(/ /g, '')}.error.log`;


    // Creates the write streams for the access, debug, and error logs and logs messages indicating their creation.
    RestfulAPIService.accessLogStream = fs.createWriteStream(accessLogPath, { flags: 'a+' });
    Library.Logger.logInfo(`Access log stream created. Log path: ${accessLogPath}`);

    RestfulAPIService.debugLogStream = fs.createWriteStream(debugLogPath, { flags: 'a+' });
    Library.Logger.logInfo(`Debug log stream created. Log path: ${debugLogPath}`);

    RestfulAPIService.errorLogStream = fs.createWriteStream(errorLogPath, { flags: 'a+' });
    Library.Logger.logInfo(`Error log stream created. Log path: ${errorLogPath}`);


     // Logs a message indicating that the logging mechanism is ready.
    Library.Logger.logInfo(`Logging mechanism for "${this.serviceName}" is ready.`);
  }


  /**
   * Prepares the HTTP server, setting up handlers and routes.
   * Logs information about the process, including the server setup and registered handlers.
   */
  public prepareHTTPServer(): void {
    // Initialize the HTTP server
    Library.Logger.logInfo(`Preparing HTTP server for "${this.serviceName}"`);
    this.server = express();

    // Disable the x-powered-by header
    Library.Logger.logInfo('  * Disabled: x-powered-by');
    this.server.disable('x-powered-by');

    // Trust the proxy
    Library.Logger.logInfo('  * Trust Proxy');
    this.server.set('trust-proxy', true);

    // Register an error handler
    Library.Logger.logInfo('  * Register Error Handler');
    this.server.on('error', (err) => {
      console.error(err);
      Library.Logger.logError(err.toString());
    });

    // HTTP Method Overwrite
    Library.Logger.logInfo('  * HTTP Method Overwrite');
    this.server.use((req, res, next) => {
      req.method = <string>(req.headers['X-HTTP-Method-Override'.toLowerCase()] ?? req.method);
      next();
    });


    // Optional Handler: Access Log
    if (this.configuration.showAccessLog) {
      Library.Logger.logInfo('  * Optional Handler: Access Log');
      this.server.use((req, _res, next) => {
        const accessLogParts = [
          req.method,
          req.url,
          `(${req.headers['user-agent']})`,
        ];
        Library.Logger.logInfo(accessLogParts.join(' '), RestfulAPIService.accessLogStream );
        next();
      });
    }


    // Optional Handler: OPTIONS
    Library.Logger.logInfo('  * Optional Handler: OPTIONS');
    this.server.use((req, res, next) => {
      if (req.method === 'OPTIONS') {
        RestfulAPIService.sendHttpResponse(new Message(null), this.getResponseWithCommonHeaders(res));
      } else {
        next();
      }
    });


    const requestLimitInKB = this.configuration.RestfulAPIRequestSizeLimitInKB ?? RestfulAPIService_DefaultOptions.RestfulAPIService_RequestJSONSizeLimitInKB ;

    // Required Handler: JSON
    Library.Logger.logInfo(`  * Required Handler: JSON (limit: ${requestLimitInKB}kb)`);
    this.server.use(express.json({ limit: `${requestLimitInKB}kb` }));

    // Required Handler: Form data
    Library.Logger.logInfo(`  * Required Handler: Form (extended: false, limit: ${requestLimitInKB}kb)`);
    this.server.use(express.urlencoded({ extended: false, limit: `${requestLimitInKB}kb` }));


    // Required Handler: Error
    Library.Logger.logInfo('  * Required Handler: Error');
    this.server.use( this.errorHandler );


    // Route: Health Check
    const healthCheckPath = <string>this.configuration.HealthCheckPath ?? RestfulAPIService_DefaultOptions.healthCheckPath ;
    Library.Logger.logInfo(`  * Route: Health Check (GET ${healthCheckPath})`);
    this.server.get( healthCheckPath , (_req: RestfulAPI_Request, res: RestfulAPI_Response) => {
      RestfulAPIService.sendHttpResponse(new Message(null), this.getResponseWithCommonHeaders(res));
    });

    // Log a message indicating that the HTTP server is ready
    Library.Logger.logInfo(`HTTP server preparing for "${this.serviceName}" is ready.`);
  }


  /**
   * Registers a RESTful API endpoint on the express application.
   *
   * @param methodName The HTTP method to register, e.g. "get", "post", "put", etc.
   * @param entryPoint The URL endpoint to register.
   * @param handler The function to call when the endpoint is requested.
   * @param moduleSelf The module object of the calling module, if applicable.
   * @param logIndent The indentation level for logging purposes.
   */

  public registerRestfulAPI( methodName: Keys<typeof RestfulAPISupportMethods>, entryPoint: string, handler: RestfulExternalFunction, moduleInstance?: RestfulAPIModule, logIndent = LOG_INDENT , debugMode = this.serviceOptions.debugMode): void {
    const urlPath = `${this.configuration['Server.Prefix']}/${this.configuration['Application.Version']}/${entryPoint.replace(/__/g, '-').replace(/_/g, '/').replace(/\$/g, ':')}`;
    const server = this.server as express.Application;

    if ( debugMode ) {
      console.debug ( `[DEBUG] registerRestfulAPI: (${methodName}) ${urlPath}` ) ;
    }

    server[methodName.toLowerCase() as Keys<express.Application>]( urlPath, (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (RestfulAPIService.validateRequest(req)) {
        handler(req, this.getResponseWithCommonHeaders(res), next, moduleInstance);
      } else {
        RestfulAPIService.sendHttpResponse(
          new Message(null, 'RESTFUL_API_SERVICE.FAIL', 'No player ID'),
          this.getResponseWithCommonHeaders(res)
        );
      }
    }).options(urlPath, (_req: express.Request, res: express.Response) => {
      RestfulAPIService.sendHttpResponse(new Message(null), this.getResponseWithCommonHeaders(res), { headers: { Allow: `${methodName}` }});
    });

    Library.Logger.logInfo(` ${' '.repeat(logIndent - 1)}- ${methodName} ${' '.repeat(6 - methodName.length)} ${urlPath}`); // eslint-disable-line no-magic-numbers
  }


  /**
   * Registers a RESTful API service with the current instance of RestfulAPIService.
   *
   * @param service The RestfulAPIService object to register.
   */
  public registerRestfulRestfulAPIService(service: RestfulAPIService, debugMode = this.serviceOptions.debugMode): void {
    Library.Logger.logInfo(`Register Service: ${service.constructor.name}`);

    for (const subModule of service.subModuleList ?? []) {
      this.registerRestfulAPIModule(subModule, LOG_INDENT, debugMode);
    }
  }


  /**
   * Registers a RESTful API module with the current instance of RestfulAPIService.
   *
   * @param moduleClass The RestfulAPIModule object to register.
   * @param logIndent The indentation level for logging purposes.
   */
  public registerRestfulAPIModule(moduleClass: typeof RestfulAPIModule, logIndent = LOG_INDENT, debugMode = this.serviceOptions.debugMode): void {
    Library.Logger.logInfo(`${' '.repeat(logIndent)}> Register Module: ${module.constructor.name}`);

    const moduleInstance = new moduleClass();

    const restfulExternalFunctionNamePattern = /^(_REST_)(GET|POST|DELETE|PATCH)__(.+$)/;
    for (const restfulExternalFunctionName of Object.getOwnPropertyNames(moduleClass)) {

      const [, , httpMethodName, entryPoint] = restfulExternalFunctionName.match(restfulExternalFunctionNamePattern) ?? [null, null, null, null];
      if ( debugMode ) {
        console.debug (`[DEBUG] Restful function name candidate: ${restfulExternalFunctionName}` ) ;
        console.debug (`[DEBUG] Restful method: ${httpMethodName}` ) ;
        console.debug (`[DEBUG] Restful entry point: ${entryPoint}`) ;
      }

      if (httpMethodName && entryPoint) {
        const propFunc = moduleClass[restfulExternalFunctionName as Keys<typeof moduleClass>];
        if ( debugMode ) { console.debug (`[DEBUG] Restful propFunc type: ${typeof propFunc}` ) ; }

        if (typeof propFunc === 'function') {
          this.registerRestfulAPI(httpMethodName.toUpperCase() as Keys<typeof RestfulAPISupportMethods>, entryPoint, propFunc as unknown as RestfulExternalFunction, moduleInstance, logIndent + LOG_INDENT, debugMode);
        }
      }
    }

    // Customized routes
    moduleInstance.customizeRoutes(this.server as express.Application, `${this.configuration['Server.Prefix']}/${this.configuration['Application.Version']}`);

    // Sub modules
    for (const subModule of moduleInstance.subModuleList ?? []) {
      this.registerRestfulAPIModule(subModule, logIndent + LOG_INDENT, debugMode);
    }
  }


  /**
   * Starts the HTTP server on the specified port.
   * @param {number} serverPort - The port number to listen on.
   */
  public start(serverPort = PORT_HTTP): void {
    const server = this.server as express.Application;

    // ----- [Route] 404 -----
    // Handle requests that do not match any route.
    Library.Logger.logInfo(`  * [Route] ${HTTP_STATUS_NOT_FOUND}`);
    server.use((req: express.Request, res: express.Response) => {
      if (this.configuration.show404Log) {
        Library.Logger.logWarn(`${HTTP_STATUS_NOT_FOUND}: ${req.url}`);
      }
      res.status(HTTP_STATUS_NOT_FOUND).send('Page not found!\n');
    });

    // Start the server and log a message.
    server.listen( serverPort  , () => {
      Library.Logger.logInfo(`${'='.repeat(20)} Service Start (${serverPort}) ${'='.repeat(20)}`); // eslint-disable-line no-magic-numbers
    });
  }


  /**
   * Sends an HTTP response with the specified message object and headers.
   *
   * This method sets the following default headers: "Server-Timestamp-Milliseconds",
   * "Cache-control", "Pragma", and "Server-Path". Additional headers can be specified
   * via the `options` parameter.
   *
   * If debug mode is enabled and the message object contains an error, the error message
   * will be logged to the console.
   *
   * @param message The HTTP message object to send.
   * @param response The express.Response object used to send the response.
   * @param headers The headers object containing additional headers to send with the response.
   */

  public static sendHttpResponse(message: Message<AnyType>, res: express.Response, options?: {headers: TypedRecords<string>}): void {
    const requestPath = `${res.req.method} ${res.req.path}`;

    // Set response headers
    res.setHeader('Server-Timestamp-Milliseconds', Date.now());
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Server-Path', requestPath);

    // Add custom headers from the options object
    Object.entries ( options?.headers ?? {} ).forEach ( ( [key, value] ) => {
      res.setHeader(key,value) ;
    })

    // If debug mode is enabled, log error results
    if (RestfulAPIService.serviceOptions.debugMode && message.error) {
      console.warn(`Error Result (${requestPath})`, message);
    }

    // Send the HTTP message and end the response
    res.send(message);
    res.end();
  }

  /**
   * Validates the express request object.
   *
   * @param req The express.Request object to validate.
   * @returns `true` if the request is valid; `false` otherwise.
   */
  public static validateRequest(req: express.Request): boolean {

    for ( let i = 0 ; i < (this.serviceOptions.requestValidatorList ?? []).length ; i++) {
      if ( ! this.serviceOptions.requestValidatorList?.[i](req) ) { return false ; }
    }
    return true ;
  }

  /**
   * Adds common headers to the given express.Response object.
   *
   * The following headers are set: "Server-Host-ID", "Access-Control-Allow-Origin",
   * "Access-Control-Allow-Methods", "Access-Control-Allow-Headers",
   * "Access-Control-Expose-Headers", "Cache-Control", "Expires", and "Pragma".
   *
   * @param res The express.Response object.
   * @returns The modified express.Response object.
   */
  public getResponseWithCommonHeaders(res: RestfulAPI_Response): RestfulAPI_Response {
    res.setHeader('Server-Host-ID', this.hostID);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');

    const allowHeaderList = ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-HTTP-Method-Override'].concat( RestfulAPIService.serviceOptions.allowedHeaderList ?? [] );
    res.setHeader('Access-Control-Allow-Headers', allowHeaderList.join(',') );

    if ( (RestfulAPIService.serviceOptions.exposeHeaderList ?? []).length ) {
      res.setHeader('Access-Control-Expose-Headers', [(RestfulAPIService.serviceOptions.exposeHeaderList??[]).join(', ')]);
    }
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Expires', '-1');
    res.setHeader('Pragma', 'no-cache');
    return res;
  }


  /**
   * Error handler middleware for the express application.
   *
   * Logs the error to the console and sends a HTTP 500 response with a generic error message.
   *
   * @param err The error object.
   * @param req The RestfulAPI_Request object.
   * @param res The RestfulAPI_Response object.
   * @param next The RestfulAPI_NextFunction object.
   */
  public errorHandler(err: AnyType, req: RestfulAPI_Request, res: RestfulAPI_Response, _next: RestfulAPI_NextFunction): void {
    console.error(err);
    const errorMessage = 'An unexpected error occurred. Please try again later.';
    RestfulAPIService.sendHttpResponse(new Message(null, 'SYSTEM.INTERNAL.FATAL_ERROR', errorMessage), res ) ;
  }
}



export class RestfulAPIModule {
  public subModuleList: Array<typeof RestfulAPIModule> = [];
  public selfModule: OrNull<RestfulAPIModule> = null ;



  /**
   * Customize the routes for the Express application.
   * @param app - The Express application to customize.
   * @param servicePrefix - The prefix for the service's RESTful API routes.
   */
  /* eslint-disable-next-line @typescript-eslint/no-empty-function */
  public customizeRoutes( _app: RestfulAPI_Application, _servicePrefix: string): void {}


  /**
   * A utility function to handle the callback for a RESTful internal API.
   * @param errorCode - The error code to use in the HTTP message in case of an error. Default is "InternalServerError".
   * @param result - The result of the RESTful internal API call.
   * @param callback - The callback function to execute with the HTTP message.
   * @param callbackOptions - Optional additional options for the callback function.
   */

  public static handleRestfulInternalCallback(errorCode: OrNull<string> = null, message: Message<AnyType>, callback: (message: Message<AnyType>, callbackOptions?: AnyType) => void, callbackOptions?: AnyType): void {
    if (message.error) {
      console.log(message.error, message.errorMessage);
      message.setError ( errorCode ?? message.error, message.errorMessage ) ;
      return callback(message, callbackOptions);
    }
    return callback(message);
  }

  /**
   * Execute a RESTful API with the given options.
   * @param options - The options for executing the RESTful API.
   * @param debugMode - Whether to enable debug mode. Default is false.
   */
  public static executeRestfulAPI<T>(options: RestfulAPIExecutionOptions<T>, debugMode = false): void {
    const parameterDictionary: RestfulAPIParameterDictionary = {
      path: options.req.params,
      query: JSON.parse(JSON.stringify(options.req.query)),
      body: options.req.body,
    };
    const inputs: RestfulAPIParameterDictionary & { req: RestfulAPI_Request } = Object.assign(
      { req: options.req },
      parameterDictionary.query,
      parameterDictionary.body,
      parameterDictionary.path
    );

    // Check the input parameters against the checkList.
    for (const parameterSource in options.parameterCheckRules ?? {}) {
      const parameterCheckMessage = parameterCheck(
        parameterDictionary[parameterSource as Keys<RestfulAPIParameterDictionary>] ?? {},
        options.parameterCheckRules[parameterSource as Keys<RestfulAPIParameterCheckRuleDictionary>] ?? null,
        `[${parameterSource}] `,
        debugMode
      );
      if (parameterCheckMessage.error) {
        return RestfulAPIService.sendHttpResponse(parameterCheckMessage, options.req.res as RestfulAPI_Response);
      }
      Object.assign(inputs, parameterCheckMessage.data);
    }

    // Decode the JWT token if it exists in the authorization header.
    if (options.req?.headers?.authorization) {
      const [, tokenString] = (options.req.headers.authorization ?? '').split(' ');
      if (tokenString && tokenString.length) {
        inputs._jwt = Library.Security.decodeJWT(tokenString);
      }
    }

    options.execution(options.errorCode ?? 'UNKNOWN', inputs, (message, httpOptions) => {
      return RestfulAPIService.sendHttpResponse(message, options.req.res as RestfulAPI_Response, httpOptions);
    });
  }
}
