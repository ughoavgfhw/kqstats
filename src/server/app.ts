import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as socket_io from 'socket.io';
import { KQStream, KQStreamOptions } from '../lib/KQStream';
import { GameStats } from '../lib/GameStats';
import { Match, MatchCurrentTeams, MatchState } from '../lib/MatchState';
import { ScoreApi, TeamsApi } from '../overlay/server/api';
import { TwitchChatClient } from '../twitch/chat';
import { TwitchSettingsApi } from '../twitch/SettingsApi';
import * as SocketData from './SocketData';
import { TeamMap, TeamWatcher } from './TeamWatcher';

if (process.argv.length !== 4) {
    throw new Error('Incorrect usage!');
}

const options: KQStreamOptions = {};
if (process.env.ENV === 'development') {
    options.log = process.stdout;
}

function findTeamOrDefault(name: string | undefined,
                           teamMap: TeamMap) {
    if (name === undefined) {
        return { name: '', players: [] };
    }
    const team = teamMap[name];
    if (team !== undefined) {
        return team;
    }
    return { name: name, players: [] };
}

const stream = new KQStream(options);
const gameStats = new GameStats(stream);
gameStats.start();
const match = new Match();
const teams = new TeamWatcher();

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
    const changeListener = (data: SocketData.root_stat) => {
        socket.emit('stat', data);
    };
    const id = gameStats.on('change', changeListener);
    socket.on('disconnect', () => {
        gameStats.removeListener('change', changeListener);
    });
    gameStats.trigger('change');
});
io.of('/match').on('connection', (socket) => {
    const scoreCallback =
        (data: SocketData.match_score) => socket.emit('score', data);
    const settingsCallback =
        (data: SocketData.match_settings) => socket.emit('settings', data);
    const teamsCallback =
        (data: SocketData.match_teams) => socket.emit('teams', data);
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
io.of('/status').on('connection', (socket) => {
    const teamsCallback =
        (data: MatchCurrentTeams) => {
        const teamMap = teams.get();
        const payload: SocketData.status_teams = {
            blue: findTeamOrDefault(data.blue.name, teamMap),
            gold: findTeamOrDefault(data.gold.name, teamMap),
        };
        socket.emit('teams', payload);
    };
    match.on('teams', teamsCallback);
    socket.on('disconnect', () => {
        match.removeListener('teams', teamsCallback);
    });
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
                return Object.keys(teams.get()).map(
                    (n) => { return { name: n }; });
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
                status: data.concluded ? 'complete' : 'in_progress',
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
