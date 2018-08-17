// Defines the payload types sent by the server for socket events. Each type is
// given a name here based on the endpoint and event name where it is used.

import { GameStats, KQStat } from '../lib/GameStats';
import { MatchCurrentTeams, MatchScore, MatchSettings } from '../lib/MatchState';
import { TeamMetadata } from '../lib/TournamentMetadata';

// Endpoint: /
// Event:    stat
export type root_stat = KQStat;

// Endpoint: /match
// Event:    score
export type match_score = MatchScore;

// Endpoint: /match
// Event:    settings
export type match_settings = MatchSettings;

// Endpoint: /match
// Event:    teams
export type match_teams = MatchCurrentTeams;

// Endpoint: /status
// Event:    teams
export type status_teams = {
  blue: TeamMetadata;
  gold: TeamMetadata;
};
