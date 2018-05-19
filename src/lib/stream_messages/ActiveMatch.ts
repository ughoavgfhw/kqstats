export interface ActiveMatch {
    id: number;
    bestOf: number;
    teams: string[];
    scores: number[];
    warmupSeconds: number;
    machine: string;
    concluded: boolean;
    nextMatchTeams?: string[];
}

export function parseActiveMatchStreamMessage(data: string): ActiveMatch {
    const parsed = JSON.parse(data);
    const result: ActiveMatch = {
        id: Number(parsed.id),
        bestOf: Number(parsed.bestOf),
        teams: [parsed.team1, parsed.team2],
        scores: [Number(parsed.score1), Number(parsed.score2)],
        warmupSeconds: Number(parsed.warmup),
        machine: parsed.machineName,
        concluded: parsed.concluded === 'True',
    };
    if (parsed.next1 && parsed.next2) {
        result.nextMatchTeams = [parsed.next1, parsed.next2];
    }
    return result;
}
