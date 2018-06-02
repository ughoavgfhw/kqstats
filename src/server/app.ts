import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as socket_io from 'socket.io';
import { KQStream, KQStreamOptions } from '../lib/KQStream';
import { GameStats } from '../lib/GameStats';
import { Match, MatchState } from '../lib/MatchState';
import { ScoreApi, TeamsApi } from '../overlay/server/api';
import { TwitchChatClient } from '../twitch/chat';
import { TwitchSettingsApi } from '../twitch/SettingsApi';

if (process.argv.length !== 4) {
    throw new Error('Incorrect usage!');
}

const options: KQStreamOptions = {};
if (process.env.ENV === 'development') {
    options.log = process.stdout;
}

const stream = new KQStream(options);
const gameStats = new GameStats(stream);
gameStats.start();
const match = new Match();

if (process.argv[2] === '-r') {
    stream.read(fs.readFileSync(process.argv[3], 'utf8'));
} else if (process.argv[2] === '-c') {
    stream.connect(process.argv[3]).catch((error) => {
        // Such a hack, but it will throw the error
        // and stop execution of server and client,
        // as desired.
        setTimeout(() => {
            throw error;
        });
    });
} else {
    throw new Error('Invalid argument!');
}

const app = express();
app.use(bodyParser.json());
const server = new http.Server(app);

const io = socket_io(server);
io.on('connection', (socket) => {
    const id = gameStats.on('change', (data) => {
        socket.emit('stat', data);
    });
    socket.on('disconnect', () => {
        gameStats.off('change', id);
    });
    gameStats.trigger('change');
});
io.of('/match').on('connection', (socket) => {
    const scoreId = match.on('score', (data) => socket.emit('score', data));
    const settingsId = match.on('configured',
                                (data) => socket.emit('settings', data));
    const teamsId = match.on('teams', (data) => socket.emit('teams', data));
    socket.on('disconnect', () => {
        match.off('score', scoreId);
        match.off('configured', settingsId);
        match.off('teams', teamsId);
    });
    match.trigger('score', scoreId);
    match.trigger('configured', settingsId);
    match.trigger('teams', teamsId);
});

app.use('/api/scores',
        ScoreApi({
            matchState: (state: MatchState) => match.setMatchState(state),
            reset: () => match.reset(),
        }));
app.use('/api/teams', TeamsApi());

stream.on('currentmatch', (data) => {
        match.setMatchState({
                settings: { seriesLength: data.bestOf },
                currentTeams: {
                    blue: { name: data.teams[0] },
                    gold: { name: data.teams[1] },
                },
                scores: { blue: data.scores[0], gold: data.scores[1] },
            });
    });

const chat = new TwitchChatClient();
app.use('/api/twitch', TwitchSettingsApi(chat));
stream.on('currentmatch', (data) => {
    if (!data.concluded) { return; }
    if (data.scores[0] > data.scores[1]) {
        chat.broadcastMessage(`${data.teams[0]} defeats ${data.teams[1]}, ` +
                              `${data.scores[0]} - ${data.scores[1]}`);
    } else if (data.scores[1] > data.scores[0]) {
        chat.broadcastMessage(`${data.teams[1]} defeats ${data.teams[0]}, ` +
                              `${data.scores[1]} - ${data.scores[0]}`);
    } else {
        chat.broadcastMessage(`${data.teams[0]} and ${data.teams[1]} tie, ` +
                              `${data.scores[0]} - ${data.scores[1]}`);
    }
    if (data.nextMatchTeams !== undefined) {
        chat.broadcastMessage(`Next up: ${data.nextMatchTeams[0]} ` +
                              `vs ${data.nextMatchTeams[1]}`);
    }
});

server.listen(8000);
