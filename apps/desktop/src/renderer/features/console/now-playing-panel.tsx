import { CheckCheck, Cpu, Hand } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Kbd,
  NowPlayingHero,
  TrackRow,
  useTrackProgress,
} from "@joymusic/ui";
import type { NowPlaying, RequestItem } from "@joymusic/shared";
import { useT } from "../../i18n";
import { Panel } from "./panel";
import type { ConsoleController } from "./use-console";

function sourceLabel(t: ReturnType<typeof useT>, nowPlaying: NowPlaying): string {
  if (nowPlaying.source === "manual") return t.sourceManual;
  if (nowPlaying.source === "request") return t.sourceRequest;
  return t.sourceDetected(t.sourceNames[nowPlaying.source]);
}

function NowPlayingCard({
  nowPlaying,
  offsetMs,
  onPlayed,
}: {
  nowPlaying: NowPlaying;
  offsetMs: number;
  onPlayed(): void;
}) {
  const t = useT();
  const progress = useTrackProgress({
    startedAt: nowPlaying.startedAt,
    durationSec: nowPlaying.durationSec,
    serverOffsetMs: offsetMs,
  });
  const auto = nowPlaying.source !== "manual" && nowPlaying.source !== "request";
  return (
    <div className="flex flex-col gap-3 p-5 pb-4" data-testid="now-playing">
      <NowPlayingHero
        title={nowPlaying.title}
        artist={nowPlaying.artist}
        artworkUrl={nowPlaying.artworkUrl}
        seed={`${nowPlaying.artist} ${nowPlaying.title}`}
        progress={progress.progress}
        elapsedSec={nowPlaying.durationSec ? progress.elapsedSec : null}
        durationSec={nowPlaying.durationSec}
        bpm={nowPlaying.bpm}
        musicalKey={nowPlaying.key}
        dedication={nowPlaying.dedicatedTo ? t.dedicationFor(nowPlaying.dedicatedTo) : null}
        nowPlayingLabel={t.nowPlaying}
        progressLabel={t.progress}
        size="desk"
        tilt={false}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={auto ? "info" : "neutral"}
          size="sm"
          icon={auto ? <Cpu aria-hidden="true" /> : <Hand aria-hidden="true" />}
        >
          {sourceLabel(t, nowPlaying)}
        </Badge>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto"
          data-action="mark-played"
          leftIcon={<CheckCheck aria-hidden="true" className="size-4" />}
          onClick={onPlayed}
        >
          {t.markPlayed}
          <Kbd>P</Kbd>
        </Button>
      </div>
    </div>
  );
}

export function NowPlayingPanel({ controller }: { controller: ConsoleController }) {
  const t = useT();
  const nowPlaying = controller.state?.nowPlaying ?? null;
  return (
    <section
      aria-label={t.nowPlaying}
      data-panel="now-playing"
      className="shrink-0 overflow-hidden rounded-xl bg-surface-1 hairline"
    >
      {nowPlaying ? (
        <NowPlayingCard
          nowPlaying={nowPlaying}
          offsetMs={controller.offsetMs}
          onPlayed={controller.played}
        />
      ) : (
        <div className="flex h-[404px] items-center justify-center p-5">
          <EmptyState
            size="sm"
            illustration="queue"
            title={t.nothingPlaying}
            description={t.nothingPlayingBody}
          />
        </div>
      )}
    </section>
  );
}

export function RecentPanel({ items }: { items: readonly RequestItem[] }) {
  const t = useT();
  return (
    <Panel id="recent" title={t.recentTitle} className="flex-1">
      {items.length === 0 ? (
        <p className="p-4 text-[13px] text-fg-subtle">{t.recentEmpty}</p>
      ) : (
        <div role="list" className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-2">
          {items.slice(0, 8).map((item) => (
            <TrackRow
              key={item.id}
              title={item.title}
              artist={item.artist}
              artworkUrl={item.artworkUrl}
              durationSec={item.track?.durationSec ?? null}
              size="sm"
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
