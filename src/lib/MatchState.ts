import * as uuid from 'uuid/v4';
import { Character } from './KQStream';

export type CabColor = 'blue' | 'gold';

export interface MatchTeam {
    name?: string;
    players?: string[];
    positions?: {
        [character: number]: string;
    };
}

export interface MatchSettings {
    seriesLength: number;
}

export type MatchCurrentTeams = {
    [cab in CabColor]: MatchTeam;
};

export interface MatchScore {
    cab: CabColor;
    score: number;
}

export interface MatchState {
    settings: MatchSettings;
    currentTeams: MatchCurrentTeams;
    scores: {
        [cab in CabColor]: number;
    };
}

export type MatchEvent = 'change' | 'score' | 'configured' | 'teams';
export type MatchEventCallback<T> = (data: T) => void;

export class Match {
    private state: MatchState = Match.emptyMatchState;
    private callbacks: {
        [event in MatchEvent]: {
            [id: string]: MatchEventCallback<any>;
        };
    } = {
        ['change']: {},
        ['score']: {},
        ['configured']: {},
        ['teams']: {},
    };

    static get emptyMatchState(): MatchState {
        return {
            settings: {
                seriesLength: 0,
            },
            currentTeams: {
                blue: {},
                gold: {},
            },
            scores: {
                blue: 0,
                gold: 0,
            },
        };
    }

    reset() {
        this.setMatchState(Match.emptyMatchState);
    }

    configure(settings: MatchSettings) {
        this.state.settings = settings;
        this.trigger('change');
        this.trigger('configured');
    }

    recordGameVictory(cab: CabColor) {
        this.state.scores[cab] += 1;
        this.trigger('change');
        this.trigger('score', cab);
    }

    setMatchState(newState: MatchState) {
        const prevState = this.state;
        this.state = newState;
        this.trigger('change');
        this.trigger('configured');
        this.trigger('score');
        this.trigger('teams');
    }

    on(eventType: 'change', callback: MatchEventCallback<MatchState>): string;
    on(eventType: 'score', callback: MatchEventCallback<MatchScore>): string;
    on(eventType: 'configured', callback: MatchEventCallback<MatchSettings>):
        string;
    on(eventType: 'teams', callback: MatchEventCallback<MatchCurrentTeams>):
        string;
    on(eventType: MatchEvent, callback: MatchEventCallback<any>): string {
        let id = uuid();
        while (this.callbacks[eventType][id] !== undefined) {
            id = uuid();
        }
        this.callbacks[eventType][id] = callback;
        return id;
    }

    off(eventType: MatchEvent, id: string): boolean {
        if (this.callbacks[eventType][id] !== undefined) {
            delete this.callbacks[eventType][id];
            return true;
        }
        return false;
    }

    trigger(eventType: MatchEvent, id?: string, filter?: any) {
        const callbacks = this.callbacks[eventType];
        const ids: string[] = id === undefined ? Object.keys(callbacks) : [id];

        function send<T>(msg: T) {
            for (let currId of ids) {
                const callback = callbacks[currId] as MatchEventCallback<T>;
                if (callback !== undefined) {
                    callback(msg);
                }
            }
        }

        switch (eventType) {
            case 'change':
                send<MatchState>(this.state);
                break;
            case 'score': {
                let cabs: CabColor[];
                if (filter === undefined) {
                    cabs = ['blue', 'gold'];
                } else {
                    cabs = [filter as CabColor];
                }
                for (let cab of cabs) {
                    send<MatchScore>({
                        cab: cab,
                        score: this.state.scores[cab],
                    });
                }
                break;
            }
            case 'configured':
                send<MatchSettings>(this.state.settings);
                break;
            case 'teams':
                send<MatchCurrentTeams>(this.state.currentTeams);
                break;
            default:
                throw `unknown event type "${eventType}"`;
        }
    }
}
