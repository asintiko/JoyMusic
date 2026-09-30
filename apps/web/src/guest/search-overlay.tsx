"use client";

import { ArrowLeft, Clock, History, PenLine, Sparkles, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  suggestionTitles,
  type ApiClient,
  type RequestItem,
  type RequestStatus,
  type SuggestionSection,
  type Track,
  type VenueState,
} from "@joymusic/shared";
import {
  AmbientBackground,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  SearchInput,
  Skeleton,
} from "@joymusic/ui";
import { useI18n } from "@/components/i18n";
import { haptic } from "@/lib/haptics";
import { browserStorage } from "@/lib/storage";
import { transliterate } from "@/lib/translit";
import { clearRecent, loadRecent, pushRecent } from "./recent-searches";
import { cachedSuggestions, loadSuggestions } from "./suggestions-cache";
import { TrackResult } from "./track-result";
import { usePreviewPlayer } from "./use-preview-player";
import { useTrackSearch } from "./use-track-search";

type SectionId = SuggestionSection["id"];

const sectionOrder: SectionId[] = [
  "uz_hits",
  "trending_here",
  "dj_picks",
  "ru_pop",
  "club",
  "slow",
  "birthday",
];

const chipIcons: Partial<Record<SectionId, ReactNode>> = {
  trending_here: <Sparkles aria-hidden="true" />,
  dj_picks: <User aria-hidden="true" />,
};

export interface SearchOverlayProps {
  slug: string;
  api: ApiClient;
  venue: VenueState;
  mine: Record<string, RequestItem>;
  allowFreeText: boolean;
  requestsOpen: boolean;
  onClose: () => void;
  onRequest: (track: Track) => void;
  onRequestText: (prefill: { artist: string; title: string }) => void;
}

function splitArtistTitle(query: string): { artist: string; title: string } {
  const parts = query.split(/\s+[-–—]\s+/);
  if (parts.length >= 2)
    return { artist: parts[0]?.trim() ?? "", title: parts.slice(1).join(" - ").trim() };
  return { artist: "", title: query.trim() };
}

