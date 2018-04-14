import * as express from 'express';
import * as fs from 'fs';

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

export const ScoreApi = () => {
  const router = express.Router();

  router.post('/', (req, res) => {
    const input = req.body as ScoreMessage;
    console.log(input);  // TODO
    res.sendStatus(200);
  });

  router.post('/reset', (req, res) => {
    console.log('reset');  // TODO
    res.sendStatus(200);
  });

  return router;
};

export const TeamsApi = () => {
  const router = express.Router();

  router.get('/', (req, res) => {
    let teams: TeamsMessage = {teams: []};
    if (fs.existsSync('teamNames.txt')) {
      const teamNames = fs.readFileSync('teamNames.txt', 'utf8').split('\n');
      if (teamNames.length > 0 && teamNames[teamNames.length - 1] === '') {
        teamNames.pop();
      }
      console.log('Loaded ' + teamNames.length + ' team names');
      teamNames.forEach((name: string) => teams.teams.push({name: name}));
    } else {
      console.log('No team names: teamNames.txt does not exist');
    }

    res.send(teams);
  });

  return router;
};
