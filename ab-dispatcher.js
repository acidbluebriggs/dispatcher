import _ from 'lodash';
import {invariant} from './invariant';

const _prefix = 'ID_';

////////////////////////////////////////////////////////////////////////////////
// A signification amount of code has been borrowed from Facebook's Flux
// Dispatcher.
///////////////////////////////////////////////////////////////////////////////

/*
 BSD License

 For Flux software

 Copyright (c) 2014-2015, Facebook, Inc. All rights reserved.

 Redistribution and use in source and binary forms, with or without modification,
 are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.

 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.

 * Neither the name Facebook nor the names of its contributors may be used to
 endorse or promote products derived from this software without specific
 prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * This dispatcher allows for more convenient registration and
 * de-registration of stores/consumers.
 *
 * This dispatcher has several modes of registration:
 *
 * 1) The @{link register} is the default "facebook way" of registering
 *    callbacks within the dispatcher.
 *
 * 2) The @{link register} function which registers a callback with a specific event.
 *
 * 3) The @{link registerArgs} function which registers a variable list of tuples representing
 *    events and their corresponding handler/callbacks.
 *
 */
export class Dispatcher {

  constructor() {
    this._callbacks = {};
    this._isDispatching = false;
    this._isHandled = {};
    this._isPending = {};
    this._lastID = 1;
  }

  /**
   * Registers the given callback with the dispatcher. The callback is responsible for
   * inspecting the payload's actionType property to decide whether or not it should handle
   * the given event.
   *
   * The callback's payload is in the format:
   *
   * {
   *   actionType:stringValue,
   *   value: someArbitraryValue
   * }
   *
   * @param callback in the format: (payload) => {}.
   * @returns {Function} A dispose function to remove the callback from the dispatcher. This function
   * also contains the property 'dispatchToken' so a user can know which token was assigned by the
   * dispatcher in case a caller wishes to expose this property to be used in the {@link waitFor} method.
   */
  register(callback) {
    let token = this._register(callback);

    let a = () => this._unregister(token);

    a.dispatchToken = token;

    return a;
  }

  /**
   * Register a callback to a specific event type.
   *
   * The callback's payload is in the format:
   *
   * {
   *   actionType:stringValue,
   *   value: someArbitraryValue
   * }
   *
   * @param event The event name as a string
   * @param callback in the format: (payload) => {}.
   * @returns {Function}
   */
  registerCallback(event, callback){

    let token = this._register((payload) => {
      if (payload.actionType === event) {
        callback(payload.actionType, payload.value);
      }
    });

    let a = () => this._unregister(token);
    a.dispatchToken = token;
    return a;
  }

  /**
   * This registration method takes in a variable list of tuples in the format of
   * <code>
   *   [EventName, CallbackFunction]
   * </code>
   *
   * The callback's payload is in the format:
   *
   * {
   *   actionType:stringValue,
   *   value: someArbitraryValue
   * }
   *
   * @param args Args is a variable list of arguments of tuples of length 2. I.E.
   * [EventName, CallbackFunction].;
   * @return a function for de-registering from the dispatcher. The function returned also contains
   * a "dispatchToken" property which is the name for the subscriber was assigned from the dispatcher.
   * This can be used in the waitFor(id) function.*
   */
  registerArgs(...args) {

    let events = new Map();

    args.forEach((arg) => {
      events.set(...arg)
    });

    let token = this._register((payload) => {
      let handler = events.get(payload.actionType);

      if (!handler) return;

      handler(payload.actionType, payload.value);
    });

    let a = () => this._unregister(token);

    a.dispatchToken = token;

    return a;
  }

  /**
   * Dispatches an event to all registered stores with the given value.
   *
   * @param event A string representing the event type
   * @param value The value to pass to the consumes
   */
  dispatch(event, value) {
    invariant(
      !this._isDispatching,
      'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
    );

    this._startDispatching({
      actionType: event,
      value: value
    });

    try {
      for (var id in this._callbacks) {
        if (this._isPending[id]) {
          continue;
        }
        this._invokeCallback(id);
      }
    } finally {
      this._stopDispatching();
    }
  }

  /**
   * Will wait for other stores (based on it's subscription function or by it's dispatchToken)
   * to finish their before the caller will process events it has received.
   *
   * @param tokens Either an array of dispatch token, subscription functions (each function contains a property
   *  of 'dispatchToken').
   * @returns
   */
  waitFor(...tokens) {
    invariant(
      this._isDispatching,
      'Dispatcher.waitFor(...): Must be invoked while dispatching.'
    );

    let ids = tokens.map(id => id.dispatchToken || id);

    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this._isPending[id]) {
        invariant(
          this._isHandled[id],
          'Dispatcher.waitFor(...): Circular dependency detected while ' +
          'waiting for `%s`.',
          id
        );
        continue;
      }
      invariant(
        this._callbacks[id],
        'Dispatcher.waitFor(...): `%s` does not map to a registered callback.',
        id
      );

      this._invokeCallback(id);
    }
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   */
  _register(callback) {
    var id = _prefix + this._lastID++;
    this._callbacks[id] = callback;
    return id;
  }

  /**
   * Removes a callback based on its token.
   */
  _unregister(id): void {
    invariant(
      this._callbacks[id],
      'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
      id
    );
    delete this._callbacks[id];
  }

  /**
   * Is this Dispatcher currently dispatching.
   */
  isDispatching(): boolean {
    return this._isDispatching;
  }

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @internal
   */
  _invokeCallback(id): void {
    this._isPending[id] = true;
    this._callbacks[id](this._pendingPayload);
    this._isHandled[id] = true;
  }

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @internal
   */
  _startDispatching(payload): void {
    for (var id in this._callbacks) {
      this._isPending[id] = false;
      this._isHandled[id] = false;
    }
    this._pendingPayload = payload;
    this._isDispatching = true;
  }

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */
  _stopDispatching(): void {
    delete this._pendingPayload;
    this._isDispatching = false;
  }
}