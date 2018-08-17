import * as fs from 'fs';
import { TeamMetadata, ParseTeamConfig } from '../lib/TournamentMetadata';

export type TeamMap = {
    [teamName: string]: TeamMetadata;
};

export class TeamWatcher {
    private teams: TeamMap;
    private watcher: any;

    private static loadTeams(): TeamMap {
        let teams: TeamMetadata[] = [];
        if (fs.existsSync('teams.conf')) {
            teams = ParseTeamConfig(fs.readFileSync('teams.conf', 'utf8'));
        } else if (fs.existsSync('teamNames.txt')) {
            // The old format of just team names one per line is
            // compatible with the new config format, so reuse the
            // parser.
            teams = ParseTeamConfig(fs.readFileSync('teamNames.txt', 'utf8'));
        }
        console.log(`Loaded ${teams.length} teams`);
        const result = {};
        for (const team of teams) {
            result[team.name] = team;
        }
        return result;
    }

    constructor() {
        this.teams = TeamWatcher.loadTeams();
        this.watcher =
            fs.watch('teams.conf', { persistent: false },
                     (_) => { this.teams = TeamWatcher.loadTeams(); });
    }

    get(): TeamMap {
        return this.teams;
    }
}
