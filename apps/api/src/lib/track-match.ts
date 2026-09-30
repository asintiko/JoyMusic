import { toMatchKey } from "./text";

export interface TrackLike {
  artist: string;
  title: string;
}

function baseTitle(title: string): string {
  return title.replace(/[([{][^)\]}]*[)\]}]/g, " ").replace(/\b(?:feat|ft|featuring)\b.*$/i, " ");
}

export function exactTrackKey(track: TrackLike): string {
  return `${toMatchKey(track.artist)}|${toMatchKey(track.title)}`;
}

export function tracksSimilar(left: TrackLike, right: TrackLike): boolean {
  const leftTitle = toMatchKey(baseTitle(left.title));
  const rightTitle = toMatchKey(baseTitle(right.title));
  if (leftTitle.length === 0 || leftTitle !== rightTitle) return false;
  const leftArtist = toMatchKey(left.artist);
  const rightArtist = toMatchKey(right.artist);
  if (leftArtist.length === 0 || rightArtist.length === 0) return true;
  return (
    leftArtist === rightArtist ||
    leftArtist.includes(rightArtist) ||
    rightArtist.includes(leftArtist)
  );
}
