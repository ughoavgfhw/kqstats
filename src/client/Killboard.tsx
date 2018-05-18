import { Route, RouteComponentProps, Switch } from 'react-router';
import * as socket_io_client from 'socket.io-client';
import { Character } from '../lib/KQStream';
import { GameStats, GameStatsType, KQStat } from '../lib/GameStats';
import * as React from 'react';
import { Page404 } from './404';
import './Killboard.css';

const goldQueen = require('./sprites/gold_queen.png');
const goldStripes = require('./sprites/gold_stripes.png');
const goldAbs = require('./sprites/gold_abs.png');
const goldSkulls = require('./sprites/gold_skulls.png');
const goldChecks = require('./sprites/gold_checks.png');
const blueQueen = require('./sprites/blue_queen.png');
const blueStripes = require('./sprites/blue_stripes.png');
const blueAbs = require('./sprites/blue_abs.png');
const blueSkulls = require('./sprites/blue_skulls.png');
const blueChecks = require('./sprites/blue_checks.png');

const goldBackground = require('./sprites/gold_team.png');
const blueBackground = require('./sprites/blue_team.png');
const goldBackgroundMirror = require('./sprites/gold_team_mirror.png');
const blueBackgroundMirror = require('./sprites/blue_team_mirror.png');
const goldBackgroundVertical = require('./sprites/gold_team_vertical.png');
const blueBackgroundVertical = require('./sprites/blue_team_vertical.png');

const queenCrown = require('./sprites/crown.png');
const crownPixelArt = require('./sprites/crown_pixelart.png');

function getCrowns(n: number) {
  const crown = <img className="crown" src={crownPixelArt}/>;
  const html: JSX.Element[] = [];
  for (let i = 0; i < n; i++) {
    html.push(crown);
  }
  return html;
} 

abstract class KillboardBase extends React.Component {
  state: GameStatsType = GameStats.defaultGameStats;

  private io: SocketIOClient.Socket;

  constructor(props: {}) {
    super(props);
    this.io = socket_io_client('http://localhost:8000', {
      autoConnect: false
    });
    this.io.on('stat', (data: KQStat) => {
      this.setState((prevState) => {
        let characterStats = prevState[data.character];
        if (characterStats === undefined) {
          characterStats = {};
        }
        characterStats[data.statistic] = data.value;
        return {
          [data.character]: characterStats
        };
      });
    });
    this.io.open();
  }

  componentWillMount() {
    document.body.style.backgroundColor = 'black';
    document.body.style.color = 'white';
  }

  componentWillUnmount() {
    document.body.style.backgroundColor = null;
    document.body.style.color = null;
  }
}

const KillboardRow = (props: any) => {
  return (
    <tr>
      <td>
        <div className="crowns">
          {getCrowns(props.stat.queen_kills)}
        </div>
        <img className="character" src={props.image} />
      </td>
      <td>
        {props.stat.kills}
      </td>
      <td>
        {props.stat.warrior_kills}
      </td>
      <td>
        {props.stat.deaths}
      </td>
    </tr>
  );
};

class KillboardFull extends KillboardBase {
  render() {
    return (
      <div className="App">
        <table>
          <tr>
            <th />
            <th>Kills</th>
            <th>Warrior Kills*</th>
            <th>Deaths</th>
          </tr>
          <KillboardRow stat={this.state[Character.GoldQueen]} image={goldQueen} />
          <KillboardRow stat={this.state[Character.GoldStripes]} image={goldStripes} />
          <KillboardRow stat={this.state[Character.GoldAbs]} image={goldAbs} />
          <KillboardRow stat={this.state[Character.GoldSkulls]} image={goldSkulls} />
          <KillboardRow stat={this.state[Character.GoldChecks]} image={goldChecks} />
          <KillboardRow stat={this.state[Character.BlueQueen]} image={blueQueen} />
          <KillboardRow stat={this.state[Character.BlueStripes]} image={blueStripes} />
          <KillboardRow stat={this.state[Character.BlueAbs]} image={blueAbs} />
          <KillboardRow stat={this.state[Character.BlueSkulls]} image={blueSkulls} />
          <KillboardRow stat={this.state[Character.BlueChecks]} image={blueChecks} />
        </table>
        <h6>* May be missing some warrior kills</h6>
      </div>
    );
  }
}

