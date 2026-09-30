import { ipcMain } from "electron";
import type { IpcMainInvokeEvent, WebContents } from "electron";
import type { RouteName } from "@joymusic/shared";
import { topicNames } from "../common/bridge";
import type { AppInfo, StageConfig, TopicMap, TopicName } from "../common/bridge";
import {
  apiCallSchema,
  channels,
  commandRunSchema,
  midiSaveSchema,
  openExternalSchema,
  passwordLoginSchema,
  pickPathSchema,
  realtimeSubscribeSchema,
  realtimeUnsubscribeSchema,
  sessionContextSchema,
  settingsUpdateSchema,
  stageConfigSchema,
  stageOpenSchema,
  topicGetSchema,
} from "../common/ipc";
import type { DesktopCore } from "../core/desktop-core";
import type { FileStore } from "../core/environment";
import { wrapEnvelope } from "../core/errors";
import type { Topic } from "../core/topic";
import { validateRouteInput } from "./route-input";
import { isAppUrl, isSafeExternalUrl } from "./security";
import type { StageManager } from "./windows";
import type { UpdaterService } from "./updater";

export const midiBindingsFileName = "midi-bindings.json";

export interface IpcDependencies {
  core: DesktopCore;
  stage: StageManager;
  updater: UpdaterService;
  info: AppInfo;
  files: FileStore;
  developmentOrigin: string | null;
  stageConfig: Topic<StageConfig | null>;
  allWebContents(): WebContents[];
  pickPath(kind: "directory" | "file", sender: WebContents): Promise<string | null>;
  openExternal(url: string): Promise<void>;
}

function validationError(message: string) {
  return { ok: false as const, error: { code: "validation_failed", message } };
}

