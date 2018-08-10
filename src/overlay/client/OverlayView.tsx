import * as React from 'react';
import * as socket_io_client from 'socket.io-client';
import { CabColor, MatchScore, MatchSettings, MatchCurrentTeams } from '../../lib/MatchState';

import { BackgroundImage, ScoreMarkers, TeamName } from './config/OverlayConfig';

interface TeamState {
  teamName: string;
  score: number;
}

interface MatchState {
  seriesLength: number;
}

interface TeamDataProps {
  id: CabColor;
  team: TeamState;
  match: MatchState;
}
const TeamData = (props: TeamDataProps) => {
  const side = props.id === 'blue' ? 'left' : 'right';
  return (
    <div>
      <TeamName team={props.id} side={side} name={props.team.teamName} />
      <ScoreMarkers
        team={props.id}
        side={side}
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

  private io: SocketIOClient.Socket;

  constructor(props: {}) {
    super(props);
    this.io = socket_io_client(`${window.location.hostname}:8000/match`, {
      autoConnect: false
    });
    this.io.on('score', (data: MatchScore) => {
      this.setState((prevState: OverlayViewState) => {
        let teams = prevState.teams;
        teams[data.cab].score = data.score;
        return {teams: teams};
      });
    });
    this.io.on('settings', (data: MatchSettings) => {
      this.setState((prevState: OverlayViewState) => {
        let match = prevState.match;
        match.seriesLength = data.seriesLength;
        return {match: match};
      });
    });
    this.io.on('teams', (data: MatchCurrentTeams) => {
      this.setState((prevState: OverlayViewState) => {
        let teams = prevState.teams;
        teams.blue.teamName = data.blue.name || '';
        teams.gold.teamName = data.gold.name || '';
        return {teams: teams};
      });
    });
    this.io.open();
  }

  render() {
    return (
      <div>
        <BackgroundImage/>
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
