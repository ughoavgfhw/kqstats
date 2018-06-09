import { ProtectedEventEmitter } from 'eventemitter-ts';
import { Character } from './Character';

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

interface MatchEvents {
    'change': MatchState;
    'score': MatchScore;
    'configured': MatchSettings;
    'teams': MatchCurrentTeams;
}
type MatchEvent = keyof MatchEvents;

export class Match extends ProtectedEventEmitter<MatchEvents> {
    private state: MatchState = Match.emptyMatchState;

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

    trigger(eventType: MatchEvent, filter?: any) {
        switch (eventType) {
            case 'change':
                this.protectedEmit('change', this.state);
                break;
            case 'score': {
                let cabs: CabColor[];
                if (filter === undefined) {
                    cabs = ['blue', 'gold'];
                } else {
                    cabs = [filter as CabColor];
                }
                for (let cab of cabs) {
                    this.protectedEmit('score', {
                        cab: cab,
                        score: this.state.scores[cab],
                    });
                }
                break;
            }
            case 'configured':
                this.protectedEmit('configured', this.state.settings);
                break;
            case 'teams':
                this.protectedEmit('teams', this.state.currentTeams);
                break;
            default:
                throw `unknown event type "${eventType}"`;
        }
    }
}
