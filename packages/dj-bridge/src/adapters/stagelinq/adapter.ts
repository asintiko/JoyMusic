import { createStatusHolder, systemClock } from "../../core/timers";
import type { Clock, NowPlayingAdapter, NowPlayingSink } from "../../core/types";
import { describeError, dynamicModuleLoader } from "../module-loader";
import type { ModuleLoader } from "../module-loader";
import { mapStageLinqDeck } from "./mapper";
import type { StageLinqMapOptions, StageLinqPlayerStatusLike } from "./mapper";

type PlayerListener = (status: StageLinqPlayerStatusLike) => void;

export interface StageLinqInstanceLike {
  devices: {
    on(event: "trackLoaded" | "nowPlaying" | "stateChanged", listener: PlayerListener): unknown;
    off?(event: "trackLoaded" | "nowPlaying" | "stateChanged", listener: PlayerListener): unknown;
  };
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface StageLinqModuleLike {
  StageLinq: new (options?: Record<string, unknown>) => StageLinqInstanceLike;
}

export interface StageLinqAdapterOptions extends StageLinqMapOptions {
  loader?: ModuleLoader;
  clock?: Clock;
}

export const stageLinqModuleName = "stagelinq";

const playerEvents = ["trackLoaded", "nowPlaying", "stateChanged"] as const;

export function createStageLinqAdapter(options: StageLinqAdapterOptions = {}): NowPlayingAdapter {
  const clock = options.clock ?? systemClock;
  const loader = options.loader ?? dynamicModuleLoader;
  const holder = createStatusHolder(clock);
  let generation = 0;
  let instance: StageLinqInstanceLike | null = null;
  let handler: PlayerListener | null = null;

  const connect = async (sink: NowPlayingSink, token: number) => {
    let module: StageLinqModuleLike;
    try {
      module = (await loader(stageLinqModuleName)) as StageLinqModuleLike;
    } catch {
      holder.set("unavailable", "The stagelinq package is not installed");
      return;
    }
    try {
      const created = new module.StageLinq({ downloadDbSources: false });
      const onPlayer: PlayerListener = (status) => {
        if (token !== generation) return;
        const mapped = mapStageLinqDeck(status, options);
        if (mapped !== null) sink.deck(mapped);
      };
      for (const event of playerEvents) created.devices.on(event, onPlayer);
      instance = created;
      handler = onPlayer;
      holder.set("waiting", "Waiting for Denon / Engine devices");
      await created.connect();
      if (token === generation) holder.set("active", "StageLinQ discovery running");
    } catch (error) {
      if (token === generation) holder.set("error", describeError(error));
    }
  };

  return {
    id: "stagelinq",
    label: "Denon / Engine (StageLinQ)",
    source: "stagelinq",
    async start(sink) {
      generation += 1;
      holder.bind(sink);
      holder.set("starting");
      void connect(sink, generation);
    },
    async stop() {
      generation += 1;
      const current = instance;
      const attached = handler;
      instance = null;
      handler = null;
      if (current !== null) {
        try {
          if (attached) for (const event of playerEvents) current.devices.off?.(event, attached);
          await current.disconnect();
        } catch {
          holder.set("stopped");
        }
      }
      holder.bind(null);
      holder.set("stopped");
    },
    status: () => holder.get(),
  };
}
