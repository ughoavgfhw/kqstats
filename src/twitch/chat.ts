import * as websocket from 'websocket';
import * as IRC from './IRC';

const TWITCH_SOCKET_HOST = 'wss://irc-ws.chat.twitch.tv:443/';

interface ChannelData {
    joinHandler?: (_?: any) => void;
    joinTimeout?: any;
}

export class TwitchChatClient {
    private client: websocket.client = new websocket.client();
    private connection?: websocket.connection = undefined;
    private connectedUsername: string;
    private channels: { [cd: string]: ChannelData; } = {};

    private postLoginHandler: (_?: any) => void;
    private loginTimeout: any;

    public get connected(): boolean {
        return this.connection !== undefined;
    }

    public get username(): string {
        return this.connectedUsername;
    }

    public get channelNames(): string[] {
        return Object.keys(this.channels);
    }

    public async connect(username: string, password: string): Promise<void> {
        this.connectedUsername = username;
        return new Promise<void>((resolve, reject) => {
            this.client.on('connectFailed', (err) => {
                reject(err);
            });
            this.client.on('connect', (connection) => {
                this.connection = connection;
                connection.on('close', () => {
                    delete this.connection;
                });
                connection.on('message', (data) => {
                    if (data !== undefined && data.utf8Data !== undefined) {
                        const message = data.utf8Data.toString();
                        this.processMessage(message);
                    }
                });
                this.postLoginHandler = err => {
                    clearTimeout(this.loginTimeout);
                    delete this.postLoginHandler;
                    delete this.loginTimeout;
                    if (err !== undefined) {
                        reject(err);
                        this.disconnect();
                    } else {
                        resolve();
                    }
                };
                this.loginTimeout = setTimeout(() => {
                        if (this.postLoginHandler !== undefined) {
                            this.postLoginHandler(
                                `could not connect as ${username}`);
                        }
                    }, 5000);
                this.sendRaw(`PASS ${password}`);
                this.sendRaw(`NICK ${username}`);
            });
            this.client.connect(TWITCH_SOCKET_HOST, 'irc');
        });
    }

    public async join(channel: string): Promise<void> {
        if (this.connection === undefined) {
            return Promise.reject('not connected to the Twitch server');
        }
        if (this.channels[channel] !== undefined) {
            return Promise.reject(`already on channel ${channel}`);
        }
        const cd: ChannelData = {};
        this.channels[channel] = cd;
        return new Promise<void>((resolve, reject) => {
            cd.joinHandler = err => {
                clearTimeout(cd.joinTimeout);
                delete cd.joinHandler;
                delete cd.joinTimeout;
                if (err !== undefined) { reject(err); } else { resolve(); }
            };
            cd.joinTimeout = setTimeout(() => {
                    if (cd.joinHandler !== undefined) {
                        cd.joinHandler(`could not join channel ${channel}`);
                    }
                }, 5000);
            this.sendRaw(`JOIN ${channel}`);
        });
    }

    public leave(channel: string) {
        if (this.channels[channel] === undefined) { return; }
        delete this.channels[channel];
        this.sendRaw(`PART ${channel}`);
    }

    public disconnect() {
        if (this.connection === undefined) { return; }
        const channelNames = Object.keys(this.channels);
        for (let channel of channelNames) { this.leave(channel); }
        this.connection.close();
    }

    public sendMessage(channel: string, message: string) {
        this.sendRaw(`PRIVMSG #${channel} :${message}`);
    }

    public broadcastMessage(message: string) {
        const channels = Object.keys(this.channels);
        if (channels.length === 0) { return; }
        // Note: This could send to channels which are still being joined.
        this.sendMessage(channels.join(',#'), message);
    }

    private processMessage(message: string) {
        for (let line of message.split('\r\n')) {
            if (line === '') { continue; }
            const parsed = IRC.parseMessage(line);
            if (parsed.command === 'PING') {
                this.sendRaw(`PONG :${parsed.params[0]}`);
            } else if (parsed.command === 'JOIN') {
                const channel = parsed.params[0];
                if (this.channels[channel] !== undefined) {
                    const handler = this.channels[channel].joinHandler;
                    if (handler !== undefined) {
                        handler();
                    }
                }
            } else if (/^\d\d\d$/.test(parsed.command)) {
                const code = Number(parsed.command);
                if (code === 1 && this.postLoginHandler !== undefined) {
                    this.postLoginHandler();
                }
                if (code >= 400 && code < 600) {
                    console.error('Error from IRC', line);
                }
            }
        }
    }

    private sendRaw(message: string) {
        if (this.connection === undefined) { return; }
        this.connection.sendUTF(message);
    }
}
