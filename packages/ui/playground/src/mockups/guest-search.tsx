import { Check, Clock, History, ListMusic, Plus, Search as SearchIcon, User, PenLine, Sparkles } from "lucide-react";
import { suggestionSectionIds } from "@joymusic/shared";
import { suggestionTitles } from "@joymusic/shared";
import type { ReactNode } from "react";
import {
  AmbientBackground,
  Button,
  Card,
  Chip,
  ChipRow,
  IconButton,
  SearchInput,
  TrackRow,
  cx,
} from "../../../src";
import { tracks } from "../data";
import { usePlayground } from "../context";
import { Frame, HomeIndicator, PhoneStatusBar } from "./kit";

const chipIcons: Record<(typeof suggestionSectionIds)[number], ReactNode> = {
  trending_here: <Sparkles aria-hidden="true" />,
  dj_picks: <User aria-hidden="true" />,
  uz_hits: null,
  ru_pop: null,
  club: null,
  slow: null,
  birthday: null,
};

export function GuestSearch() {
  const { lang, s } = usePlayground();
  const query = lang === "ru" ? "Шахзода" : "Shahzoda";
  const results = [
    { track: tracks[0], state: "added" as const },
    { track: tracks[6], state: "idle" as const },
    { track: tracks[2], state: "idle" as const },
    { track: tracks[9], state: "idle" as const },
    { track: tracks[4], state: "idle" as const },
  ];
  const nav = [
    { id: "search", label: s.navSearch, icon: SearchIcon, active: true },
    { id: "queue", label: s.navQueue, icon: ListMusic, active: false },
    { id: "mine", label: s.navMine, icon: History, active: false },
  ];

  return (
    <Frame width={390} height={844} label="guest-search">
      <AmbientBackground seed="Shahzoda search" intensity={0.55} />
      <div className="relative z-10 flex h-full flex-col">
        <PhoneStatusBar />
        <div className="px-4 pt-3">
          <div className="flex items-center gap-3">
            <SearchInput
              value={query}
              onValueChange={() => undefined}
              placeholder={s.searchPlaceholder}
              clearLabel={s.clearSearch}
              size="lg"
              aria-label={s.searchPlaceholder}
              wrapperClassName="flex-1 shadow-[inset_0_0_0_1.5px_var(--jm-focus),var(--jm-glow-soft)]"
            />
          </div>
          <ChipRow className="mt-3" aria-label={s.recent}>
            {suggestionSectionIds.map((id, index) => (
              <Chip key={id} selected={index === 2} tone="brand" icon={chipIcons[id]} size="md">
                {suggestionTitles[lang][id]}
              </Chip>
            ))}
          </ChipRow>
        </div>

        <div className="mt-2 flex items-center justify-between px-6">
          <h2 className="type-eyebrow text-fg-subtle">
            {s.found} · {results.length}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-2 px-2.5 py-1 text-[11.5px] font-bold text-fg-muted">
            <Clock aria-hidden="true" className="size-3" />
            {s.transliterated}
          </span>
        </div>

        <div role="list" className="mt-1 flex flex-col px-2">
          {results.map(({ track, state }) =>
            track ? (
              <TrackRow
                key={track.id}
                title={track.title}
                artist={track.artist}
                album={track.album}
                durationSec={track.durationSec}
                explicit={track.explicit}
                explicitLabel={s.explicit}
                state={state}
                size="lg"
                trailing={
                  state === "added" ? (
                    <IconButton
                      label={s.requested}
                      icon={<Check aria-hidden="true" className="size-[18px]" />}
                      variant="secondary"
                      className="!bg-playing-soft !text-playing-fg"
                    />
                  ) : (
                    <IconButton
                      label={s.request}
                      icon={<Plus aria-hidden="true" className="size-[18px]" />}
                      variant="secondary"
                    />
                  )
                }
              />
            ) : null,
          )}
        </div>

        <div className="px-4 pt-3">
          <Card variant="glass" padding="md" className="flex items-center gap-3 !rounded-xl">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <PenLine aria-hidden="true" className="size-5" />
            </span>
            <p className="type-body-sm min-w-0 flex-1 text-fg-muted">{s.cantFind}</p>
          </Card>
          <Button variant="secondary" size="lg" fullWidth className="mt-2.5">
            {s.requestByText}
          </Button>
        </div>

        <nav
          aria-label="Guest"
          className="jm-glass absolute inset-x-0 bottom-0 z-20 flex items-start justify-around rounded-t-2xl px-4 pb-8 pt-2.5"
        >
          {nav.map((entry) => (
            <span
              key={entry.id}
              aria-current={entry.active || undefined}
              className={cx(
                "flex w-24 flex-col items-center gap-1 text-[11px] font-bold",
                entry.active ? "text-brand" : "text-fg-subtle",
              )}
            >
              <entry.icon aria-hidden="true" className="size-[22px]" />
              {entry.label}
            </span>
          ))}
        </nav>
        <HomeIndicator />
      </div>
    </Frame>
  );
}
