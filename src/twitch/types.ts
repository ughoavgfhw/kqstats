export interface Settings {
  connected: boolean;
}

export interface ConnectedSettings extends Settings {
  username: string;
  inChannels: string[];
}
