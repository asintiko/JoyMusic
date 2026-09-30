import { Activity, Cable, Gauge, Piano, Zap } from "lucide-react";
import type { AdapterState } from "@joymusic/dj-bridge";
import { cx } from "@joymusic/ui";
import type { RealtimeConnectionStatus } from "../../../common/bridge";
import { useMidi } from "../../state/midi";
import { useT } from "../../i18n";
import { useTopic } from "../../lib/topics";

const dotTone: Record<AdapterState, string> = {
  active: "bg-playing",
  waiting: "bg-next",
  starting: "bg-next",
  unavailable: "bg-fg-disabled",
  error: "bg-danger",
  stopped: "bg-fg-disabled",
};

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={cx("size-2 rounded-full", className)} />;
}

export function StatusBar({
  realtime,
  version,
}: {
  realtime: RealtimeConnectionStatus;
  version: string;
}) {
  const t = useT();
  const adapters = useTopic("adapters");
  const net = useTopic("net");
  const outbox = useTopic("outbox");
  const midi = useMidi();
  const enabled = adapters.adapters.filter((adapter) => adapter.enabled);
  const connectedInputs = midi.devices.filter(
    (device) => device.direction === "input" && device.connected,
  ).length;
  const latencyTone =
    net.latencyMs === null ? "bg-fg-disabled" : net.latencyMs > 250 ? "bg-next" : "bg-playing";

  return (
    <footer
      data-testid="status-bar"
      className="flex h-8 shrink-0 items-center gap-5 overflow-hidden whitespace-nowrap border-t border-line bg-surface-1 px-4 text-[11.5px] font-semibold text-fg-muted"
    >
      {enabled.length === 0 ? (
        <span className="inline-flex items-center gap-2" data-testid="no-adapters">
          <Dot className="bg-fg-disabled" />
          <Cable aria-hidden="true" className="size-3.5" />
          {t.noAdapters}
        </span>
      ) : (
        enabled.map((adapter) => (
          <span
            key={adapter.id}
            data-testid={`adapter-chip-${adapter.id}`}
            data-state={adapter.status.state}
            title={adapter.status.detail ?? undefined}
            className="inline-flex items-center gap-2"
          >
            <Dot className={dotTone[adapter.status.state]} />
            <Cable aria-hidden="true" className="size-3.5" />
            {adapter.label}
            <span className="text-fg-subtle">{t.adapterStates[adapter.status.state]}</span>
          </span>
        ))
      )}
      {midi.status === "ready" ? (
        <span className="inline-flex items-center gap-2" data-testid="midi-chip">
          <Dot className={connectedInputs > 0 ? "bg-playing" : "bg-fg-disabled"} />
          <Piano aria-hidden="true" className="size-3.5" />
          {t.midi}
          <span className="text-fg-subtle">{t.midiDevices(connectedInputs)}</span>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-2" data-testid="latency-chip">
        <Dot className={latencyTone} />
        <Gauge aria-hidden="true" className="size-3.5" />
        {t.latency}
        <span className="type-mono text-fg">
          {net.latencyMs === null ? "-" : `${net.latencyMs} ms`}
        </span>
      </span>
      <span
        className="ml-auto inline-flex items-center gap-2"
        data-testid="realtime-chip"
        data-state={realtime}
      >
        <Zap
          aria-hidden="true"
          className={cx("size-3.5", realtime === "open" ? "text-playing-fg" : "text-next-fg")}
        />
        {t.realtimeStates[realtime]}
      </span>
      {outbox.pending > 0 ? (
        <span className="inline-flex items-center gap-2 text-next-fg" data-testid="outbox-chip">
          <Activity aria-hidden="true" className="size-3.5" />
          {t.outboxPending(outbox.pending)}
        </span>
      ) : null}
      <span className="type-mono text-fg-subtle">v{version}</span>
    </footer>
  );
}