interface KillboardHorizontalProps {
  team: 'blue' | 'gold';
  mirror: boolean;
}

interface KillboardHorizontalAlias {
  background: any;
  position: {
    [1]: Character;
    [2]: Character;
    [3]: Character;
    [4]: Character;
    [5]: Character;
  };
}

class KillboardHorizontal extends KillboardBase {
  props: KillboardHorizontalProps;

  private alias: KillboardHorizontalAlias;

  constructor(props: KillboardHorizontalProps) {
    super(props);
    if (props.team === 'blue') {
      if (!props.mirror) {
        this.alias = {
          background: blueBackground,
          position: {
            [1]: Character.BlueChecks,
            [2]: Character.BlueSkulls,
            [3]: Character.BlueQueen,
            [4]: Character.BlueAbs,
            [5]: Character.BlueStripes
          }
        };
      } else {
        this.alias = {
          background: blueBackgroundMirror,
          position: {
            [1]: Character.BlueStripes,
            [2]: Character.BlueAbs,
            [3]: Character.BlueQueen,
            [4]: Character.BlueSkulls,
            [5]: Character.BlueChecks
          }
        };
      }
    } else {
      if (!props.mirror) {
        this.alias = {
          background: goldBackground,
          position: {
            [1]: Character.GoldChecks,
            [2]: Character.GoldSkulls,
            [3]: Character.GoldQueen,
            [4]: Character.GoldAbs,
            [5]: Character.GoldStripes
          }
        };
      } else {
        this.alias = {
          background: goldBackgroundMirror,
          position: {
            [1]: Character.GoldStripes,
            [2]: Character.GoldAbs,
            [3]: Character.GoldQueen,
            [4]: Character.GoldSkulls,
            [5]: Character.GoldChecks
          }
        };
      }
    }
  }

  render() {
    return (
      <div className="killboard horizontal">
        <img src={this.alias.background} />
        <div className="value" style={{left: '14px'}}>
          {this.state[this.alias.position[1]].kills}
        </div>
        <div className="value" style={{left: '134px'}}>
          {this.state[this.alias.position[1]].deaths}
        </div>
        <div className="value" style={{left: '270px'}}>
          {this.state[this.alias.position[2]].kills}
        </div>
        <div className="value" style={{left: '390px'}}>
          {this.state[this.alias.position[2]].deaths}
        </div>
        <div className="value" style={{left: '525px'}}>
          {this.state[this.alias.position[3]].kills}
        </div>
        <div className="value" style={{left: '645px'}}>
          {this.state[this.alias.position[3]].deaths}
        </div>
        <div className="value" style={{left: '782px'}}>
          {this.state[this.alias.position[4]].kills}
        </div>
        <div className="value" style={{left: '902px'}}>
          {this.state[this.alias.position[4]].deaths}
        </div>
        <div className="value" style={{left: '1038px'}}>
          {this.state[this.alias.position[5]].kills}
        </div>
        <div className="value" style={{left: '1158px'}}>
          {this.state[this.alias.position[5]].deaths}
        </div>
        <div className="crowns" style={{left: '59px'}}>
          {getCrowns(this.state[this.alias.position[1]].queen_kills)}
        </div>
        <div className="crowns" style={{left: '315px'}}>
          {getCrowns(this.state[this.alias.position[2]].queen_kills)}
        </div>
        <div className="crowns" style={{left: '571px'}}>
          {getCrowns(this.state[this.alias.position[3]].queen_kills)}
        </div>
        <div className="crowns" style={{left: '827px'}}>
          {getCrowns(this.state[this.alias.position[4]].queen_kills)}
        </div>
        <div className="crowns" style={{left: '1084px'}}>
          {getCrowns(this.state[this.alias.position[5]].queen_kills)}
        </div>
      </div>
    );
  }

  componentWillMount() {
    super.componentWillMount();
    document.body.style.backgroundColor = 'transparent';
  }
}

class KillboardVertical extends KillboardBase {
  props: KillboardHorizontalProps;

  private alias: KillboardHorizontalAlias;

