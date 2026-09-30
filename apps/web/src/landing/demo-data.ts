export interface DemoTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  bpm: number;
}

export const demoTracks: readonly DemoTrack[] = [
  { id: "night-signal", title: "Night Signal", artist: "Atlas Lights", duration: "3:42", bpm: 122 },
  {
    id: "registon-sunrise",
    title: "Registon Sunrise",
    artist: "Atlas Lights",
    duration: "4:05",
    bpm: 118,
  },
  { id: "ikat-dreams", title: "Ikat Dreams", artist: "Kizil Atlas", duration: "3:18", bpm: 124 },
];

export interface TickerTrack extends DemoTrack {
  table: number;
}

export const tickerTracks: readonly TickerTrack[] = [
  {
    id: "t1",
    title: "Velvet Circuit",
    artist: "Marble Hours",
    duration: "3:51",
    bpm: 121,
    table: 7,
  },
  {
    id: "t2",
    title: "Silk Road Neon",
    artist: "Kizil Atlas",
    duration: "4:12",
    bpm: 124,
    table: 3,
  },
  {
    id: "t3",
    title: "Midnight Bazaar",
    artist: "Atlas Lights",
    duration: "3:29",
    bpm: 118,
    table: 12,
  },
  {
    id: "t4",
    title: "Saffron Static",
    artist: "Marble Hours",
    duration: "3:44",
    bpm: 126,
    table: 5,
  },
  {
    id: "t5",
    title: "Tashkent After Dark",
    artist: "Low Tide Club",
    duration: "4:01",
    bpm: 120,
    table: 9,
  },
];

export function findDemoTrack(id: string | null): DemoTrack | null {
  return demoTracks.find((track) => track.id === id) ?? null;
}

export function durationToSeconds(duration: string): number {
  const [minutes = "0", seconds = "0"] = duration.split(":");
  return Number(minutes) * 60 + Number(seconds);
}
