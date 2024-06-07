/* Copyright (C) 2019 by IAdea Corporation, All Rights Reserved. */


import { AnyType, isNullLike, OneOrManyOrNull, OrNull, OrNullCallback } from './extension/Extension.type';
import * as Library from './Library';

const _AsyncPoolChunkSize = 30 ;

/**
 * A type that represents the result of a task function that can be null.
 *
 * @template T The type of the task result.
 */
export type AsyncTaskHelperResult = AnyType;

/**
 * A callback function that handles the result of a task function.
 *
 * @param result The result of the task function.
 */
export type AsyncTaskHelperTaskFunction = (result?: AsyncTaskHelperResult) => void;

/**
 * A type that represents a single task.
 *
 */
export type AsyncTaskHelperTask = { asyncTaskFunction: AsyncTaskHelperTaskFunction; taskName?: string };


/**
 * A callback function that handles the results of multiple tasks.
 *
 * @param resultList An array of task results.
 */
export type AsyncTaskHelperFinalCallback = (resultList?: OrNull<AsyncTaskHelperResult[]>) => void;



/**
 * An enum that defines the modes for executing tasks.
 */
export enum AsyncTaskHelperTaskMode { Queue = 'Queue', Pool = 'Pool', }

export type AsyncTaskHelperOptions = {

  /**
   * A name to associate with the task helper instance.
   */
  name?: '';

  /**
   * Whether to enable debugging for the task helper.
   */
  debug?: boolean;

  /**
   * The mode for executing tasks.
   */
  taskMode?: AsyncTaskHelperTaskMode;

  /**
   * A list of tasks to execute.
   */
  asyncTaskList?: Array<AsyncTaskHelperTask | AsyncTaskHelperTaskFunction>;

  /**
   * A function to call when all tasks have completed.
   */
  finalCallback?: AsyncTaskHelperFinalCallback;
} ;

export class AsyncTaskHelper {

  private static readonly asyncPoolChunkSize = _AsyncPoolChunkSize ;

  private taskMode: AsyncTaskHelperTaskMode = AsyncTaskHelperTaskMode.Queue;
  private asyncTaskList: Array<AsyncTaskHelperTask>= [];
  private asyncTaskResultList: Array<AsyncTaskHelperResult> = [];
  private finalCallback: OrNull<AsyncTaskHelperFinalCallback> = null;

  private isStarted  = false;
  private isFinished = false;
  private isDebug    = false;

  private instanceID = `AsyncTaskHelper::${Library.Security.generateUUID()}`;

  /**
   * Creates a new instance of the TaskHelper class.
   *
   * @param {TaskHelperOptions} options An object containing options for configuring the task helper.
   * @param {Task<AnyType> | TaskCallback<AnyType>} options.taskList A list of tasks to execute.
   * @param {FinalTaskCallback<AnyType>} options.finalTask A function to call when all tasks have completed.
   * @param {TaskMode} options.taskMode The mode for executing tasks.
   * @param {string} options.name A name to associate with the task helper instance.
   * @param {boolean} options.debug Whether to enable debugging for the task helper.
   * @param {boolean} options.isChunked Whether to chunk the task list.
   */
  constructor (options?: AsyncTaskHelperOptions ) {
    if ( options?.name ) { this.instanceID += `::${options.name}` ; }
    this.taskMode      = options?.taskMode      ?? AsyncTaskHelperTaskMode.Queue ;
    this.finalCallback = options?.finalCallback ?? null ;
    this.isDebug       = options?.debug         ?? false ;

    (options?.asyncTaskList ?? []).forEach( (task) => this.add(task) ) ;
  }


  /**
   * Adds one or more tasks to the task list.
   *
   * @param {Task<AnyType> | TaskCallback<AnyType>} taskList A list of tasks to add.
   * @returns {TaskHelper} The current task helper instance.
   */
  public add(asyncTaskList: OneOrManyOrNull<AsyncTaskHelperTask | ( (result?: AsyncTaskHelperResult) => void) >): AsyncTaskHelper {

    if ( ! isNullLike ( asyncTaskList ) ) {
      const availableAsyncTaskList = <AsyncTaskHelperTask[]>(Array.isArray(asyncTaskList) ? asyncTaskList : [asyncTaskList]).map ( (taskCandidate) => {
        switch ( typeof taskCandidate )
        {
          case 'function':
            return { asyncTaskFunction: taskCandidate , taskName: Library.Security.generateUUID() } ;
          default:
            return Object.assign ( {taskName: Library.Security.generateUUID() } , taskCandidate ) ;
        }
      }) ;

      availableAsyncTaskList.forEach((asyncTask, index) => {
        asyncTask.taskName = (asyncTask.taskName ?? `${index}#${asyncTask.asyncTaskFunction?.name}`).trim() ;
        this.asyncTaskList.push(asyncTask);
        if (this.isDebug) { console.debug(this.instanceID, `Add task: $asyncTask.taskName}`); }
      });
    }
    return this;
  }

  /**
   * Starts executing tasks in pool mode.
   *
   * @param {FinalTaskCallback | undefined} finalTaskCallback A callback function to execute when all tasks have completed.
   * @returns {TaskHelper} The current task helper instance.
   */
  public pool(finalCallback?: AsyncTaskHelperFinalCallback): AsyncTaskHelper {
    this.start( finalCallback, AsyncTaskHelperTaskMode.Pool );
    return this;
  }

