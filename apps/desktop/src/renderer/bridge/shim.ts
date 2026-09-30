import { createSimulatorAdapter, createStatusHolder } from "@joymusic/dj-bridge";
import type { NowPlayingAdapter } from "@joymusic/dj-bridge";
import type {
  AppInfo,
  DesktopBridge,
  DisplayInfo,
  StageConfig,
  StageState,
  TopicMap,
  TopicName,
  UpdateState,
} from "../../common/bridge";
import { settingsPatchSchema } from "../../common/settings";
import { createDesktopCore } from "../../core/desktop-core";
import { parseDeepLink } from "../../core/deep-link";
import type { AdapterFactory, FileStore, SecretStore } from "../../core/environment";
import { wrapEnvelope } from "../../core/errors";
import { createTopic } from "../../core/topic";
import type { Topic } from "../../core/topic";

interface ShimWindow extends Window {
  __joyShim?: {
    bridge: DesktopBridge;
    deepLink(url: string): Promise<void>;
    lastOpenedUrl(): string | null;
    dispose(): Promise<void>;
  };
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createLocalFiles(namespace: string): FileStore {
  const memory = new Map<string, string>();
  const storage = safeStorage();
  const key = (name: string) => `joy.shim.${namespace}.${name}`;
  return {
    async read(name) {
      return storage?.getItem(key(name)) ?? memory.get(name) ?? null;
    },
    async write(name, text) {
      memory.set(name, text);
      storage?.setItem(key(name), text);
    },
  };
}

function createLocalSecrets(namespace: string): SecretStore {
  const storage = safeStorage();
  const key = `joy.shim.${namespace}.session`;
  let memory: string | null = null;
  return {
    available: () => true,
    async load() {
      return storage?.getItem(key) ?? memory;
    },
    async save(text) {
      memory = text;
      storage?.setItem(key, text);
    },
    async clear() {
      memory = null;
      storage?.removeItem(key);
    },
  };
}

const shimDisplays: DisplayInfo[] = [
  { id: 1, label: "Built-in display", width: 2880, height: 1800, primary: true, scaleFactor: 2 },
  { id: 2, label: "Venue TV (HDMI)", width: 1920, height: 1080, primary: false, scaleFactor: 1 },
];

export async function createShimBridge(): Promise<DesktopBridge> {
  const params = new URLSearchParams(window.location.search);
  const namespace = params.get("ns") ?? "default";
  const apiUrl =
    params.get("api") ?? safeStorage()?.getItem("joy.shim.api") ?? "http://localhost:4000";
  const adminUrl = params.get("admin") ?? "http://localhost:5173";
  const webUrl = params.get("web") ?? "http://localhost:3000";
  const files = createLocalFiles(namespace);
  let lastOpened: string | null = null;

  const adapterFactory: AdapterFactory = (id) => {
    if (id === "simulator") return createSimulatorAdapter();
    const holder = createStatusHolder();
    const placeholder: NowPlayingAdapter = {
      id,
      label: id,
      source: "manual",
      async start(sink) {
        holder.bind(sink);
        holder.set("unavailable", "Only available in the desktop app");
      },
      async stop() {
        holder.bind(null);
        holder.set("stopped");
      },
      status: () => holder.get(),
    };
    return placeholder;
  };

  const core = createDesktopCore(
    {
      config: { apiUrl, adminUrl, webUrl },
      fetch: window.fetch.bind(window),
      WebSocketImpl: window.WebSocket,
      secrets: createLocalSecrets(namespace),
      files,
      openExternal: async (url) => {
        lastOpened = url;
      },
      now: () => Date.now(),
      timers: {
        after(ms, task) {
          const handle = window.setTimeout(task, ms);
          return { cancel: () => window.clearTimeout(handle) };
        },
        every(ms, task) {
          const handle = window.setInterval(task, ms);
          return { cancel: () => window.clearInterval(handle) };
        },
      },
      adapterFactory,
    },
    {
      onError: (scope, error) => console.warn(`[joymusic:shim] ${scope}`, error),
    },
  );
  await core.start();
  window.addEventListener("offline", () => core.connectivity.reportFailure());
  window.addEventListener("online", () => void core.connectivity.probeNow());

  const stageTopic = createTopic<StageState>({
    open: false,
    displayId: null,
    displays: shimDisplays,
  });
  const stageConfigKey = `joy.shim.${namespace}.stageConfig`;
  const storedStageConfig = safeStorage()?.getItem(stageConfigKey) ?? null;
  const stageConfigTopic = createTopic<StageConfig | null>(
    storedStageConfig ? (JSON.parse(storedStageConfig) as StageConfig) : null,
  );
  window.addEventListener("storage", (event) => {
    if (event.key !== stageConfigKey) return;
    stageConfigTopic.set(event.newValue ? (JSON.parse(event.newValue) as StageConfig) : null);
  });
  const updatesTopic = createTopic<UpdateState>({
    status: "disabled",
    version: null,
    progress: null,
    message: null,
    checkedAt: null,
  });

  const topics: { [K in TopicName]: Topic<TopicMap[K]> } = {
    ...core.topics,
    stage: stageTopic,
    stageConfig: stageConfigTopic,
    updates: updatesTopic,
  };

  const info: AppInfo = {
    version: "0.1.0-shim",
    platform: "darwin",
    packaged: false,
    apiUrl,
    adminUrl,
    webUrl,
    systemLocale: navigator.language,
    homeDirectory: "/Users/dj",
    shim: true,
  };

  const shimWindow = window as ShimWindow;
  shimWindow.__joyShim = {
    get bridge() {
      return bridge;
    },
    async deepLink(url) {
      const link = parseDeepLink(url);
      if (link) await core.auth.handleDeepLink(link);
    },
    lastOpenedUrl: () => lastOpened,
    dispose: () => core.dispose(),
  };

  const bridge: DesktopBridge = {
    info: async () => info,
    topics: {
      get: async (name) => topics[name].get(),
      subscribe: (name, listener) => topics[name].subscribe(listener as never),
    },
    auth: {
      loginWithPassword: (email, password) =>
        wrapEnvelope(() => core.auth.loginWithPassword(email, password)),
      beginBrowserLogin: () => wrapEnvelope(() => core.auth.beginBrowserLogin()),
      cancelBrowserLogin: async () => core.auth.cancelBrowserLogin(),
      logout: async () => {
        core.activateSession(null);
        await core.auth.logout();
      },
    },
    api: {
      call: (name, input) =>
        wrapEnvelope(async () => {
          const call = core.api.call as (name: string, ...args: unknown[]) => Promise<unknown>;
          return (await call(name, input ?? {})) as never;
        }),
    },
    commands: {
      run: (command) => wrapEnvelope(() => core.commands.run(command)),
      retryOutbox: async () => {
        await core.commands.retry();
      },
      discardOutbox: () => core.commands.discard(),
    },
    session: {
      activate: async (context) => core.activateSession(context),
    },
    realtime: {
      subscribe: (target, listener) => core.hub.subscribe(target, listener),
      resync: async () => core.hub.resyncAll(),
    },
    settings: {
      update: (patch) =>
        wrapEnvelope(async () => core.settings.update(settingsPatchSchema.parse(patch))),
    },
    adapters: {
      advanceSimulator: async () => core.adapters.advanceSimulator(),
    },
    midi: {
      loadBindings: () => files.read("midi-bindings.json"),
      saveBindings: (json) => files.write("midi-bindings.json", json),
    },
    stage: {
      open: (displayId) =>
        wrapEnvelope(async () => {
          stageTopic.update((current) => ({
            ...current,
            open: true,
            displayId: displayId ?? shimDisplays[1]?.id ?? null,
          }));
          return stageTopic.get();
        }),
      close: async () => stageTopic.update((current) => ({ ...current, open: false })),
      setConfig: async (config) => {
        stageConfigTopic.set(config);
        const storage = safeStorage();
        if (config) storage?.setItem(stageConfigKey, JSON.stringify(config));
        else storage?.removeItem(stageConfigKey);
      },
      refreshDisplays: async () => shimDisplays,
    },
    updates: {
      check: async () => undefined,
      install: async () => undefined,
    },
    menu: {
      onCommand: () => () => undefined,
    },
    system: {
      pickPath: async () => null,
      openExternal: async (url) => {
        lastOpened = url;
      },
    },
  };
  return bridge;
}
