// This is a basic overlay config. See comments throughout for details on how to
// modify it to suit your needs.

// OverlayBase provides some useful default components, such as those used below.
import * as base from '../OverlayBase';
// The CSS file is used to control positioning and style, though if you use
// custom components they could hard-code that information as well.
import './Overlay.css';

// A small, valid empty image data URL used below.
const emptyImage =
    'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E';

// Your config must export a BackgroundImage component, called to display the
// static background. DefaultBackgroundImage() takes an image URL, such as
// returned by `require('./image.png')`, and creates a component which simply
// displays that image.
export const BackgroundImage = base.DefaultBackgroundImage(emptyImage);

// Your config must export a TeamName component, called for each team to display
// their team name. DefaultTeamName() creates a component which simply places
// the name as text in a `div` element.
export const TeamName = base.DefaultTeamName();

// Your config must export a ScoreMarkers component, called for each team to
// display their current score and number of wins needed.
// DefaultTextScoreMarkers() creates a component which displays the current score
// as text in a `div` element. See below if you prefer image score markers.
export const ScoreMarkers = base.DefaultTextScoreMarkers();

// DefaultImageScoreMarkers() [note: plural] takes a ScoreMarker component and
// returns a component which calls it for each win or need-to-win marker per
// team. The required ScoreMarker can be created using
// DefaultImageScoreMarker() [note: singular], which takes an object mapping
// states to image URLs, such as returned by `require('image.png')`, and returns
// a component displaying one of those images based on the state it is given.
//
// export const ScoreMarker = base.DefaultImageScoreMarker({
//   'win': { 'blue': emptyImage, 'gold': emptyImage },
//   'empty': { 'blue': emptyImage, 'gold': emptyImage },
// });
// export const ScoreMarkers = base.DefaultImageScoreMarkers(ScoreMarker);
