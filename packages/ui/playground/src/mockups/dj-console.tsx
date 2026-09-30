import {
  Activity,
  Check,
  Cable,
  Command,
  Gauge,
  GripVertical,
  Play,
  Radio,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  Kbd,
  Logo,
  NowPlayingHero,
  QueueItem,
  Shortcut,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TrackRow,
  cx,
} from "../../../src";
import { buildRequest, dedicationNames, nowPlayingStartedOffset, nowPlayingTrack, tracks } from "../data";
import { usePlayground } from "../context";
import { Frame } from "./kit";

function Panel({
  title,
  count,
  action,
  children,
  className,
}: {
  title: string;
  count?: string | number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx("flex min-h-0 flex-col overflow-hidden rounded-xl bg-surface-1 hairline", className)}
    >
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <h2 className="type-eyebrow text-fg">{title}</h2>
        {count !== undefined ? (
          <span className="type-mono rounded-pill bg-surface-3 px-2 py-0.5 text-[11px] text-fg-muted">{count}</span>
        ) : null}
        <span className="ml-auto flex items-center gap-2">{action}</span>
      </header>
      {children}
    </section>
  );
}

function StatusDot({ tone }: { tone: "ok" | "warn" }) {
  return <span className={cx("size-2 rounded-full", tone === "ok" ? "bg-playing" : "bg-next")} />;
}

