import * as React from 'react';
import { ConnectedSettings, Settings } from './types';

function ConnectPage(props: { connect: (u: string, p: string) => void; }) {
  return (
    <div>
      Connect to Twitch chats:<br/>
      Username: <input id="twitchUserField"/><br/>
      OAuth Key: <input type="password" id="twitchPassField" size={36} placeholder="oath:"/>
      <a href="https://twitchapps.com/tmi/">Get key</a><br/>
      <button
        onClick={() => {
          const user =
              document.getElementById('twitchUserField') as HTMLInputElement;
          const pass =
              document.getElementById('twitchPassField') as HTMLInputElement;
          props.connect(user.value, pass.value);
        }}
      >
        Log In
      </button>
    </div>
  );
}

interface State {
  settings: Settings | ConnectedSettings;
}

export class TwitchSettingsPage extends React.Component {
  state: State = { settings: { connected: false } };

  componentWillMount() {
    fetch('/api/twitch/settings', {headers: {Accept: 'application/json'}})
        .then((response) => response.json())
        .then((data: Settings) => {
          this.setState({ settings: data });
        })
        .catch((error) => {
          console.warn('Error loading Twitch state', error);
        });
  }

  render() {
    if (!this.state.settings.connected) {
      return <ConnectPage connect={(u, p) => this.sendConnect(u, p)}/>;
    }
    const data = this.state.settings as ConnectedSettings;
    let inChannels: JSX.Element | undefined;
    if (data.inChannels.length > 0) {
      const channels = data.inChannels.map((c) => <li key={c}>{c}</li>);
      inChannels = <div>Currently in channels:<br/><ul>{channels}</ul></div>;
    }
    return (
      <div>
        Connected as {data.username}.<br/>
        Join channel: <input id="twitchChannelField"/>
        <button
          onClick={() => {
              const field = document.getElementById('twitchChannelField') as
                  HTMLInputElement;
              this.joinChannel(field.value);
          }}
        >
          Join
        </button>
        {inChannels}
      </div>
    );
  }

  private sendConnect(username: string, key: string) {
    fetch('/api/twitch/connect',
          {method: 'POST',
           headers: {'Content-Type': 'application/json;charset=UTF-8',
                     'Accept': 'application/json'},
           body: JSON.stringify({ username: username, key: key })})
        .then((response) => response.json())
        .then((data: Settings) => {
          this.setState({ settings: data });
        })
        .catch((error) => {
          console.warn('Error loading Twitch state', error);
        });
  }

  private joinChannel(channel: string) {
    fetch('/api/twitch/join',
          {method: 'POST',
           headers: {'Content-Type': 'application/json;charset=UTF-8',
                     'Accept': 'application/json'},
           body: JSON.stringify({ channel: channel })})
        .then((response) => response.json())
        .then((data: Settings) => {
          this.setState({ settings: data });
        })
        .catch((error) => {
          console.warn('Error loading Twitch state', error);
        });
  }
}
