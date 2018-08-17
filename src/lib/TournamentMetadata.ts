export interface PlayerMetadata {
    name: string;
    preferredPronouns?: string;
    imageLocation?: string;
}

export interface TeamMetadata {
    name: string;
    players: PlayerMetadata[];
}

export function ParseTeamConfig(config: string): TeamMetadata[] {
    const teams: TeamMetadata[] = [];
    for (let line of config.split('\n')) {
        if (line.length === 0) { continue; }
        const parts = line.split(',');
        if (parts[0][0] !== '\t') {
            teams.push({ name: parts[0], players: [] });
        } else {
            const newPlayer: PlayerMetadata = { name: parts[0].substr(1) };
            if (parts.length >= 2) {
                newPlayer.preferredPronouns = parts[1];
            }
            teams[teams.length - 1].players.push(newPlayer);
        }
    }
    return teams;
}
