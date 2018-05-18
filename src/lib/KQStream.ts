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

export type KQEventCallback<T> = (event: T) => any;

interface KQEventCallbackDictionary<T> {
    [id: string]: KQEventCallback<T>;
}

export interface KQStreamOptions {
    log?: stream.Writable;
}

export class KQStream {
    private client: websocket.client;
    private connection: websocket.connection;

    private eventCallbacks: { [event: string]: KQEventCallbackDictionary<any> };

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

    on(eventType: 'playernames', callback: KQEventCallback<PlayerNames>): string;
    on(eventType: 'playerKill', callback: KQEventCallback<PlayerKill>): string;
    on(eventType: string, callback: KQEventCallback<any>): string {
        if (this.eventCallbacks[eventType] === undefined) {
            this.eventCallbacks[eventType] = {};
        }
        let id = uuid();
        while (this.eventCallbacks[eventType][id] !== undefined) {
            id = uuid();
        }
        this.eventCallbacks[eventType][id] = callback;
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
    off(eventType: string, id?: string): boolean {
        if (this.eventCallbacks[eventType] === undefined) {
            return false;
        }
        let removed = false;
        if (id !== undefined) {
            if (this.eventCallbacks[eventType][id] !== undefined) {
                delete this.eventCallbacks[eventType][id];
                removed = true;
            }
        } else {
            removed = Object.keys(this.eventCallbacks[eventType]).length > 0;
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

        const callbacks = this.eventCallbacks[key];
        const ids: string[] = callbacks !== undefined ? Object.keys(callbacks)
                                                      : [];

        function send<T>(msg: T) {
            for (let id of ids) {
                const callback = callbacks[id] as KQEventCallback<T>;
                callback(msg);
            }
        }

        switch (key) {
        case 'alive':
            this.sendMessageRaw('im alive', '');
            break;
        case 'playernames':
            // Not sure what the values of the message mean,
            // so just pass an empty object for now.
            send<PlayerNames>({});
            break;
        case 'playerKill':
            const [x, y, by, killed] = value.split(',');
            const playerKill: PlayerKill = {
                pos: {
                    x: Number(x),
                    y: Number(y)
                },
                killed: Number(killed),
                by: Number(by)
            };
            send<PlayerKill>(playerKill);
            break;
        default:
            break;
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
