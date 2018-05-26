/**
 * Many thanks to Tony for his awesome work on kqdeathmap:
 * https://github.com/arantius/kqdeathmap
 */

import * as websocket from 'websocket';
import * as stream from 'stream';
import * as uuid from 'uuid/v4';

type Partial<T> = { [P in keyof T]?: T[P] };

type Merger<T, P> = {
    types: T;
    parsers: P;
    m: <K extends string, D>(this: { types: T; parsers: P; },
                             _: { [k in K]: (_: string) => D; }) =>
        Merger<T & { [k in K]: D; }, P & { [k in K]: (_: string) => D; }>;
};
function merge<T, P, K extends string, D>(t: { types: T; parsers: P; },
                                          u: { [k in K]: (_: string) => D; }) {
    type T2 = T & { [k in K]: D; };
    type P2 = P & { [k in K]: (_: string) => D; };
    let result: { types: Partial<T2>;
                  parsers: Partial<P2>;
    } & Merger<T, P> = t as Merger<T, P>;
    for (let k of Object.keys(u)) {
        result.parsers[k] = u[k];
    }
    return result as Merger<T2, P2>;
}
const merger = {
    types: {},
    parsers: {},
    m: function<K extends string, D>(this: { types: {}; parsers: {}; },
                                     other: { [k in K]: (_: string) => D; }) {
        return merge(this, other);
    }
};

// ***** Supported message type setup
// This section controls which message types are parsed and sent to callbacks,
// and what their parsed data types are. To add a new message type: define the
// data type and parse function in another file, import it here, and add it to
// the merger. The value merged in should be an object with a property whose
// name matches the message name and value is a function that takes a string
// and returns the parsed data type. Multiple event handlers may only be added
// in the same object if they have the same data type. See below for examples.

import { parseActiveMatchStreamMessage } from './stream_messages/ActiveMatch';
import { PlayerNames, parsePlayerNamesStreamMessage } from './stream_messages/PlayerNames';
import { PlayerKill, parsePlayerKillStreamMessage } from './stream_messages/PlayerKill';

const merged = merger.m(
    { currentmatch: parseActiveMatchStreamMessage,
      nextmatch: parseActiveMatchStreamMessage }).m(
    { playernames: parsePlayerNamesStreamMessage }).m(
    { playerKill: parsePlayerKillStreamMessage });

// ***** End supported message type setup

// Re-exporting types which used to be defined here.
export type PlayerNames = PlayerNames;
export type PlayerKill = PlayerKill;

type KQEventValueTypes = typeof merged.types;

export type KQEventType = keyof KQEventValueTypes;

export type KQEventCallback<T> = (event: T) => any;

interface KQEventCallbackDictionary<E extends KQEventType> {
    [id: string]: KQEventCallback<KQEventValueTypes[E]>;
}

const eventDataParsers = merged.parsers;

export interface KQStreamOptions {
    log?: stream.Writable;
}

export class KQStream {
    private client: websocket.client;
    private connection: websocket.connection;

    private eventCallbacks: {
        // Entries are optional so that the constructor doesn't need to be
        // updated when a new event is added. Instead, the dictionaries are
        // created when they are first used.
        [E in KQEventType]?: KQEventCallbackDictionary<E>;
    };

    private log: stream.Writable;

    constructor(options?: KQStreamOptions) {
        this.eventCallbacks = {};
        if (options !== undefined) {
            if (options.log !== undefined) {
                this.log = options.log;
            }
        }
    }

    async connect(host: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.client = new websocket.client();
            this.client.on('connectFailed', (err) => {
                reject(err);
            });
            this.client.on('connect', (connection) => {
                this.connection = connection;
                connection.on('message', (data) => {
                    if (data !== undefined && data.utf8Data !== undefined) {
                        const message = data.utf8Data.toString();
                        this.processMessage(message);
                    }
                });
                resolve();
            });
            this.client.connect(host);
        });
    }

    read(data: string): void {
        const lines = data.split('\n');
        if (data[data.length - 1] === '\n') {
            lines.splice(lines.length - 1, 1);
        }
        const start = Number(lines[0].split(',')[0]);
        for (let line of lines) {
            const lineArray = line.split(',');
            const timestamp = Number(lineArray[0]);
            lineArray.splice(0, 1);
            const message = lineArray.join(',');
            setTimeout(() => {
                this.processMessage(message);
            }, timestamp - start);
        }
    }

    on<E extends KQEventType>(
        eventType: E, callback: KQEventCallback<KQEventValueTypes[E]>): string {
        if (this.eventCallbacks[eventType] === undefined) {
            this.eventCallbacks[eventType] = {};
        }
        const callbacks =
            this.eventCallbacks[eventType] as KQEventCallbackDictionary<E>;
        let id = uuid();
        while (callbacks[id] !== undefined) {
            id = uuid();
        }
        callbacks[id] = callback;
        return id;
    }

    /**
     * Removes the specified callback for a certain event,
     * or all callbacks if no id is provided.
     * 
     * @param eventType The event type for which to remove callback(s)
     * @param id The id of the callback to remove. If not specified,
     *           all callbacks are removed.
     * @returns True if callback(s) were removed. When an id is specified,
     *          true will be returned if a callback existed for the id.
     *          If no id is specified, true will be returned if there
     *          were any callbacks for the event type.
     */
    off<E extends KQEventType>(eventType: E, id?: string): boolean {
        if (this.eventCallbacks[eventType] === undefined) {
            return false;
        }
        const callbacks =
            this.eventCallbacks[eventType] as KQEventCallbackDictionary<E>;
        let removed = false;
        if (id !== undefined) {
            if (callbacks[id] !== undefined) {
                delete callbacks[id];
                removed = true;
            }
        } else {
            removed = Object.keys(callbacks).length > 0;
            this.eventCallbacks[eventType] = {};
        }
        return removed;
    }

    private processMessage(message: string): void {
        if (this.log !== undefined) {
            this.log.write(`${Date.now().toString()},${message}\n`);
        }
        const dataArray = message.match(/^!\[k\[(.*)\],v\[(.*)\]\]!$/);
        if (!dataArray) {
            console.warn('Could not parse message', message);
            return;
        }
        const [_, key, value] = dataArray;

        switch (key) {
        case 'alive':
            this.sendMessageRaw('im alive', '');
            break;
        default:
            if (key in eventDataParsers) {
                const eventType = key as KQEventType;
                this.performCallbacks(eventType,
                                      eventDataParsers[eventType](value));
            }
            break;
        }
    }

    private performCallbacks<E extends KQEventType>(
        eventType: E, value: KQEventValueTypes[E]): void {
        if (this.eventCallbacks[eventType] === undefined) { return; }
        const callbacks =
            this.eventCallbacks[eventType] as KQEventCallbackDictionary<E>;
        for (let id of Object.keys(callbacks)) {
            callbacks[id](value);
        }
    }

    private sendMessageJSON(key: string, value: any): void {
        this.sendMessageRaw(key, JSON.stringify(value));
    }

    private sendMessageRaw(key: string, value: string): void {
        if (this.connection !== undefined) {
            const message = `![k[${key}],v[${value}]]!`;
            const buffer = Buffer.from(message, 'utf8');
            this.connection.send(buffer);
        }
    }
}
