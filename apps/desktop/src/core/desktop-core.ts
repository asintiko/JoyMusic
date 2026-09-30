import type { NowPlayingEvent } from "@joymusic/dj-bridge";
import type { SessionContext } from "../common/bridge";
import { createAdapterHost } from "./adapter-host";
import { createApiService } from "./api-service";
import { createAuthService } from "./auth-service";
import { createCommandsService } from "./commands-service";
import { createConnectivity } from "./connectivity";
import type { CoreEnvironment } from "./environment";
import { createNowPlayingSync } from "./nowplaying-sync";
import { createRealtimeHub } from "./realtime-hub";
import { createSettingsService } from "./settings-service";
import { createTopic } from "./topic";

export interface CoreOptions {
  createId?: () => string;
  outboxRetryMs?: number;
  onError?: (scope: string, error: unknown) => void;
}

function defaultId(): string {
  return globalThis.crypto.randomUUID();
}

export function createDesktopCore(env: CoreEnvironment, options: CoreOptions = {}) {
  const onError = options.onError ?? (() => undefined);
  const settings = createSettingsService(env.files);
  const auth = createAuthService(env);
  const connectivity = createConnectivity({ timers: env.timers, now: env.now });
  const api = createApiService(env, auth, connectivity);
  const commands = createCommandsService(env, api, connectivity, options.createId ?? defaultId);
  const hub = createRealtimeHub(env, auth, { onClosed: () => void connectivity.probeNow() });
  const adapters = createAdapterHost({
    factory: env.adapterFactory,
    timers: env.timers,
    onError: (id, error) => onError(`adapter:${id}`, error),
  });
  const sync = createNowPlayingSync({
    api,
    commands,
    now: env.now,
    onError: (error) => onError("nowplaying", error),
  });
  const session = createTopic<SessionContext | null>(null);
  let retryTimer: { cancel(): void } | null = null;
  let stopAdapterListener: (() => void) | null = null;
  let stopSettingsListener: (() => void) | null = null;
  let stopRecovered: (() => void) | null = null;

  connectivity.setProbe(async () => {
    await api.call("health");
  });

  return {
    settings,
    auth,
    api,
    commands,
    hub,
    adapters,
    connectivity,
    topics: {
      auth: auth.topic,
      net: connectivity.topic,
      outbox: commands.outbox.topic,
      adapters: adapters.topic,
      settings: settings.topic,
      session,
    },
    async start() {
      await settings.init();
      await auth.restore();
      await commands.outbox.init();
      stopAdapterListener = adapters.onNowPlaying((event: NowPlayingEvent) => sync.handle(event));
      stopSettingsListener = settings.topic.subscribe((value) => {
        void adapters.reconcile(value.adapters);
      });
      stopRecovered = connectivity.onRecovered(() => hub.resyncAll());
      await adapters.reconcile(settings.get().adapters);
      connectivity.start();
      retryTimer = env.timers.every(options.outboxRetryMs ?? 10_000, () => {
        if (
          connectivity.topic.get().online &&
          commands.outbox.size() > 0 &&
          !commands.outbox.isFlushing() &&
          auth.hasSession()
        ) {
          void commands.outbox.flush();
        }
      });
      if (commands.outbox.size() > 0 && auth.hasSession()) void commands.outbox.flush();
    },
    activateSession(context: SessionContext | null) {
      session.set(context);
      sync.setSession(context, adapters.current());
    },
    syncIdle: () => sync.idle(),
    async dispose() {
      retryTimer?.cancel();
      stopAdapterListener?.();
      stopSettingsListener?.();
      stopRecovered?.();
      connectivity.stop();
      hub.dispose();
      await adapters.dispose();
      await settings.flush();
    },
  };
}

export type DesktopCore = ReturnType<typeof createDesktopCore>;