  /**
   * Starts executing tasks in queue mode.
   *
   * @param {FinalTaskCallback | undefined} finalTaskCallback A callback function to execute when all tasks have completed.
   * @returns {TaskHelper} The current task helper instance.
   */
  public queue(finalCallback?: AsyncTaskHelperFinalCallback): AsyncTaskHelper {
    this.start(finalCallback, AsyncTaskHelperTaskMode.Queue );
    return this;
  }


  /**
   * Starts executing tasks in the specified mode.
   *
   * @param {FinalTaskCallback | undefined} finalCallback A callback function to execute when all tasks have completed.
   * @param {TaskMode} taskMode The mode for executing tasks.
   * @returns {void}
   */
  public start ( finalCallback?: AsyncTaskHelperFinalCallback , taskMode = AsyncTaskHelperTaskMode.Queue ): AsyncTaskHelper {
    if (this.isDebug) {
      console.debug(this.instanceID, `Start Async Tasks (${this.asyncTaskList.length})`);
    }

    this.finalCallback = finalCallback ?? this.finalCallback;
    this.taskMode = taskMode ?? this.taskMode ?? AsyncTaskHelperTaskMode.Queue;

    if ( this.isStarted ) {
      return this ;
    }

    this.isStarted = true;
    if ( 0 === (this.asyncTaskList ?? [] ).length ) { return this.finished(); }

    switch (this.taskMode) {
      default:
        this.processNextQueueTask();
        return this;

      case AsyncTaskHelperTaskMode.Pool:

        if (this.asyncTaskList.length <= AsyncTaskHelper.asyncPoolChunkSize) {
          this.asyncTaskList.forEach((asyncTask) => {
            this.runTask(asyncTask);
          });
        }
        else
        {
          new AsyncTaskHelper ({
            asyncTaskList: this.asyncTaskList.split ( AsyncTaskHelper.asyncPoolChunkSize ).map ( (chunkedAsyncTaskList) => {
              return { asyncTaskFunction: (poolCallback) => {
                  new AsyncTaskHelper ( { debug: this.isDebug , asyncTaskList: chunkedAsyncTaskList }).pool ( (chunkedAsyncTaskResultList) => {
                    poolCallback ( chunkedAsyncTaskResultList ) ;
                  } ) ;
                }
              }
            } )
          }).queue ( (leveledAsyncTaskResultList) => {
            this.asyncTaskResultList = (leveledAsyncTaskResultList ?? [] ).flat();
            this.finished();
          }) ;
        }
        return this ;
      }
  }


  /**
   * Processes the next task in the queue.
   *
   * @returns {void}
   */
  private processNextQueueTask() {

    if (this.isDebug) {
      console.debug(this.instanceID, `Process next task in queue (${this.asyncTaskResultList.length}/${this.asyncTaskList.length})`);
    }

    if ( this.asyncTaskList?.length && this.asyncTaskResultList?.length < this.asyncTaskList?.length ) {
      this.runTask ( this.asyncTaskList[this.asyncTaskResultList.length], this.processNextQueueTask.bind (this) );
    }
  }

  /**
   * Runs the specified async helper task.
   *
   * @param {AsyncTaskHelperTask} asyncHelperTask The async helper task to run.
   * @param {() => void} next The next function to execute after the task is completed.
   * @returns {AsyncTaskHelper} The current task helper instance.
   */
  private runTask(asyncTask: AsyncTaskHelperTask, next: OrNullCallback = null): AsyncTaskHelper {
    if (this.isDebug) {
      console.debug( this.instanceID, `Run ${this.taskMode} Task: ${asyncTask.taskName}`);
    }

    asyncTask.asyncTaskFunction( (result: AsyncTaskHelperResult) => {
      this.asyncTaskFinished( asyncTask, result);
      if ( ! isNullLike ( next ) ) {
        next?.();
      }
    });
    return this;
  }

  /**
   * Quits the current task helper instance.
   *
   * @param {AsyncFinalTask | null} finalCallback The final callback to execute after quitting.
   * @returns {AsyncTaskHelper} The current task helper instance.
   */
  public quit(finalCallback?: AsyncTaskHelperFinalCallback): AsyncTaskHelper {
    if (this.isDebug) {
      console.debug(this.instanceID, 'Quit');
    }

    this.finalCallback = finalCallback ?? null ;
    this.finished();

    return this;
  }



  /**
   * Handles a finished async task.
   *
   * @param {AsyncTaskResult} asyncTaskResult The result of the async task.
   * @param {AsyncTaskHelperTask} asyncTaskItem The async task item that finished.
   * @returns {AsyncTaskHelper} The current task helper instance.
   */
  private asyncTaskFinished(asyncTask: AsyncTaskHelperTask, result?: AsyncTaskHelperResult): AsyncTaskHelper {
    this.asyncTaskResultList.push(result);

    if (this.isDebug) {
      console.debug(this.instanceID, `Task finished: [${this.taskMode}] ${asyncTask.taskName}` );
    }

    if ( (this.asyncTaskResultList ?? []).length >= this.asyncTaskList?.length) {
      this.finished();
    }

    return this;
  }


  private finished(): AsyncTaskHelper {

    if ( this.isFinished ) { return this ;}
    this.isFinished = true;

    if (this.isDebug) {
      console.debug(this.instanceID, 'All tasks finished');
    }

    if ( ! isNullLike ( this.finalCallback ) ) {
      this.finalCallback?.(this.asyncTaskResultList);
    }
    return this;
  }
}
