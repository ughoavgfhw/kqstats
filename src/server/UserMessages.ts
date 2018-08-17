import { MatchState } from '../lib/MatchState';

function makeResultMessage(state: MatchState) {
  if (state.scores.blue > state.scores.gold) {
    return `${state.currentTeams.blue.name || ''} defeats ` +
           `${state.currentTeams.gold.name || ''}, ` +
           `${state.scores.blue} - ${state.scores.gold}`;
  } else if (state.scores.gold > state.scores.blue) {
    return `${state.currentTeams.gold.name || ''} defeats ` +
           `${state.currentTeams.blue.name || ''}, ` +
           `${state.scores.gold} - ${state.scores.blue}`;
  } else {
    return `${state.currentTeams.blue.name || ''} and ` +
           `${state.currentTeams.gold.name || ''} tie, ` +
           `${state.scores.blue} - ${state.scores.gold}`;
  }
}

export class UserMessageProducer {
  private currTeams = ['', ''];
  private currStatus: MatchState['status'] = 'in_progress';

  constructor(private messageCallback: (message: string) => void) {}

  matchStateChanged(state: MatchState) {
    const newTeams = [state.currentTeams.blue.name || '',
                      state.currentTeams.gold.name || ''];
    // See if either team changed, but don't count swapping sides as a change.
    const teamsChanged = (newTeams[0] !== this.currTeams[0] &&
                          newTeams[0] !== this.currTeams[1]) ||
                         (newTeams[1] !== this.currTeams[1] &&
                          newTeams[1] !== this.currTeams[0]);
    const matchFinished =
        state.status !== this.currStatus && state.status === 'complete';

    this.currTeams = newTeams;
    this.currStatus = state.status;

    if (matchFinished) {
      this.messageCallback(makeResultMessage(state));
    }
    if (teamsChanged) {
      this.messageCallback(`Next up: ${newTeams[0]} vs ${newTeams[1]}`);
    }
  }
}
