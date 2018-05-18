/**
 * Many thanks to Tony for his awesome work on kqdeathmap:
 * https://github.com/arantius/kqdeathmap
 */

import * as websocket from 'websocket';
import * as stream from 'stream';
import * as uuid from 'uuid/v4';

export enum Character {
    GoldQueen = 1,
    BlueQueen = 2,
    GoldStripes = 3,
    BlueStripes = 4,
    GoldAbs = 5,
    BlueAbs = 6,
    GoldSkulls = 7,
    BlueSkulls = 8,
    GoldChecks = 9,
    BlueChecks = 10
}

export interface PlayerNames {}

export interface Position {
    x: number;
    y: number;
}

export interface PlayerKill {
    pos: Position;
    killed: Character;
    by: Character;
}

// This type is only used during compilation. Its purpose is to:
// 1. Define the known event types, defined by the member names, and
// 2. Set the value type used in callbacks, defined by the member types.
type KQEventValueTypes = {
    playernames: PlayerNames;
    playerKill: PlayerKill;
};

export type KQEventType = keyof KQEventValueTypes;

export type KQEventCallback<T> = (event: T) => any;

const eventDataGenerators: {
    [E in KQEventType]: (data: string) => KQEventValueTypes[E];
} = {
    playernames: (data) => {
        // Not sure what the values of the message mean,
        // so just pass an empty object for now.
        return {};
    },
    playerKill: (data) => {
        const [x, y, by, killed] = data.split(',');
        return {
            pos: {
                x: Number(x),
                y: Number(y)
            },
            killed: Number(killed),
            by: Number(by)
        };
    },
};

interface KQEventCallbackDictionary<E extends KQEventType> {
    [id: string]: KQEventCallback<KQEventValueTypes[E]>;
}

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
            if (key in eventDataGenerators) {
                const eventType = key as KQEventType;
                this.performCallbacks(eventType,
                                      eventDataGenerators[eventType](value));
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