export function DjConsole() {
  const { lang, s } = usePlayground();
  const names = dedicationNames(lang);
  const track = nowPlayingTrack;

  const incoming = [
    buildRequest(1, "pending", { votes: 4, tableLabel: s.tableLabel(7), dedicatedTo: names[0] ?? null, note: s.note2 }),
    buildRequest(3, "pending", { votes: 1, tableLabel: s.tableLabel(3), note: s.note1 }),
    buildRequest(5, "pending", { votes: 2, tableLabel: s.tableLabel(12) }),
    buildRequest(7, "pending", { votes: 1, tableLabel: s.tableLabel(5), dedicatedTo: names[2] ?? null }),
  ];
  const agos = [1, 2, 4, 7];
  const queue = [
    buildRequest(6, "accepted", { votes: 3, tableLabel: s.tableLabel(2) }),
    buildRequest(2, "accepted", { votes: 1, tableLabel: s.tableLabel(9), dedicatedTo: names[1] ?? null }),
    buildRequest(9, "accepted", { votes: 2, tableLabel: s.tableLabel(4) }),
    buildRequest(4, "accepted", { votes: 1, tableLabel: s.tableLabel(7) }),
    buildRequest(8, "accepted", { votes: 1, tableLabel: s.tableLabel(1) }),
    buildRequest(0, "accepted", { votes: 1, tableLabel: s.tableLabel(6) }),
    buildRequest(3, "accepted", { votes: 2, tableLabel: s.tableLabel(11) }),
  ];

  return (
    <Frame width={1440} height={900} label="dj-console">
      <div className="flex h-full flex-col bg-canvas">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface-1 px-4">
          <Logo variant="horizontal" height={24} />
          <span className="h-5 w-px bg-line-strong" />
          <div className="flex items-center gap-2 text-[13px] font-bold">
            {s.venueName}
            <Badge tone="playing" dot size="sm">
              {s.djSession}
            </Badge>
            <span className="type-mono text-[12px] text-fg-muted">02:14:36</span>
          </div>
          <div className="ml-auto flex items-center gap-5">
            <div className="flex items-center gap-2.5 rounded-pill bg-surface-2 py-1 pl-3.5 pr-1.5 hairline">
              <span className="text-[12.5px] font-bold text-fg">{s.djRequestsOpen}</span>
              <Switch defaultChecked size="md" aria-label={s.djRequestsOpen} />
            </div>
            <button
              type="button"
              className="focus-ring inline-flex h-9 items-center gap-2.5 rounded-md bg-surface-2 pl-3 pr-2 text-[13px] font-semibold text-fg-muted hairline hover:bg-surface-3"
            >
              <Command aria-hidden="true" className="size-4" />
              {s.djSearchAction}
              <Shortcut keys={["mod", "k"]} />
            </button>
            <Avatar name="DJ Rustam" size={34} status="online" />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[372px_minmax(0,1fr)_392px] gap-3 p-3">
          <Panel
            title={s.djIncoming}
            count={incoming.length}
            action={
              <Tabs defaultValue="new" variant="segmented">
                <TabsList className="!p-0.5">
                  <TabsTrigger value="new" className="!h-7 !px-3 !text-[12px]">
                    {s.djNew}
                  </TabsTrigger>
                  <TabsTrigger value="all" className="!h-7 !px-3 !text-[12px]">
                    {s.djAll}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            }
          >
            <div role="list" className="scrollbar-none flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3">
              {incoming.map((request, index) => (
                <QueueItem
                  key={`${request.title}-${index}`}
                  request={request}
                  variant="incoming"
                  highlighted={index === 0}
                  ago={s.ago(agos[index] ?? 1)}
                  votesLabel={s.votes}
                  dedicationText={request.dedicatedTo ? `${s.dedicationFor(request.dedicatedTo)}` : undefined}
                  actions={
                    <>
                      <Button size="sm" leftIcon={<Check aria-hidden="true" className="size-4" />} className="flex-1">
                        {s.djAccept}
                      </Button>
                      <Button size="sm" variant="secondary">
                        {s.djLater}
                      </Button>
                      <IconButton
                        label={s.djDecline}
                        icon={<X aria-hidden="true" className="size-4" />}
                        variant="danger"
                        size="sm"
                      />
                    </>
                  }
                />
              ))}
            </div>
            <footer className="flex items-center gap-3 border-t border-line px-4 py-2.5 text-[11.5px] font-semibold text-fg-subtle">
              <span className="inline-flex items-center gap-1.5">
                <Kbd>A</Kbd>
                {s.djAccept}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>D</Kbd>
                {s.djDecline}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd>L</Kbd>
                {s.djLater}
              </span>
            </footer>
          </Panel>

          <Panel
            title={s.djQueue}
            count={s.djTracks(queue.length)}
            action={
              <span className="type-mono inline-flex items-center gap-1.5 text-[12px] text-fg-muted">
                <Timer aria-hidden="true" className="size-3.5" />
                31:24
              </span>
            }
          >
            <div role="list" className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
              {queue.map((request, index) => (
                <QueueItem
                  key={`${request.title}-${index}`}
                  request={request}
                  variant="dj"
                  position={index + 1}
                  highlighted={index === 0}
                  votesLabel={s.votes}
                  dedicationText={request.dedicatedTo ? s.dedicationFor(request.dedicatedTo) : undefined}
                  handle={<GripVertical aria-label={s.djReorder} className="size-4 cursor-grab" />}
                  actions={
                    <>
                      <IconButton
                        label={s.djPlayNow}
                        icon={<Play aria-hidden="true" className="size-4" />}
                        size="sm"
                      />
                      <IconButton
                        label={s.djRemove}
                        icon={<Trash2 aria-hidden="true" className="size-4" />}
                        size="sm"
                      />
                    </>
                  }
                />
              ))}
            </div>
          </Panel>

          <div className="flex min-h-0 flex-col gap-3">
            <Panel title={s.djNow} className="shrink-0">
              <div className="p-5 pb-4">
                <NowPlayingHero
                  title={track.title}
                  artist={track.artist}
                  seed={`${track.artist} ${track.title}`}
                  progress={nowPlayingStartedOffset / track.durationSec}
                  elapsedSec={nowPlayingStartedOffset}
                  durationSec={track.durationSec}
                  bpm={track.bpm}
                  musicalKey={track.key}
                  nowPlayingLabel={s.nowPlaying}
                  progressLabel={s.progress}
                  size="desk"
                  tilt={false}
                />
              </div>
            </Panel>
            <Panel title={s.djRecentlyPlayed} className="flex-1">
              <div role="list" className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-2">
                {[tracks[8], tracks[5], tracks[7]].map((item) =>
                  item ? (
                    <TrackRow
                      key={item.id}
                      title={item.title}
                      artist={item.artist}
                      durationSec={item.durationSec}
                      size="sm"
                    />
                  ) : null,
                )}
              </div>
            </Panel>
          </div>
        </div>

        <footer className="flex h-8 shrink-0 items-center gap-5 border-t border-line bg-surface-1 px-4 text-[11.5px] font-semibold text-fg-muted">
          <span className="inline-flex items-center gap-2">
            <StatusDot tone="ok" />
            <Cable aria-hidden="true" className="size-3.5" />
            {s.hwLink}
          </span>
          <span className="inline-flex items-center gap-2">
            <StatusDot tone="ok" />
            <Radio aria-hidden="true" className="size-3.5" />
            {s.hwSync}
          </span>
          <span className="inline-flex items-center gap-2">
            <StatusDot tone="warn" />
            <Gauge aria-hidden="true" className="size-3.5" />
            {s.hwLatency}
            <span className="type-mono text-fg">18 ms</span>
          </span>
          <span className="ml-auto inline-flex items-center gap-2">
            <Zap aria-hidden="true" className="size-3.5 text-playing-fg" />
            {s.hwRealtime}
          </span>
          <span className="inline-flex items-center gap-2">
            <Activity aria-hidden="true" className="size-3.5" />
            {s.hwCatalog}
          </span>
          <span className="type-mono text-fg-subtle">v0.1.0</span>
        </footer>
      </div>
    </Frame>
  );
}
