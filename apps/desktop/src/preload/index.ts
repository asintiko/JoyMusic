import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { DesktopBridge, RealtimeUpdate, TopicMap, TopicName } from "../common/bridge";
import { channels } from "../common/channels";
import type { MenuCommand } from "../common/channels";

type TopicListener = (value: unknown) => void;

const topicListeners = new Map<TopicName, Set<TopicListener>>();
const realtimeListeners = new Map<string, (update: RealtimeUpdate) => void>();
const menuListeners = new Set<(command: MenuCommand) => void>();

ipcRenderer.on(
  channels.topicPush,
  (_event: IpcRendererEvent, message: { name: TopicName; value: unknown }) => {
    const listeners = topicListeners.get(message.name);
    if (!listeners) return;
    for (const listener of [...listeners]) listener(message.value);
  },
);

ipcRenderer.on(
  channels.realtimePush,
  (_event: IpcRendererEvent, message: { id: string; update: RealtimeUpdate }) => {
    realtimeListeners.get(message.id)?.(message.update);
  },
);

ipcRenderer.on(channels.menuCommand, (_event: IpcRendererEvent, command: MenuCommand) => {
  for (const listener of [...menuListeners]) listener(command);
});

let subscriptionCounter = 0;

const bridge: DesktopBridge = {
  info: () => ipcRenderer.invoke(channels.info),
  topics: {
    get: <K extends TopicName>(name: K) =>
      ipcRenderer.invoke(channels.topicGet, { name }) as Promise<TopicMap[K]>,
    subscribe(name, listener) {
      let listeners = topicListeners.get(name);
      if (!listeners) {
        listeners = new Set();
        topicListeners.set(name, listeners);
      }
      const wrapped: TopicListener = (value) => listener(value as never);
      listeners.add(wrapped);
      return () => {
        listeners.delete(wrapped);
      };
    },
  },
  auth: {
    loginWithPassword: (email, password) =>
      ipcRenderer.invoke(channels.authPassword, { email, password }),
    beginBrowserLogin: () => ipcRenderer.invoke(channels.authBrowserBegin),
    cancelBrowserLogin: () => ipcRenderer.invoke(channels.authBrowserCancel),
    logout: () => ipcRenderer.invoke(channels.authLogout),
  },
  api: {
    call: (name, input) => ipcRenderer.invoke(channels.apiCall, { name, input }),
  },
  commands: {
    run: (command) => ipcRenderer.invoke(channels.commandRun, command),
    retryOutbox: () => ipcRenderer.invoke(channels.outboxRetry),
    discardOutbox: () => ipcRenderer.invoke(channels.outboxDiscard),
  },
  session: {
    activate: (context) => ipcRenderer.invoke(channels.sessionActivate, context),
  },
  realtime: {
    subscribe(target, listener) {
      subscriptionCounter += 1;
      const id = `rt-${Date.now().toString(36)}-${subscriptionCounter}`;
      realtimeListeners.set(id, listener);
      ipcRenderer.send(channels.realtimeSubscribe, { id, target });
      return () => {
        realtimeListeners.delete(id);
        ipcRenderer.send(channels.realtimeUnsubscribe, { id });
      };
    },
    resync: () => ipcRenderer.invoke(channels.realtimeResync),
  },
  settings: {
    update: (patch) => ipcRenderer.invoke(channels.settingsUpdate, patch),
  },
  adapters: {
    advanceSimulator: () => ipcRenderer.invoke(channels.adaptersAdvance),
  },
  midi: {
    loadBindings: () => ipcRenderer.invoke(channels.midiLoad),
    saveBindings: (json) => ipcRenderer.invoke(channels.midiSave, { json }),
  },
  stage: {
    open: (displayId) => ipcRenderer.invoke(channels.stageOpen, { displayId: displayId ?? null }),
    close: () => ipcRenderer.invoke(channels.stageClose),
    setConfig: (config) => ipcRenderer.invoke(channels.stageConfig, config),
    refreshDisplays: () => ipcRenderer.invoke(channels.stageDisplays),
  },
  updates: {
    check: () => ipcRenderer.invoke(channels.updatesCheck),
    install: () => ipcRenderer.invoke(channels.updatesInstall),
  },
  menu: {
    onCommand(listener) {
      menuListeners.add(listener);
      return () => {
        menuListeners.delete(listener);
      };
    },
  },
  system: {
    pickPath: (kind) => ipcRenderer.invoke(channels.pickPath, { kind }),
    openExternal: (url) => ipcRenderer.invoke(channels.openExternal, { url }),
  },
};

contextBridge.exposeInMainWorld("joy", bridge);
