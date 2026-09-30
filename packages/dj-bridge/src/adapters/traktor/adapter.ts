import { systemClock, createStatusHolder } from "../../core/timers";
import type { Clock, NowPlayingAdapter, NowPlayingSink } from "../../core/types";
import { createIcecastReceiver } from "./receiver";
import type { IcecastReceiver, IcecastReceiverOptions } from "./receiver";

export interface TraktorAdapterOptions {
  id?: string;
  label?: string;
  host?: string;
  port?: number;
  password?: string | null;
  clearOnDisconnect?: boolean;
  clock?: Clock;
  createReceiver?: (options: IcecastReceiverOptions) => IcecastReceiver;
}

export function createTraktorAdapter(options: TraktorAdapterOptions = {}): NowPlayingAdapter {
  const clock = options.clock ?? systemClock;
  const holder = createStatusHolder(clock);
  const factory = options.createReceiver ?? createIcecastReceiver;
  const clearOnDisconnect = options.clearOnDisconnect ?? true;
  let receiver: IcecastReceiver | null = null;

  return {
    id: options.id ?? "traktor",
    label: options.label ?? "Traktor (Icecast)",
    source: "traktor",
    async start(sink: NowPlayingSink) {
      if (receiver !== null) return;
      holder.bind(sink);
      holder.set("starting");
      const created = factory({
        host: options.host,
        port: options.port,
        password: options.password,
        onMetadata: ({ song }) => {
          if (song === null) return;
          sink.track({ title: song.title, artist: song.artist, startedAt: clock.now() });
          holder.set("active", "metadata received");
        },
        onSource: ({ connected }) => {
          if (connected) {
            holder.set("active", "Traktor is broadcasting");
          } else {
            if (created.sourceCount() === 0) {
              if (clearOnDisconnect) sink.track(null);
              holder.set("waiting", "Traktor disconnected");
            }
          }
        },
      });
      receiver = created;
      try {
        const port = await created.start();
        holder.set("waiting", `Listening on ${options.host ?? "127.0.0.1"}:${port}`);
      } catch (error) {
        receiver = null;
        holder.set("error", error instanceof Error ? error.message : String(error));
      }
    },
    async stop() {
      const current = receiver;
      receiver = null;
      if (current !== null) await current.stop();
      holder.bind(null);
      holder.set("stopped");
    },
    status: () => holder.get(),
  };
}