function trackKey(artist: string, title: string): string {
  return `${artist} ${title}`.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

export function SearchOverlay({
  slug,
  api,
  venue,
  mine,
  allowFreeText,
  requestsOpen,
  onClose,
  onRequest,
  onRequestText,
}: SearchOverlayProps) {
  const { t, locale } = useI18n();
  const storage = useMemo(() => browserStorage(), []);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(() => loadRecent(storage));
  const [sections, setSections] = useState<SuggestionSection[] | null>(() =>
    cachedSuggestions(slug),
  );
  const [selected, setSelected] = useState<SectionId | null>(null);
  const search = useTrackSearch();
  const preview = usePreviewPlayer();
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (cachedSuggestions(slug)) return undefined;
    let cancelled = false;
    loadSuggestions(api, slug)
      .then((loaded) => {
        if (!cancelled) setSections(loaded);
      })
      .catch(() => {
        if (!cancelled) setSections((previous) => previous ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [api, slug]);

  const trimmed = query.trim();
  const searching = trimmed.length >= 2;

  const updateQuery = useCallback(
    (value: string) => {
      setQuery(value);
      search.search(value);
      if (scroller.current) scroller.current.scrollTop = 0;
    },
    [search],
  );

  const remember = useCallback((value: string) => setRecent(pushRecent(storage, value)), [storage]);

  const available = useMemo(() => {
    const byId = new Map((sections ?? []).map((section) => [section.id, section] as const));
    return sectionOrder
      .map((id) => byId.get(id))
      .filter((section): section is SuggestionSection =>
        Boolean(section && section.tracks.length > 0),
      );
  }, [sections]);

  const activeSection =
    available.find((section) => section.id === selected) ?? available[0] ?? null;

  const requestedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of Object.values(mine)) {
      if (item.status !== "pending" && item.status !== "accepted" && item.status !== "playing")
        continue;
      if (item.track) keys.add(`id:${item.track.id}`);
      keys.add(trackKey(item.artist, item.title));
    }
    return keys;
  }, [mine]);

  const statusByKey = useMemo(() => {
    const map = new Map<string, RequestStatus>();
    const add = (item: RequestItem, status: RequestStatus) => {
      if (item.track) map.set(`id:${item.track.id}`, status);
      map.set(trackKey(item.artist, item.title), status);
    };
    for (const item of venue.pending) add(item, "pending");
    for (const item of venue.queue) add(item, "accepted");
    const playing = venue.nowPlaying;
    if (playing) {
      if (playing.track) map.set(`id:${playing.track.id}`, "playing");
      map.set(trackKey(playing.artist, playing.title), "playing");
    }
    return map;
  }, [venue]);

  const isRequested = (track: Track) =>
    requestedKeys.has(`id:${track.id}`) || requestedKeys.has(trackKey(track.artist, track.title));
  const queueStatus = (track: Track): RequestStatus | null =>
    statusByKey.get(`id:${track.id}`) ??
    statusByKey.get(trackKey(track.artist, track.title)) ??
    null;

  const handleRequest = (track: Track) => {
    haptic("tap");
    remember(query);
    preview.stop();
    onRequest(track);
  };

  const handlePreview = (track: Track) => {
    if (!track.previewUrl) return;
    haptic("tap");
    preview.toggle(track.id, track.previewUrl);
  };

  const close = () => {
    if (searching && search.state.status === "ready" && search.state.tracks.length > 0)
      remember(query);
    preview.stop();
    onClose();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("[role=dialog][data-state=open]")) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const alternate = searching && search.state.status === "ready" ? transliterate(trimmed) : null;
  const textPrefill = splitArtistTitle(trimmed);
  const canRequestText = allowFreeText && requestsOpen;

  const renderTracks = (tracks: Track[]) => (
    <div role="list" className="flex flex-col">
      {tracks.map((track) => (
        <TrackResult
          key={track.id}
          track={track}
          preview={preview.state}
          requested={isRequested(track)}
          queueStatus={queueStatus(track)}
          disabled={!requestsOpen}
          onRequest={handleRequest}
          onPreview={handlePreview}
        />
      ))}
    </div>
  );

  const freeTextCard = canRequestText ? (
    <div className="px-2 pt-3">
      <Card variant="glass" padding="md" className="flex items-center gap-3 !rounded-xl">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <PenLine aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-fg">{t.cantFind}</p>
          <p className="type-body-sm text-fg-muted">{t.cantFindHint}</p>
        </div>
      </Card>
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        className="mt-2.5"
        data-testid="request-by-text"
        onClick={() => {
          remember(query);
          onRequestText(searching ? textPrefill : { artist: "", title: "" });
        }}
      >
        {t.requestByText}
      </Button>
    </div>
  ) : null;

  let body: ReactNode;
  if (searching) {
    const state = search.state;
    if (state.status === "error") {
      body = (
        <EmptyState
          illustration="error"
          title={t.searchFailedTitle}
          description={t.searchFailedText}
          action={
            <Button variant="secondary" onClick={search.retry}>
              {t.retry}
            </Button>
          }
        />
      );
    } else if (state.status === "loading" && state.tracks.length === 0) {
      body = (
        <div className="flex flex-col gap-3 px-2 pt-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton width={56} height={56} className="!rounded-sm" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton shape="text" width="62%" height={14} />
                <Skeleton shape="text" width="38%" height={12} />
              </div>
              <Skeleton shape="circle" width={44} height={44} />
            </div>
          ))}
        </div>
      );
    } else if (state.status === "ready" && state.tracks.length === 0) {
      body = (
        <>
          <EmptyState
            illustration="search"
            title={t.noResultsTitle}
            description={t.noResultsText(trimmed)}
          />
          {freeTextCard}
        </>
      );
    } else {
      body = (
        <div
          className={
            state.status === "loading" ? "opacity-55 transition-opacity" : "transition-opacity"
          }
        >
          {renderTracks(state.tracks)}
          {freeTextCard}
        </div>
      );
    }
  } else {
    body = (
      <>
        {recent.length > 0 ? (
          <section className="px-2 pb-3" aria-label={t.recent}>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <h3 className="type-eyebrow text-fg-subtle">{t.recent}</h3>
              <button
                type="button"
                onClick={() => setRecent(clearRecent(storage))}
                className="focus-ring rounded-pill px-2 py-1 text-[12px] font-bold text-fg-muted hover:text-fg"
              >
                {t.clearRecent}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 px-1">
              {recent.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  data-testid="recent-search"
                  onClick={() => updateQuery(entry)}
                  className="focus-ring inline-flex h-10 max-w-full items-center gap-2 rounded-pill bg-surface-2 px-3.5 text-[14px] font-semibold text-fg-muted shadow-[inset_0_0_0_1px_var(--jm-line)] transition-colors hover:bg-surface-3 hover:text-fg"
                >
                  <History aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{entry}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {sections === null ? (
          <div
            className="flex flex-col gap-3 px-2 pt-2"
            aria-busy="true"
            aria-label={t.suggestionsLoading}
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton width={56} height={56} className="!rounded-sm" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton shape="text" width="55%" height={14} />
                  <Skeleton shape="text" width="35%" height={12} />
                </div>
              </div>
            ))}
          </div>
        ) : activeSection ? (
          <section aria-label={suggestionTitles[locale][activeSection.id]}>
            <h3 className="type-eyebrow px-4 pb-1 pt-1 text-fg-subtle">
              {suggestionTitles[locale][activeSection.id]}
            </h3>
            {renderTracks(activeSection.tracks)}
          </section>
        ) : (
          <EmptyState illustration="search" size="sm" title={t.searchPlaceholder} />
        )}
        {freeTextCard}
      </>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.searchLabel}
      data-testid="search-overlay"
      className="search-overlay pt-safe"
    >
      <AmbientBackground seed={`search ${slug}`} intensity={0.5} />
      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col">
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              aria-label={t.back}
              data-testid="search-close"
              className="focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
            >
              <ArrowLeft aria-hidden="true" className="size-6" />
            </button>
            <SearchInput
              value={query}
              onValueChange={updateQuery}
              onSearch={remember}
              placeholder={t.searchPlaceholder}
              clearLabel={t.clearSearch}
              loading={search.state.status === "loading"}
              size="lg"
              autoFocus
              aria-label={t.searchPlaceholder}
              enterKeyHint="search"
              wrapperClassName="flex-1"
            />
          </div>
          {!searching && available.length > 0 ? (
            <ChipRow className="mt-3" aria-label={t.searchLabel}>
              {available.map((section) => (
                <Chip
                  key={section.id}
                  selected={activeSection?.id === section.id}
                  tone="brand"
                  icon={chipIcons[section.id]}
                  onClick={() => {
                    haptic("tap");
                    setSelected(section.id);
                  }}
                >
                  {suggestionTitles[locale][section.id]}
                </Chip>
              ))}
            </ChipRow>
          ) : null}
          {searching && search.state.status === "ready" && search.state.tracks.length > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-3 px-2">
              <h2 className="type-eyebrow text-fg-subtle" data-testid="search-count">
                {t.found(search.state.tracks.length)}
              </h2>
              {alternate ? (
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-pill bg-surface-2 px-2.5 py-1 text-[11.5px] font-bold text-fg-muted">
                  <Clock aria-hidden="true" className="size-3 shrink-0" />
                  <span className="truncate">
                    {t.alsoSearched}: {trimmed} ↔ {alternate}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div
          ref={scroller}
          className="scrollbar-none mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[calc(var(--jm-safe-bottom)+24px)]"
        >
          {body}
        </div>
      </div>
    </div>
  );
}
