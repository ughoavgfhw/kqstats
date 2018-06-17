import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as socket_io from 'socket.io';
import { KQStream, KQStreamOptions } from '../lib/KQStream';
import { GameStats, KQStat } from '../lib/GameStats';
import { Match, MatchCurrentTeams, MatchScore, MatchSettings, MatchState } from '../lib/MatchState';
import { ParseTeamConfig } from '../lib/TournamentMetadata';
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
    const changeListener = (data: KQStat) => {
        socket.emit('stat', data);
    };
    const id = gameStats.on('change', changeListener);
    socket.on('disconnect', () => {
        gameStats.removeListener('change', changeListener);
    });
    gameStats.trigger('change');
});
io.of('/match').on('connection', (socket) => {
    const scoreCallback = (data: MatchScore) => socket.emit('score', data);
    const settingsCallback =
        (data: MatchSettings) => socket.emit('settings', data);
    const teamsCallback =
        (data: MatchCurrentTeams) => socket.emit('teams', data);
    match.on('score', scoreCallback);
    match.on('configured', settingsCallback);
    match.on('teams', teamsCallback);
    socket.on('disconnect', () => {
        match.removeListener('score', scoreCallback);
        match.removeListener('configured', settingsCallback);
        match.removeListener('teams', teamsCallback);
    });
    match.trigger('score');
    match.trigger('configured');
    match.trigger('teams');
});

app.use('/api/scores',
        ScoreApi({
            matchState: (state: MatchState) => match.setMatchState(state),
            reset: () => match.reset(),
        }));
app.use('/api/teams',
        TeamsApi({
            getTeams: () => {
                if (fs.existsSync('teams.conf')) {
                    return ParseTeamConfig(fs.readFileSync('teams.conf',
                                                           'utf8'));
                } else if (fs.existsSync('teamNames.txt')) {
                    // The old format of just team names one per line is
                    // compatible with the new config format, so reuse the
                    // parser.
                    return ParseTeamConfig(fs.readFileSync('teamNames.txt',
                                                           'utf8'));
                } else {
                    console.log('No team names: teams.conf does not exist');
                }
                return [];
            }
        }));

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
