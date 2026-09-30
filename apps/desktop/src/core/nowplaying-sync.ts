import { toNowPlaying } from "@joymusic/dj-bridge";
import type { DetectedTrack, NowPlayingEvent } from "@joymusic/dj-bridge";
import type { NowPlayingInput, Track } from "@joymusic/shared";
import type { SessionContext } from "../common/bridge";
import type { ApiService } from "./api-service";
import type { CommandsService } from "./commands-service";

export interface NowPlayingSyncOptions {
  api: ApiService;
  commands: CommandsService;
  now(): number;
  artworkTimeoutMs?: number;
  onError?: (error: unknown) => void;
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function pickArtwork(tracks: readonly Track[], wanted: { title: string; artist: string }) {
  const title = normalize(wanted.title);
  const artist = normalize(wanted.artist);
  if (title.length === 0) return null;
  const withArtwork = tracks.filter((track) => track.artworkUrl !== null);
  const exact = withArtwork.find((track) => {
    if (normalize(track.title) !== title) return false;
    if (artist.length === 0) return true;
    const candidate = normalize(track.artist);
    return candidate.includes(artist) || artist.includes(candidate);
  });
  if (exact) return exact.artworkUrl;
  const byTitle = withArtwork.find((track) => normalize(track.title) === title);
  return byTitle?.artworkUrl ?? null;
}

export function buildNowPlayingInput(
  track: DetectedTrack,
  source: NowPlayingEvent["source"],
  now: number,
  artworkUrl: string | null,
): NowPlayingInput {
  const detected = toNowPlaying(
    { ...track, artworkUrl: artworkUrl ?? track.artworkUrl },
    source,
    now,
  );
  return {
    title: detected.title,
    artist: detected.artist,
    artworkUrl: detected.artworkUrl,
    durationSec: detected.durationSec,
    bpm: detected.bpm,
    key: detected.key,
    source: detected.source,
    startedAt: detected.startedAt,
  };
}

export function createNowPlayingSync(options: NowPlayingSyncOptions) {
  const artworkTimeoutMs = options.artworkTimeoutMs ?? 2500;
  const artworkCache = new Map<string, string | null>();
  let context: SessionContext | null = null;
  let latest: NowPlayingEvent | null = null;
  let running: Promise<void> | null = null;
  let dirty = false;

  const resolveArtwork = async (track: DetectedTrack): Promise<string | null> => {
    if (track.artworkUrl) return track.artworkUrl;
    const key = `${normalize(track.artist)}|${normalize(track.title)}`;
    if (artworkCache.has(key)) return artworkCache.get(key) ?? null;
    const lookup = options.api
      .call("catalogSearch", {
        query: { q: `${track.artist} ${track.title}`.trim(), limit: 8 },
      })
      .then((result) => pickArtwork(result.tracks, track))
      .catch(() => null);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      handle = setTimeout(() => resolve(null), artworkTimeoutMs);
    });
    const url = await Promise.race([lookup, timeout]);
    clearTimeout(handle);
    if (url !== null) artworkCache.set(key, url);
    return url;
  };

  const push = async () => {
    for (;;) {
      dirty = false;
      const session = context;
      const event = latest;
      if (!session || !event) return;
      try {
        if (event.track) {
          const artworkUrl = await resolveArtwork(event.track);
          if (dirty) continue;
          await options.commands.run({
            kind: "nowplaying.set",
            sessionId: session.sessionId,
            input: buildNowPlayingInput(event.track, event.source, options.now(), artworkUrl),
          });
        } else {
          await options.commands.run({ kind: "nowplaying.clear", sessionId: session.sessionId });
        }
      } catch (error) {
        options.onError?.(error);
      }
      if (!dirty) return;
    }
  };

  const schedule = () => {
    dirty = true;
    if (running) return;
    running = push().finally(() => {
      running = null;
      if (dirty) schedule();
    });
  };

  return {
    handle(event: NowPlayingEvent) {
      latest = event;
      schedule();
    },
    setSession(next: SessionContext | null, current: NowPlayingEvent | null) {
      const changed = context?.sessionId !== next?.sessionId;
      context = next;
      if (next && changed && current?.track) {
        latest = current;
        schedule();
      }
    },
    idle: async () => {
      while (running) await running;
    },
  };
}

export type NowPlayingSync = ReturnType<typeof createNowPlayingSync>;
