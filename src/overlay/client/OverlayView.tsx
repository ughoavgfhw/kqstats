import * as React from 'react';
import * as socket_io_client from 'socket.io-client';
import './OverlayView.css';

const background = require('./assets/overlay-background.jpg');
const blueEmptyMarker = require('./assets/score-marker-blue-empty.png');
const blueWinMarker = require('./assets/score-marker-blue-win.png');
const goldEmptyMarker = require('./assets/score-marker-gold-empty.png');
const goldWinMarker = require('./assets/score-marker-gold-win.png');
const markerImages = {
  empty: {
    blue: blueEmptyMarker,
    gold: goldEmptyMarker,
  },
  win: {
    blue: blueWinMarker,
    gold: goldWinMarker,
  },
};

interface TeamState {
  teamName: string;
  score: number;
}

interface MatchState {
  seriesLength: number;
}

interface ScoreMarkerProps {
  team: 'blue' | 'gold';
  score: number;
  seriesLength: number;
}
const ScoreMarkers = (props: ScoreMarkerProps) => {
  const markers: JSX.Element[] = [];
  const winsNeeded = Math.ceil(props.seriesLength / 2);
  for (let i = 0; i < winsNeeded; i++) {
    const status = i < props.score ? 'win' : 'empty';
    markers.push(
        <img src={markerImages[status][props.team]} className={status} />);
  }
  return (
    <div id={`${props.team}ScoreMarkers`} className="scoreMarkers">
      {markers}
    </div>
  );
};

interface TeamDataProps {
  id: 'blue' | 'gold';
  team: TeamState;
  match: MatchState;
}
const TeamData = (props: TeamDataProps) => {
  return (
    <div>
      <div id={`${props.id}TeamName`} className="teamName">
        {props.team.teamName}
      </div>
      <ScoreMarkers
        team={props.id}
        score={props.team.score}
        seriesLength={props.match.seriesLength}
      />
    </div>
  );
};

interface OverlayViewState {
  teams: {
    ['blue']: TeamState;
    ['gold']: TeamState;
  };
  match: MatchState;
}

export class OverlayView extends React.Component {
  state: OverlayViewState = {
    teams: {
      blue: {teamName: '', score: 0},
      gold: {teamName: '', score: 0},
    },
    match: {seriesLength: 0},
  };

  private scoreIO: SocketIOClient.Socket;
  private teamsIO: SocketIOClient.Socket;

  constructor(props: {}) {
    super(props);
    this.scoreIO = socket_io_client('/scores', {
      autoConnect: false
    });
    this.scoreIO.on('score', (data: any) => {
    this.setState((prevState: OverlayViewState) => {
        let teams = prevState.teams;
        teams[data.team].score = data.score;
        return {teams: teams};
      });
    });
    this.scoreIO.on('match', (data: any) => {
      this.setState((prevState: OverlayViewState) => {
        let match = prevState.match;
        match.seriesLength = data.seriesLength;
        return {match: match};
      });
    });
    this.scoreIO.open();
    this.teamsIO = socket_io_client('/teams', {
      autoConnect: false
    });
    this.teamsIO.on('currentTeams', (data: any) => {
      this.setState((prevState: OverlayViewState) => {
        let teams = prevState.teams;
        teams.blue.teamName = data.blue.teamName;
        teams.gold.teamName = data.gold.teamName;
        return {teams: teams};
      });
    });
    this.teamsIO.open();
  }

  render() {
    return (
      <div>
        <img src={background} />
        <TeamData
          id="blue"
          team={this.state.teams.blue}
          match={this.state.match}
        />
        <TeamData
          id="gold"
          team={this.state.teams.gold}
          match={this.state.match}
        />
      </div>
    );
  }
}
