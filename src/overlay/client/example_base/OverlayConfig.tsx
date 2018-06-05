import * as base from '../OverlayBase';

const emptyImage =
    'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E';

export const BackgroundImage = base.DefaultBackgroundImage(emptyImage);
export const TeamName = base.DefaultTeamName();
export const ScoreMarker = base.DefaultImageScoreMarker({
  'win': { 'blue': emptyImage, 'gold': emptyImage },
  'empty': { 'blue': emptyImage, 'gold': emptyImage },
});
export const ScoreMarkers = base.DefaultImageScoreMarkers(ScoreMarker);
