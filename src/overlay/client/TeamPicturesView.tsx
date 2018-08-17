import * as React from 'react';
import * as socket_io_client from 'socket.io-client';
import { CabColor } from '../../lib/MatchState';
import { TeamMetadata } from '../../lib/TournamentMetadata';
import * as SocketData from '../../server/SocketData';
import './TeamPictures.css';

function PlayerPicture(props: { cab: CabColor;
                                position: number;
                                team: TeamMetadata; }) {
  const name = props.team.players.length > props.position ?
                   props.team.players[props.position].name : '';
  const cleanname = encodeURIComponent(name);
  const image =
      name !== '' ?
          `${process.env.PUBLIC_URL}/photos/${cleanname}.jpg` :
          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';

  return (
    <div id={`playerPic_${props.cab}${props.position}`} className="playerPic">
      <img src={image} className="playerPicImg" />
      <div className="playerPicName">{name}</div>
    </div>
  );
}

function TeamPictures(props: { id: CabColor; team: TeamMetadata; }) {
  return (
    <div id={`${props.id}TeamPictures`} className="teamPictures">
      <div id={`${props.id}TeamPicturesName`} className="teamPicturesName">
        {props.team.name}
      </div>
      <PlayerPicture cab={props.id} position={0} team={props.team} />
      <PlayerPicture cab={props.id} position={1} team={props.team} />
      <PlayerPicture cab={props.id} position={2} team={props.team} />
      <PlayerPicture cab={props.id} position={3} team={props.team} />
      <PlayerPicture cab={props.id} position={4} team={props.team} />
    </div>
  );
}

interface TeamPicturesViewState {
  teams: {
    blue: TeamMetadata;
    gold: TeamMetadata;
  };
}

export class TeamPicturesView extends React.Component {
  state: TeamPicturesViewState = {
    teams: {
      blue: { name: '', players: [] },
      gold: { name: '', players: [] },
    },
  };

  private io: SocketIOClient.Socket;

  constructor(props: {}) {
    super(props);
    this.io = socket_io_client(`${window.location.hostname}:8000/status`, {
      autoConnect: false
    });
    this.io.on('teams', (data: SocketData.status_teams) => {
      this.setState((prevState: TeamPicturesViewState) => {
        return {teams: data};
      });
    });
    this.io.open();
  }

  render() {
    return (
      <div id="teamPicturesView">
        <TeamPictures
          id="blue"
          team={this.state.teams.blue}
        />
        <div id="teamPicturesVsText">vs</div>
        <TeamPictures
          id="gold"
          team={this.state.teams.gold}
        />
      </div>
    );
  }
}
