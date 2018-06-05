import * as React from 'react';
import { CabColor } from '../../lib/MatchState';

type CabSide = 'left' | 'right';
type ScoreStatus = 'win' | 'empty';

export interface BackgroundImageProps {
}
export function DefaultBackgroundImage(image: string):
    (props: BackgroundImageProps) => JSX.Element {
  return (props) => {
    return <img id="overlayBackgroundImg" src={image} />;
  };
}

export interface TeamNameProps {
  team: CabColor;
  side: CabSide;
  name: string;
}
export function DefaultTeamName(): (props: TeamNameProps) => JSX.Element {
  return (props) => {
    return (
      <div id={`${props.team}TeamName`} className="teamName">
        {props.name}
      </div>
    );
  };
}

export interface ScoreMarkersProps {
  team: CabColor;
  side: CabSide;
  score: number;
  seriesLength: number;
}

export function DefaultImageScoreMarkers(ScoreMarker: any):
    (props: ScoreMarkersProps) => JSX.Element {
  return (props) => {
    const markers: JSX.Element[] = [];
    const winsNeeded = Math.ceil(props.seriesLength / 2);
    for (let i = 0; i < winsNeeded; i++) {
      const status = i < props.score ? 'win' : 'empty';
      markers.push(
          <ScoreMarker
            key={status + i}
            team={props.team}
            side={props.side}
            index={i}
            status={status}
          />
      );
    }
    return (
      <div id={`${props.team}ScoreMarkers`} className="scoreMarkers">
        {markers}
      </div>
    );
  };
}

export function DefaultTextScoreMarkers():
    (props: ScoreMarkersProps) => JSX.Element {
  return (props) => {
    return (
      <div
        id={`${props.team}ScoreMarkers`}
        className="scoreMarkers"
      >
        {props.score}
      </div>
    );
  };
}

export interface ScoreMarkerProps {
  team: CabColor;
  side: CabSide;
  index: number;
  status: ScoreStatus;
}
export type ScoreMarkerImages = {
  [S in ScoreStatus]: {
    [C in CabColor]: string;
  };
};
export type SidedScoreMarkerImages = {
  [S in CabSide]: ScoreMarkerImages;
};

export function DefaultImageScoreMarker(
    images: ScoreMarkerImages | SidedScoreMarkerImages):
    (props: ScoreMarkerProps) => JSX.Element {
  const sidedImages = ('left' in images)
                          ? (images as SidedScoreMarkerImages)
                          : { left: (images as ScoreMarkerImages),
                              right: (images as ScoreMarkerImages) };
  return (props) => {
    return (
      <img
        id={`${props.team}Score${props.index}`}
        src={sidedImages[props.side][props.status][props.team]}
        className={props.status}
      />
    );
  };
}
