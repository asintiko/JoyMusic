import type { RequestItem, VenueState } from "@joymusic/shared";
import { vi } from "vitest";
import type {
  DesktopBridge,
  Envelope,
  RealtimeTarget,
  RealtimeUpdate,
  TopicMap,
  TopicName,
} from "../../../src/common/bridge";
import type { CommandOutcome, OutboxCommand } from "../../../src/common/commands";
import { applySettingsPatch } from "../../../src/common/settings";
import { topicDefaults, resetTopicCache } from "../../../src/renderer/lib/topics";
import { installBridge } from "../../../src/renderer/bridge/access";

export const sessionContext = {
  venueId: "ven_1",
  venueSlug: "joy-demo-club",
  venueName: "Joy Demo Club",
  venueTheme: "club" as const,
  sessionId: "ses_1",
};

const now = "2026-09-30T10:00:00.000Z";

export function makeRequest(id: string, overrides: Partial<RequestItem> = {}): RequestItem {
  return {
    id,
    sessionId: "ses_1",
    venueId: "ven_1",
    track: null,
    freeText: { artist: `Artist ${id}`, title: `Song ${id}` },
    title: `Song ${id}`,
    artist: `Artist ${id}`,
    artworkUrl: null,
    note: null,
    dedicatedTo: null,
    tableLabel: "Table 3",
    votes: 1,
    status: "pending",
    declineReason: null,
    position: null,
    mine: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeState(overrides: Partial<VenueState> = {}): VenueState {
  return {
    venue: {
      id: "ven_1",
      slug: "joy-demo-club",
      name: "Joy Demo Club",
      city: "Tashkent",
      theme: "club",
      logoUrl: null,
      coverUrl: null,
      settings: {
        requestsOpen: true,
        maxRequestsPerDevice: 3,
        windowMinutes: 30,
        duplicateWindowMinutes: 60,
        allowFreeText: true,
        allowNotes: true,
        showArtwork: true,
        defaultLocale: "en",
      },
    },
    session: { id: "ses_1", djName: "DJ Rustam", startedAt: "2026-09-30T09:00:00.000Z" },
    nowPlaying: null,
    queue: [],
    pending: [],
    recentlyPlayed: [],
    seq: 1,
    serverTime: now,
    ...overrides,
  };
}

export interface FakeBridge extends DesktopBridge {
  commandsRun: ReturnType<typeof vi.fn>;
  retryOutbox: ReturnType<typeof vi.fn>;
  setTopic<K extends TopicName>(name: K, value: TopicMap[K]): void;
  pushRealtime(state: VenueState | null, status?: RealtimeUpdate["status"]): void;
  targets: RealtimeTarget[];
  commandLog: OutboxCommand[];
  apiHandlers: Record<string, (input: unknown) => unknown>;
}

export function createFakeBridge(): FakeBridge {
  const topics = new Map<TopicName, unknown>(
    Object.entries(topicDefaults) as [TopicName, unknown][],
  );
  const topicListeners = new Map<TopicName, Set<(value: unknown) => void>>();
  const realtimeListeners = new Set<(update: RealtimeUpdate) => void>();
  const commandLog: OutboxCommand[] = [];
  const targets: RealtimeTarget[] = [];
  let lastUpdate: RealtimeUpdate | null = null;

  const setTopic = <K extends TopicName>(name: K, value: TopicMap[K]) => {
    topics.set(name, value);
    for (const listener of topicListeners.get(name) ?? []) listener(value);
  };

  const commandsRun = vi.fn(async (command: OutboxCommand): Promise<Envelope<CommandOutcome>> => {
    commandLog.push(command);
    return { ok: true, value: { status: "done" } };
  });
  const retryOutbox = vi.fn(async () => undefined);
  const apiHandlers: Record<string, (input: unknown) => unknown> = {};

  const bridge: FakeBridge = {
    commandsRun,
    retryOutbox,
    setTopic,
    targets,
    commandLog,
    apiHandlers,
    pushRealtime(state, status = "open") {
      lastUpdate = {
        target: { venue: "joy-demo-club", role: "dj" },
        state,
        status,
        offsetMs: 0,
        receivedAt: Date.parse(now),
      };
      for (const listener of realtimeListeners) listener(lastUpdate);
    },
    info: async () => ({
      version: "9.9.9",
      platform: "darwin",
      packaged: false,
      apiUrl: "http://api.test",
      adminUrl: "http://admin.test",
      webUrl: "http://web.test",
      systemLocale: "en-US",
      homeDirectory: "/Users/dj",
      shim: true,
    }),
    topics: {
      get: async (name) => topics.get(name) as never,
      subscribe(name, listener) {
        let set = topicListeners.get(name);
        if (!set) {
          set = new Set();
          topicListeners.set(name, set);
        }
        set.add(listener as (value: unknown) => void);
        return () => set.delete(listener as (value: unknown) => void);
      },
    },
    auth: {
      loginWithPassword: async () => ({ ok: true, value: topicDefaults.auth }),
      beginBrowserLogin: async () => ({ ok: true, value: { url: "http://admin.test" } }),
      cancelBrowserLogin: async () => undefined,
      logout: async () => undefined,
    },
    api: {
      call: (async (name: string, input: unknown) => {
        const handler = apiHandlers[name];
        if (!handler) return { ok: false, error: { code: "not_found", message: name } };
        return { ok: true, value: handler(input) };
      }) as DesktopBridge["api"]["call"],
    },
    commands: {
      run: commandsRun,
      retryOutbox,
      discardOutbox: async () => undefined,
    },
    session: { activate: async () => undefined },
    realtime: {
      subscribe(target, listener) {
        targets.push(target);
        realtimeListeners.add(listener);
        if (lastUpdate) listener(lastUpdate);
        return () => {
          realtimeListeners.delete(listener);
        };
      },
      resync: async () => undefined,
    },
    settings: {
      update: async (patch) => {
        const next = applySettingsPatch(topics.get("settings") as TopicMap["settings"], patch);
        setTopic("settings", next);
        return { ok: true, value: next };
      },
    },
    adapters: { advanceSimulator: async () => undefined },
    midi: { loadBindings: async () => null, saveBindings: async () => undefined },
    stage: {
      open: async () => ({ ok: true, value: topicDefaults.stage }),
      close: async () => undefined,
      setConfig: async () => undefined,
      refreshDisplays: async () => [],
    },
    updates: { check: async () => undefined, install: async () => undefined },
    menu: { onCommand: () => () => undefined },
    system: { pickPath: async () => null, openExternal: async () => undefined },
  };
  return bridge;
}

export function installFakeBridge(): FakeBridge {
  resetTopicCache();
  const bridge = createFakeBridge();
  installBridge(bridge);
  bridge.setTopic("session", sessionContext);
  return bridge;
}
