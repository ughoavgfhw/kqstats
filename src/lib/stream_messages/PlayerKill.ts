import { Character } from '../Character';

export interface Position {
    x: number;
    y: number;
}

export interface PlayerKill {
    pos: Position;
    killed: Character;
    by: Character;
}

export function parsePlayerKillStreamMessage(data: string): PlayerKill {
    const [x, y, by, killed] = data.split(',');
    return {
        pos: {
            x: Number(x),
            y: Number(y)
        },
        killed: Number(killed),
        by: Number(by)
    };
}
