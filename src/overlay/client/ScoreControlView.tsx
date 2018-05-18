import * as React from 'react';

function updateScoreboard () {
  const getI = (id: string) => {
    return (document.getElementById(id) as HTMLInputElement).value;
  };
  const getS = (id: string) => {
    return (document.getElementById(id) as HTMLSelectElement).value;
  };
  const score = {
    'seriesLength': getI('seriesLength'),
    'blueTeam': getS('blueTeamSelect') || getI('blueTeamOther'),
    'goldTeam': getS('goldTeamSelect') || getI('goldTeamOther'), 
    'score': {
      'blue': getI('blueScore'),
      'gold': getI('goldScore'),
    },
  };
  
  fetch('/api/scores',
        {method: 'POST',
         headers: {'Content-Type': 'application/json;charset=UTF-8'},
         body: JSON.stringify(score)});
}

function resetScoreboard () {
  fetch('/api/scores/reset', {method: 'POST'});

  (document.getElementById('seriesLength') as HTMLInputElement).value = '';
  (document.getElementById('blueTeamSelect') as HTMLInputElement).value = '';
  (document.getElementById('blueTeamOther') as HTMLInputElement).value = '';
  (document.getElementById('goldTeamSelect') as HTMLInputElement).value = '';
  (document.getElementById('goldTeamOther') as HTMLInputElement).value = '';
  (document.getElementById('blueScore') as HTMLInputElement).value = '';
  (document.getElementById('goldScore') as HTMLInputElement).value = '';
}

const SetValueButton = (props: any) => {
  return (
    <button
        onClick={() => {
          (document.getElementById(props.targetId) as HTMLInputElement).value =
              props.value;
        }}
    >
      {props.children}
    </button>
  );
};

const IncrementValueButton = (props: any) => {
  return (
    <button
        onClick={() => {
          const target =
              document.getElementById(props.targetId) as HTMLInputElement;
          const curr = parseInt(target.value, 10) || 0;
          target.value = '' + (curr + 1);
        }}
    >
      {props.children}
    </button>
  );
};

const TeamSelector = (props: any) => {
  if (props.teams.length > 0) {
    const options: JSX.Element[] = [];
    props.teams.forEach(
        (team: string) => options.push(<option value={team}>{team}</option>));
    return (
      <select
          name={props.name}
          id={`${props.name}Select`}
          onChange={() => {
            (document.getElementById(`${props.name}Other`) as
                 HTMLInputElement).value = '';
          }}
      >
        <option value="">Other...</option>
        {options}
      </select>
    );
  } else {
    return <input id={`${props.name}Select`} type="hidden" />;
  }
};

interface ScoreControlState {
  teamNames: string[];
}

export class ScoreControlView extends React.Component {
  state: ScoreControlState = {teamNames: []};
  apiPath: string;

  constructor(props: {}) {
    super(props);
    const teamsReq = new XMLHttpRequest();
    fetch('/api/teams', {headers: {Accept: 'application/json'}})
        .then((response) => response.json())
        .then((data) => {
          const teamNames: string[] = [];
          data.teams.forEach((team: any) => teamNames.push(team.name));
          this.setState({teamNames: teamNames});
        })
        .catch((error) => {
          console.warn('Error loading team names', error);
        });
  }

  componentWillMount() {
    document.title = 'Killer Queen Score Controller';
  }

  render() {
    return (
      <div>
        <h1>Killer Queen Score Controller</h1>

        <label htmlFor="seriesLength">Series Length:</label>
        <input name="seriesLength" id="seriesLength" />
        <br />

        <SetValueButton targetId="seriesLength" value="3">Bo3</SetValueButton>
        <SetValueButton targetId="seriesLength" value="5">Bo5</SetValueButton>
        <SetValueButton targetId="seriesLength" value="7">Bo7</SetValueButton>
        <br />

        <label htmlFor="blueTeam">Blue Team Name:</label>
        <TeamSelector name="blueTeam" teams={this.state.teamNames} />
        <input name="blueTeam" id="blueTeamOther" />
        <br />

        <label htmlFor="goldTeam">Gold Team Name:</label>
        <TeamSelector name="goldTeam" teams={this.state.teamNames} />
        <input name="goldTeam" id="goldTeamOther" />
        <br />

        <br />

        <label htmlFor="blueScore">Blue Score:</label>
        <input name="blueScore" id="blueScore" defaultValue="0" />
        <SetValueButton targetId="blueScore" value={0}>0</SetValueButton>
        <IncrementValueButton targetId="blueScore">+1</IncrementValueButton>
        <br />

        <label htmlFor="goldScore">Gold Score:</label>
        <input name="goldScore" id="goldScore" defaultValue="0" />
        <SetValueButton targetId="goldScore" value={0}>0</SetValueButton>
        <IncrementValueButton targetId="goldScore">+1</IncrementValueButton>
        <br />

        <button id="updateScore" onClick={updateScoreboard}>
          Update Scoreboard
        </button>
        <hr />
        <button id="resetScore" onClick={resetScoreboard}>
          Reset Scoreboard
        </button>
      </div>
    );
  }
}
