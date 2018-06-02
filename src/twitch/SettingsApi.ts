import * as express from 'express';
import { TwitchChatClient } from './chat';
import { ConnectedSettings, Settings } from './types';

function getSettings(chat: TwitchChatClient): ConnectedSettings | Settings {
  if (!chat.connected) {
    return { connected: false };
  }
  return {
    connected: true,
    username: chat.username,
    inChannels: chat.channelNames
  };
}

export const TwitchSettingsApi = (chat: TwitchChatClient) => {
  const router = express.Router();

  router.get('/settings', (req, res) => {
    res.send(getSettings(chat));
  });

  router.post('/connect', (req, res) => {
    const input = req.body as { username: string; key: string; };
    chat.connect(input.username, input.key).then(() => {
      res.send(getSettings(chat));
    }).catch((e) => {
      res.status(403).send(e);
    });
  });

  router.post('/join', (req, res) => {
    const input = req.body as { channel: string; };
    chat.join(input.channel).then(() => {
      res.send(getSettings(chat));
    }).catch((e) => {
      res.status(400).send(e);
    });
  });

  return router;
};
