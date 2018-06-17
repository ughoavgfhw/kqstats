import * as express from 'express';
import { MatchState } from '../../lib/MatchState';

interface ScoreMessage {
  seriesLength: number;
  blueTeam: string;
  goldTeam: string;
  score: {
    blue: number;
    gold: number;
  };
}

interface Team {
  name: string;
}

interface TeamsMessage {
  teams: Team[];
}

export interface ScoreApiCallbacks {
  matchState: (state: MatchState) => void;
  reset: () => void;
}

export const ScoreApi = (callbacks: ScoreApiCallbacks) => {
  const router = express.Router();

  router.post('/', (req, res) => {
    const input = req.body as ScoreMessage;
    const state: MatchState = {
      settings: { seriesLength: input.seriesLength },
      currentTeams: {
        ['blue']: { name: input.blueTeam },
        ['gold']: { name: input.goldTeam },
      },
      scores: {
        blue: input.score.blue,
        gold: input.score.gold,
      },
    };
    callbacks.matchState(state);
    res.sendStatus(200);
  });

  router.post('/reset', (req, res) => {
    callbacks.reset();
    res.sendStatus(200);
  });

  return router;
};

export interface TeamsApiCallbacks {
  getTeams: () => Team[];
}

export const TeamsApi = (callbacks: TeamsApiCallbacks) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const teams: TeamsMessage = { teams: callbacks.getTeams() };
    res.send(teams);
  });

  return router;
};
