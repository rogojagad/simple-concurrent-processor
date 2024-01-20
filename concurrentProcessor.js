const _ = require("lodash");
const EventEmitter = require("events");

const ConcurrentConstant = {
    DEFAULT_MAX_CONCURRENT: 10,
    DEFAULT_WAITING_DURATION: 3000,
};

class ConcurrentTracker {
    _counterIncoming;
    _counterProceed;

    constructor() {
        this._counterIncoming = 0;
        this._counterProceed = 0;
    }

    _increaseCounterIncoming() {
        this._counterIncoming++;
    }

    _increaseCounterProceed() {
        this._counterProceed++;
    }

    isOnprogress() {
        return this._counterProceed < this._counterIncoming;
    }
}

class ConcurrentHandler extends ConcurrentTracker {
    _eventEmitter;
    _taskQueue;
    _maxConcurrent;
    _waitingDuration;
    _callbackExecution;
    _callbackErrorHandler;
    _startTime;

    /**
     * Class do execute multiple items with same process concurrently
     * 
     * @param {{execution: function}} callback - function: method to be executed, errorHandler: method to be executed if error happens
     * @param {{waitingDuration: number, maxConcurrent: number}} options - waitingDuration: interval to check completion status until all process are completed, maxConcurrent: number of concurrent process to be executed
     */
    constructor(callback, options) {
        super();
        this._taskQueue = [];
        this._waitingDuration = _.get(
            options,
            "waitingDuration",
            ConcurrentConstant.DEFAULT_WAITING_DURATION,
        );
        const maxConcurrent = _.get(options, "maxConcurrent");
        this.setMaxConcurrent(maxConcurrent);
        this.setCallback(callback);
        this._initEventEmitter();
    }

    setMaxConcurrent(maxConcurrent) {
        if (!maxConcurrent || maxConcurrent < 1)
            maxConcurrent = ConcurrentConstant.DEFAULT_MAX_CONCURRENT;
        this._maxConcurrent = maxConcurrent;
    }

    setCallback(callback) {
        if (!callback.execution)
            console.warn("Callback is undefined, no specific execution!");
        this._callbackExecution = callback.execution;
        this._callbackErrorHandler = callback.errorHandler;
    }

    _initEventEmitter() {
        this._eventEmitter = new EventEmitter();
        // register handler of event
        this._eventEmitter.on("next", this._next);
    }

    async _execute(object) {
        if (this._callbackExecution) await this._callbackExecution(object);
        else console.log("do nothing");
    }

    async _handleError(error) {
        if (this._callbackErrorHandler) await this._callbackErrorHandler(error);
        else console.error(error);
    }

    add(object) {
        if (!this._startTime) this._startTime = new Date();

        this._increaseCounterIncoming();
        const counterConcurrent = this._counterIncoming - this._counterProceed;
        if (counterConcurrent <= this._maxConcurrent) {
            this._doExecution(object);
        } else this._taskQueue.push(object);
    }

    async _doExecution(object) {
        try {
            await this._execute(object);
        } catch (error) {
            await this._handleError(error);
        } finally {
            // finished task counter
            this._increaseCounterProceed();

            console.log(
                `Concurrent handler finish execute ${this._counterProceed} of ${this._counterIncoming} items`,
            );

            // if the task queue is not empty then continue to process next task
            if (this._taskQueue.length > 0) this._eventEmitter.emit("next", this);
        }
    }

    _pickObject() {
        // dequeue task from queue
        return this._taskQueue.shift();
    }

    _next(clazz) {
        const object = clazz._pickObject();
        if (object) clazz._doExecution(object);
    }

    async _sleep(duration) {
        new Promise((res) => {
            setTimeout(res, duration);
        });
    }

    async wait() {
        // wait until all concurrent is finished
        do {
            //repeated as long as a condition is true
            await this._sleep(this._waitingDuration);
        } while (this.isOnprogress());

        return new Date() - this._startTime;
    }
}

module.exports = ConcurrentHandler;
