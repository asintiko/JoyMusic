import { describe, expect, it } from "vitest";
import type { NowPlayingEvent } from "@joymusic/dj-bridge";
import type { Track } from "@joymusic/shared";
import type { OutboxCommand } from "../../src/common/commands";
import {
  buildNowPlayingInput,
  createNowPlayingSync,
  pickArtwork,
} from "../../src/core/nowplaying-sync";
import type { ApiService } from "../../src/core/api-service";
import type { CommandsService } from "../../src/core/commands-service";

const context = {
  venueId: "ven_1",
  venueSlug: "joy-demo-club",
  venueName: "Joy Demo Club",
  venueTheme: "club" as const,
  sessionId: "ses_1",
};

function track(title: string, artist: string, artworkUrl: string | null): Track {
  return {
    id: `deezer:${title}`,
    source: "deezer",
    sourceId: title,
    title,
    artist,
    album: null,
    artworkUrl,
    previewUrl: null,
    durationSec: 200,
    explicit: false,
  };
}

function event(
  title: string,
  extra: Partial<NowPlayingEvent["track"] & object> = {},
): NowPlayingEvent {
  return {
    adapterId: "serato",
    source: "serato",
    reason: "changed",
    at: 1_700_000_000_000,
    track: { title, artist: "Shahzoda", bpm: 96, key: "8A", durationSec: 214, ...extra },
  };
}

function setup(search: (query: string) => Promise<Track[]> = async () => []) {
  const commands: OutboxCommand[] = [];
  const queries: string[] = [];
  const api = {
    call: async (_name: string, input: { query: { q: string } }) => {
      queries.push(input.query.q);
      return { tracks: await search(input.query.q) };
    },
  } as unknown as ApiService;
  const service = {
    run: async (command: OutboxCommand) => {
      commands.push(command);
      return { status: "done" as const };
    },
  } as unknown as CommandsService;
  const sync = createNowPlayingSync({ api, commands: service, now: () => 1_700_000_000_000 });
  return { sync, commands, queries };
}

describe("now playing sync", () => {
  it("does nothing without an active session", async () => {
    const { sync, commands } = setup();
    sync.handle(event("Sevaman"));
    await sync.idle();
    expect(commands).toHaveLength(0);
  });

  it("sends the detected track with normalized metadata", async () => {
    const { sync, commands } = setup();
    sync.setSession(context, null);
    sync.handle(event("Sevaman", { bpm: 30 }));
    await sync.idle();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      kind: "nowplaying.set",
      sessionId: "ses_1",
      input: {
        title: "Sevaman",
        artist: "Shahzoda",
        bpm: 60,
        key: "8A",
        durationSec: 214,
        source: "serato",
      },
    });
  });

  it("looks the artwork up by title when the adapter has none", async () => {
    const { sync, commands, queries } = setup(async () => [
      track("Other song", "Someone", "https://img.example/wrong.jpg"),
      track("Sevaman", "Shahzoda", "https://img.example/sevaman.jpg"),
    ]);
    sync.setSession(context, null);
    sync.handle(event("Sevaman"));
    await sync.idle();
    expect(queries).toEqual(["Shahzoda Sevaman"]);
    const sent = commands[0] as Extract<OutboxCommand, { kind: "nowplaying.set" }>;
    expect(sent.input.artworkUrl).toBe("https://img.example/sevaman.jpg");
  });

  it("keeps the adapter artwork and skips the lookup", async () => {
    const { sync, commands, queries } = setup();
    sync.setSession(context, null);
    sync.handle(event("Sevaman", { artworkUrl: "file:///cover.jpg" }));
    await sync.idle();
    expect(queries).toHaveLength(0);
    expect(
      (commands[0] as Extract<OutboxCommand, { kind: "nowplaying.set" }>).input.artworkUrl,
    ).toBe("file:///cover.jpg");
  });

  it("caches artwork and survives lookup failures", async () => {
    let calls = 0;
    const { sync, commands } = setup(async () => {
      calls += 1;
      throw new Error("catalog down");
    });
    sync.setSession(context, null);
    sync.handle(event("Sevaman"));
    await sync.idle();
    sync.handle(event("Sevaman"));
    await sync.idle();
    expect(commands).toHaveLength(2);
    expect(calls).toBe(2);
  });

  it("sends a clear when the adapter reports no track", async () => {
    const { sync, commands } = setup();
    sync.setSession(context, null);
    sync.handle({ adapterId: "serato", source: "serato", track: null, reason: "cleared", at: 1 });
    await sync.idle();
    expect(commands).toEqual([{ kind: "nowplaying.clear", sessionId: "ses_1" }]);
  });

  it("pushes the current track when a session starts", async () => {
    const { sync, commands } = setup();
    sync.setSession(context, event("Already playing"));
    await sync.idle();
    expect(commands).toHaveLength(1);
    sync.setSession(context, event("Already playing"));
    await sync.idle();
    expect(commands).toHaveLength(1);
  });

  it("collapses a burst into the latest track", async () => {
    const { sync, commands } = setup(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 5)),
    );
    sync.setSession(context, null);
    sync.handle(event("One"));
    sync.handle(event("Two"));
    sync.handle(event("Three"));
    await sync.idle();
    const titles = commands.map((command) =>
      command.kind === "nowplaying.set" ? command.input.title : command.kind,
    );
    expect(titles.at(-1)).toBe("Three");
    expect(titles.length).toBeLessThan(3);
  });

  it("picks the exact title over a loose match", () => {
    const tracks = [
      track("Sevaman (Remix)", "DJ Someone", "https://img.example/remix.jpg"),
      track("Sevaman", "Shahzoda", "https://img.example/original.jpg"),
    ];
    expect(pickArtwork(tracks, { title: "Sevaman", artist: "Shahzoda" })).toBe(
      "https://img.example/original.jpg",
    );
    expect(pickArtwork(tracks, { title: "Nothing", artist: "Nobody" })).toBeNull();
    expect(pickArtwork([track("Sevaman", "X", null)], { title: "Sevaman", artist: "" })).toBeNull();
  });

  it("builds an input the API schema accepts", () => {
    const input = buildNowPlayingInput({ title: "T", artist: "A", bpm: 500 }, "traktor", 1, null);
    expect(input.bpm).toBe(250);
    expect(input.source).toBe("traktor");
    expect(input.durationSec).toBeNull();
  });
});