  constructor(props: KillboardHorizontalProps) {
    super(props);
    if (props.mirror) {
      throw 'vertical-mirrored is not supported!';
    }
    // Note: Blue and gold have opposite character orders.
    if (props.team === 'blue') {
      this.alias = {
        background: blueBackgroundVertical,
        position: {
          [1]: Character.BlueChecks,
          [2]: Character.BlueSkulls,
          [3]: Character.BlueQueen,
          [4]: Character.BlueAbs,
          [5]: Character.BlueStripes
        }
      };
    } else {
      this.alias = {
        background: goldBackgroundVertical,
        position: {
          [1]: Character.GoldStripes,
          [2]: Character.GoldAbs,
          [3]: Character.GoldQueen,
          [4]: Character.GoldSkulls,
          [5]: Character.GoldChecks
        }
      };
    }
  }

  render() {
    return (
      <div className="killboard vertical">
        <img src={this.alias.background} />
        <div className="value" style={{top: '20px'}}>
          {this.state[this.alias.position[1]].kills}
        </div>
        <div className="value" style={{top: '140px'}}>
          {this.state[this.alias.position[1]].deaths}
        </div>
        <div className="value" style={{top: '276px'}}>
          {this.state[this.alias.position[2]].kills}
        </div>
        <div className="value" style={{top: '396px'}}>
          {this.state[this.alias.position[2]].deaths}
        </div>
        <div className="value" style={{top: '531px'}}>
          {this.state[this.alias.position[3]].kills}
        </div>
        <div className="value" style={{top: '651px'}}>
          {this.state[this.alias.position[3]].deaths}
        </div>
        <div className="value" style={{top: '788px'}}>
          {this.state[this.alias.position[4]].kills}
        </div>
        <div className="value" style={{top: '908px'}}>
          {this.state[this.alias.position[4]].deaths}
        </div>
        <div className="value" style={{top: '1044px'}}>
          {this.state[this.alias.position[5]].kills}
        </div>
        <div className="value" style={{top: '1164px'}}>
          {this.state[this.alias.position[5]].deaths}
        </div>
        <div className="crowns" style={{top: '20px'}}>
          {getCrowns(this.state[this.alias.position[1]].queen_kills)}
        </div>
        <div className="crowns" style={{top: '275px'}}>
          {getCrowns(this.state[this.alias.position[2]].queen_kills)}
        </div>
        <div className="crowns" style={{top: '532px'}}>
          {getCrowns(this.state[this.alias.position[3]].queen_kills)}
        </div>
        <div className="crowns" style={{top: '788px'}}>
          {getCrowns(this.state[this.alias.position[4]].queen_kills)}
        </div>
        <div className="crowns" style={{top: '1045px'}}>
          {getCrowns(this.state[this.alias.position[5]].queen_kills)}
        </div>
      </div>
    );
  }

  componentWillMount() {
    super.componentWillMount();
    document.body.style.backgroundColor = 'transparent';
  }
}

export class Killboard extends React.Component<RouteComponentProps<{}>> {
  render() {
    return (
      <Switch>
        <Route
          exact={true}
          path={`${this.props.match.path}/full`}
          component={KillboardFull}
        />
        <Route
          exact={true}
          path={`${this.props.match.path}/horizontal/blue`}
          render={(props) => (
            <KillboardHorizontal
              team="blue"
              mirror={false}
            />
          )}
        />
        <Route
          exact={true}
          path={`${this.props.match.path}/horizontal/gold`}
          render={(props) => (
            <KillboardHorizontal
              team="gold"
              mirror={false}
            />
          )}
        />
        <Route
          exact={true}
          path={`${this.props.match.path}/horizontal/blue/mirror`}
          render={(props) => (
            <KillboardHorizontal
              team="blue"
              mirror={true}
            />
          )}
        />
        <Route
          exact={true}
          path={`${this.props.match.path}/horizontal/gold/mirror`}
          render={(props) => (
            <KillboardHorizontal
              team="gold"
              mirror={true}
            />
          )}
        />
        <Route
          exact={true}
          path={`${this.props.match.path}/vertical/blue`}
          render={(props) => (
            <KillboardVertical
              team="blue"
              mirror={false}
            />
          )}
        />
        <Route
          exact={true}
          path={`${this.props.match.path}/vertical/gold`}
          render={(props) => (
            <KillboardVertical
              team="gold"
              mirror={false}
            />
          )}
        />
        <Route
          component={Page404}
        />
      </Switch>
    );
  }
}