export function registerIpc(deps: IpcDependencies): () => void {
  const { core } = deps;
  const subscriptions = new Map<string, () => void>();
  const disposers: (() => void)[] = [];

  const topics: { [K in TopicName]: Topic<TopicMap[K]> } = {
    ...core.topics,
    stage: deps.stage.topic,
    stageConfig: deps.stageConfig,
    updates: deps.updater.topic,
  };

  const trusted = (event: {
    senderFrame?: { url: string } | null;
    sender: WebContents;
  }): boolean => {
    const url = event.senderFrame?.url ?? event.sender.getURL();
    return isAppUrl(url, deps.developmentOrigin);
  };

  const handle = <T>(
    channel: string,
    work: (payload: unknown, event: IpcMainInvokeEvent) => Promise<T> | T,
  ) => {
    ipcMain.handle(channel, async (event, payload: unknown) => {
      if (!trusted(event)) throw new Error("Untrusted sender");
      return work(payload, event);
    });
  };

  const parseOr = <T>(
    schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
    payload: unknown,
  ): T | null => {
    const parsed = schema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  };

  for (const name of topicNames) {
    const topic = topics[name] as Topic<unknown>;
    disposers.push(
      topic.subscribe((value) => {
        for (const contents of deps.allWebContents()) {
          if (!contents.isDestroyed()) contents.send(channels.topicPush, { name, value });
        }
      }),
    );
  }

  handle(channels.info, () => deps.info);

  handle(channels.topicGet, (payload) => {
    const parsed = parseOr(topicGetSchema, payload);
    if (!parsed) throw new Error("Unknown topic");
    return topics[parsed.name].get();
  });

  handle(channels.authPassword, (payload) => {
    const parsed = parseOr(passwordLoginSchema, payload);
    if (!parsed) return validationError("Invalid credentials");
    return wrapEnvelope(() => core.auth.loginWithPassword(parsed.email, parsed.password));
  });
  handle(channels.authBrowserBegin, () => wrapEnvelope(() => core.auth.beginBrowserLogin()));
  handle(channels.authBrowserCancel, () => core.auth.cancelBrowserLogin());
  handle(channels.authLogout, async () => {
    core.activateSession(null);
    await core.auth.logout();
  });

  handle(channels.apiCall, (payload) => {
    const parsed = parseOr(apiCallSchema, payload);
    if (!parsed) return validationError("Unknown route");
    return wrapEnvelope(async () => {
      const input = validateRouteInput(parsed.name, parsed.input);
      const call = core.api.call as (name: RouteName, ...args: unknown[]) => Promise<unknown>;
      return call(parsed.name, input);
    });
  });

  handle(channels.commandRun, (payload) => {
    const parsed = parseOr(commandRunSchema, payload);
    if (!parsed) return validationError("Invalid command");
    return wrapEnvelope(() => core.commands.run(parsed));
  });
  handle(channels.outboxRetry, async () => {
    await core.commands.retry();
  });
  handle(channels.outboxDiscard, async () => {
    await core.commands.discard();
  });

  handle(channels.sessionActivate, (payload) => {
    const parsed = sessionContextSchema.safeParse(payload);
    if (!parsed.success) throw new Error("Invalid session context");
    core.activateSession(parsed.data);
  });

  ipcMain.on(channels.realtimeSubscribe, (event, payload: unknown) => {
    if (!trusted(event)) return;
    const parsed = parseOr(realtimeSubscribeSchema, payload);
    if (!parsed) return;
    const key = `${event.sender.id}:${parsed.id}`;
    subscriptions.get(key)?.();
    const sender = event.sender;
    const unsubscribe = core.hub.subscribe(parsed.target, (update) => {
      if (!sender.isDestroyed()) sender.send(channels.realtimePush, { id: parsed.id, update });
    });
    subscriptions.set(key, unsubscribe);
    sender.once("destroyed", () => {
      subscriptions.get(key)?.();
      subscriptions.delete(key);
    });
  });
  ipcMain.on(channels.realtimeUnsubscribe, (event, payload: unknown) => {
    const parsed = parseOr(realtimeUnsubscribeSchema, payload);
    if (!parsed) return;
    const key = `${event.sender.id}:${parsed.id}`;
    subscriptions.get(key)?.();
    subscriptions.delete(key);
  });
  handle(channels.realtimeResync, () => core.hub.resyncAll());

  handle(channels.settingsUpdate, (payload) => {
    const parsed = parseOr(settingsUpdateSchema, payload);
    if (!parsed) return validationError("Invalid settings");
    return wrapEnvelope(() => core.settings.update(parsed));
  });
  handle(channels.adaptersAdvance, () => core.adapters.advanceSimulator());

  handle(channels.midiLoad, () => deps.files.read(midiBindingsFileName));
  handle(channels.midiSave, async (payload) => {
    const parsed = parseOr(midiSaveSchema, payload);
    if (!parsed) throw new Error("Invalid bindings");
    await deps.files.write(midiBindingsFileName, parsed.json);
  });

  handle(channels.stageOpen, (payload) => {
    const parsed = parseOr(stageOpenSchema, payload ?? {});
    if (!parsed) return validationError("Invalid display");
    return wrapEnvelope(async () =>
      deps.stage.open(parsed.displayId ?? core.settings.get().stage.displayId),
    );
  });
  handle(channels.stageClose, () => deps.stage.close());
  handle(channels.stageConfig, (payload) => {
    const parsed = stageConfigSchema.safeParse(payload);
    if (!parsed.success) throw new Error("Invalid stage config");
    deps.stageConfig.set(parsed.data);
  });
  handle(channels.stageDisplays, () => deps.stage.refresh());

  handle(channels.updatesCheck, () => deps.updater.check());
  handle(channels.updatesInstall, () => deps.updater.install());

  handle(channels.pickPath, (payload, event) => {
    const parsed = parseOr(pickPathSchema, payload);
    if (!parsed) throw new Error("Invalid request");
    return deps.pickPath(parsed.kind, event.sender);
  });
  handle(channels.openExternal, (payload) => {
    const parsed = parseOr(openExternalSchema, payload);
    if (!parsed || !isSafeExternalUrl(parsed.url)) throw new Error("Invalid url");
    return deps.openExternal(parsed.url);
  });

  return () => {
    for (const dispose of disposers) dispose();
    for (const unsubscribe of subscriptions.values()) unsubscribe();
    subscriptions.clear();
    for (const channel of Object.values(channels)) {
      ipcMain.removeHandler(channel);
      ipcMain.removeAllListeners(channel);
    }
  };
}
