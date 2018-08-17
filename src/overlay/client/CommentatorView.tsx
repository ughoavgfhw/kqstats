import * as React from 'react';
import * as socket_io_client from 'socket.io-client';
import { CabColor } from '../../lib/MatchState';
import { TeamMetadata, PlayerMetadata } from '../../lib/TournamentMetadata';
import * as SocketData from '../../server/SocketData';

function PlayerInfo(props: { cab: CabColor;
                             position: number;
                             team: TeamMetadata; }) {
  if (props.position >= props.team.players.length) {
    return <div/>;
  }
  const player = props.team.players[props.position];
  const name = player.name;
  const cleanname = encodeURIComponent(name);
  const image =
      name !== '' ?
          `${process.env.PUBLIC_URL}/photos/${cleanname}.jpg` :
          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';

  return (
    <div
      id={`playerInfo_${props.cab}${props.position}`}
      className="playerInfo"
    >
      <div className="playerInfoName">
        {name} ({player.preferredPronouns || ''})
      </div>
      <img width="72" src={image} className="playerInfoImg" />
    </div>
  );
}

function TeamInfo(props: { id: CabColor; team: TeamMetadata; }) {
  const style = {
    width: '45%',
    display: 'inline-block',
  };
  return (
    <div style={style} id={`${props.id}TeamInfo`} className="teamInfo">
      <h1 id={`${props.id}TeamInfoName`} className="teamInfoName">
        {props.team.name || ''}
      </h1>
      <PlayerInfo cab={props.id} position={0} team={props.team} />
      <PlayerInfo cab={props.id} position={1} team={props.team} />
      <PlayerInfo cab={props.id} position={2} team={props.team} />
      <PlayerInfo cab={props.id} position={3} team={props.team} />
      <PlayerInfo cab={props.id} position={4} team={props.team} />
    </div>
  );
}

interface CommentatorViewState {
  blue: TeamMetadata;
  gold: TeamMetadata;
}

export class CommentatorView extends React.Component {
  state: CommentatorViewState = {
    blue: { name: '', players: [] },
    gold: { name: '', players: [] },
  };

  private io: SocketIOClient.Socket;

  constructor(props: {}) {
    super(props);
    this.io = socket_io_client(`${window.location.hostname}:8000/status`, {
      autoConnect: false
    });
    this.io.on('teams', (data: SocketData.status_teams) => {
      this.setState((prevState: CommentatorViewState) => {
        return data;
      });
    });
    this.io.open();
  }

  render() {
    (document.getElementById('root') as HTMLElement).style.width = '100%';
    (document.getElementById('root') as HTMLElement).style.height = 'auto';
    return (
      <div id="commentatorView">
        <TeamInfo
          id="blue"
          team={this.state.blue}
        />
        <TeamInfo
          id="gold"
          team={this.state.gold}
        />
      </div>
    );
  }
}
