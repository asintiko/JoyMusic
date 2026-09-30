"use client";

import dynamic from "next/dynamic";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MapPin, Users } from "lucide-react";
import type { Locale, RequestItem, Track, VenueState } from "@joymusic/shared";
import { AmbientBackground, EmptyState, Logo, Skeleton, cx } from "@joymusic/ui";
import { I18nProvider, useI18n } from "@/components/i18n";
import { LangSwitch } from "@/components/lang-switch";
import { Toaster, useToast } from "@/components/toaster";
import { artworkSrc } from "@/lib/art";
import { haptic } from "@/lib/haptics";
import { useStableCallback } from "@/lib/stable";
import { browserStorage } from "@/lib/storage";
import { createGuestApi, createLazyApi } from "./api";
import { InstallHint, OfflineBanner } from "./banners";
import { Dock } from "./dock";
import { activeMineCount } from "./live-state";
import { failureCopy, mapRequestError } from "./request-errors";
import type { RequestOutcome, RequestPayload, RequestTarget } from "./request-sheet";
import { createGuestSessionStore, type GuestSessionStore } from "./session-store";
import { loadSuggestions } from "./suggestions-cache";
import { useMineNotifications } from "./use-mine-notifications";
import { useVenueFeed } from "./use-venue-feed";

const loadSearchOverlay = () => import("./search-overlay").then((module) => module.SearchOverlay);

const SearchOverlay = dynamic(loadSearchOverlay, { ssr: false });
const RequestSheet = dynamic(
  () => import("./request-sheet").then((module) => module.RequestSheet),
  {
    ssr: false,
  },
);
const MyRequestsSheet = dynamic(
  () => import("./my-requests-sheet").then((module) => module.MyRequestsSheet),
  { ssr: false },
);

const NowPlayingSection = dynamic(() =>
  import("./now-playing-section").then((module) => module.NowPlayingSection),
);
const UpNext = dynamic(() => import("./up-next").then((module) => module.UpNext));

const startDelayMs = 700;

export interface GuestAppProps {
  slug: string;
  initial: VenueState | null;
  initialLocale: Locale;
}

export function GuestApp({ slug, initial, initialLocale }: GuestAppProps) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <GuestToaster>
        <GuestScreen slug={slug} initial={initial} />
      </GuestToaster>
    </I18nProvider>
  );
}

function GuestToaster({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return <Toaster dismissLabel={t.close}>{children}</Toaster>;
}

function useOverlayHistory(open: boolean, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (!open) return undefined;
    window.history.pushState({ ...(window.history.state ?? {}), jmOverlay: true }, "");
    const onPop = () => setOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, setOpen]);

  return useCallback(() => {
    const state = window.history.state as { jmOverlay?: boolean } | null;
    if (state?.jmOverlay) window.history.back();
    else setOpen(false);
  }, [setOpen]);
}

function useGuestStore(slug: string): GuestSessionStore {
  const { locale } = useI18n();
  const localeRef = useRef(locale);
  useEffect(() => {
    localeRef.current = locale;
  });
  return useMemo(() => {
    const created = createGuestSessionStore({
      slug,
      api: createLazyApi(),
      storage: browserStorage(),
      locale: () => localeRef.current,
    });
    if (typeof window !== "undefined") {
      const scanned = new URLSearchParams(window.location.search).get("t");
      if (scanned) created.setTableToken(scanned);
    }
    return created;
  }, [slug]);
}

const TableLabel = memo(function TableLabel({ store }: { store: GuestSessionStore }) {
  const label = useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => store.current()?.tableLabel ?? null,
    () => null,
  );
  if (!label) return null;
  return (
    <span
      data-testid="table-label"
      className="inline-flex items-center gap-1 rounded-pill bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-fg"
    >
      <Users aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
});

const Header = memo(function Header({
  name,
  city,
  store,
}: {
  name: string | null;
  city: string | null;
  store: GuestSessionStore;
}) {
  const { t } = useI18n();
  return (
    <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <Logo variant="mark" height={30} decorative />
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-[15px] font-extrabold tracking-[-0.01em]">
            {name ?? t.venueLoading}
          </h1>
          <p className="flex items-center gap-1.5 truncate text-[12px] font-medium text-fg-muted">
            {city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3" />
                {city}
              </span>
            ) : null}
            <TableLabel store={store} />
          </p>
        </div>
      </div>
      <LangSwitch />
    </header>
  );
});

function GuestScreen({ slug, initial }: { slug: string; initial: VenueState | null }) {
  const { t } = useI18n();
  const toast = useToast();
  const store = useGuestStore(slug);
  const api = useMemo(() => createGuestApi(store), [store]);
  const feed = useVenueFeed({ slug, role: "guest", initial, api, store, startDelayMs });

  const [searchOpen, setSearchOpen] = useState(false);
  const [mineOpen, setMineOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [target, setTarget] = useState<RequestTarget | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [sheetsLoaded, setSheetsLoaded] = useState({ request: false, mine: false });
  const [ambientReady, setAmbientReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const timer = window.setTimeout(() => {
      void store
        .ensure()
        .catch(() => undefined)
        .then(() => {
          if (!url.searchParams.has("t")) return;
          url.searchParams.delete("t");
          window.history.replaceState(window.history.state, "", url);
        });
    }, startDelayMs);
    return () => window.clearTimeout(timer);
  }, [store]);

  useEffect(() => {
    const ambient = window.setTimeout(() => setAmbientReady(true), 1600);
    const prefetch = window.setTimeout(() => {
      void loadSearchOverlay();
      void loadSuggestions(api, slug).catch(() => undefined);
    }, 2600);
    return () => {
      window.clearTimeout(ambient);
      window.clearTimeout(prefetch);
    };
  }, [api, slug]);

  const closeSearch = useOverlayHistory(searchOpen, setSearchOpen);

  const venue = feed.venue;
  const settings = venue?.venue.settings ?? null;
  const nowPlaying = venue?.nowPlaying ?? null;
  const hasSession = Boolean(venue?.session);
  const requestsOpen = Boolean(settings?.requestsOpen);
  const canRequest = hasSession && requestsOpen;

  const artwork = useMemo(() => {
    if (!nowPlaying || !settings?.showArtwork) return null;
    return artworkSrc(nowPlaying.artworkUrl ?? nowPlaying.track?.artworkUrl ?? null, 500);
  }, [nowPlaying, settings?.showArtwork]);

  const openMine = useCallback(() => {
    setSheetsLoaded((previous) => (previous.mine ? previous : { ...previous, mine: true }));
    setMineOpen(true);
  }, []);
  useMineNotifications(feed.mine, openMine);

  const openRequest = useCallback((next: RequestTarget) => {
    setSheetsLoaded((previous) => (previous.request ? previous : { ...previous, request: true }));
    setTarget(next);
    setRequestOpen(true);
  }, []);

  const openTrackRequest = useCallback(
    (track: Track) => openRequest({ mode: "track", track }),
    [openRequest],
  );

  const openTextRequest = useCallback(
    (prefill?: { artist: string; title: string }) =>
      openRequest({ mode: "text", artist: prefill?.artist ?? "", title: prefill?.title ?? "" }),
    [openRequest],
  );

  const submitRequest = useStableCallback(
    async (payload: RequestPayload): Promise<RequestOutcome> => {
      const result = await api.call("requestCreate", {
        params: { slug },
        body: {
          track: payload.track,
          freeText: payload.freeText,
          note: payload.note,
          dedicatedTo: payload.dedicatedTo,
          tableToken: store.tableToken() ?? undefined,
        },
      });
      feed.trackMine(result.request);
      return result;
    },
  );

  const onRequestSuccess = useStableCallback((outcome: RequestOutcome) => {
    setRequestOpen(false);
    setEngaged(true);
    toast.toast({
      title: outcome.merged ? t.voteAddedTitle : t.requestSentTitle,
      description: outcome.merged ? t.voteAddedText : t.requestSentText,
      tone: "success",
      action: { label: t.viewMine, onClick: openMine },
    });
  });

  const vote = useStableCallback(async (request: RequestItem) => {
    setVotingId(request.id);
    try {
      const updated = await api.call("requestVote", { params: { id: request.id } });
      feed.trackMine(updated);
      haptic("success");
      setEngaged(true);
      toast.toast({ title: t.voteAddedTitle, description: request.title, tone: "success" });
    } catch (error) {
      haptic("warning");
      const copy = failureCopy(mapRequestError(error), t);
      toast.toast({ title: copy.title, description: copy.text, tone: "danger", duration: 6000 });
    } finally {
      setVotingId(null);
    }
  });

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const preloadSearch = useCallback(() => void loadSearchOverlay(), []);
  const openText = useCallback(() => openTextRequest(), [openTextRequest]);

  const queueOrder = useMemo(() => (venue?.queue ?? []).map((item) => item.id), [venue?.queue]);
  const dockMode = !venue || !hasSession ? "waiting" : requestsOpen ? "open" : "closed";
  const activeCount = useMemo(() => activeMineCount(feed.mine), [feed.mine]);

  return (
    <>
      <div className="guest-shell relative isolate" inert={searchOpen}>
        <AmbientBackground
          fixed
          src={ambientReady ? artwork : null}
          seed={nowPlaying ? `${nowPlaying.artist} ${nowPlaying.title}` : `venue ${slug}`}
          intensity={nowPlaying ? 1 : 0.7}
          grain={false}
        />
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[520px] flex-col pt-safe md:max-w-[860px]">
          <Header name={venue?.venue.name ?? null} city={venue?.venue.city ?? null} store={store} />

          <main className="flex flex-1 flex-col px-4 pb-[calc(var(--jm-safe-bottom)+150px)] pt-4 md:grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:content-center md:items-center md:gap-8 md:px-8 md:pt-8">
            <section
              className={cx(
                "px-2 md:px-0",
                venue && !hasSession && "flex flex-1 items-center justify-center",
              )}
              aria-live="polite"
            >
              {!venue ? (
                <LoadingHero failed={feed.failed} onRetry={() => void feed.refresh()} />
              ) : !hasSession ? (
                <EmptyState
                  illustration="queue"
                  size="lg"
                  title={t.waitingDjTitle}
                  description={t.waitingDjText}
                  className="jm-rise"
                />
              ) : nowPlaying ? (
                <NowPlayingSection
                  nowPlaying={nowPlaying}
                  artwork={artwork}
                  offset={feed.offset}
                  mine={Boolean(nowPlaying.requestId && feed.mine[nowPlaying.requestId])}
                />
              ) : (
                <EmptyState
                  illustration="queue"
                  size="md"
                  title={t.idleTitle}
                  description={t.idleText}
                  className="jm-rise"
                />
              )}
            </section>
            {venue && hasSession ? (
              <UpNext
                queue={venue.queue}
                pending={venue.pending}
                canVote={canRequest}
                onVote={vote}
                votingId={votingId}
                className="mt-6 md:mt-0"
              />
            ) : null}
          </main>
        </div>

        <Dock
          mode={dockMode}
          activeCount={activeCount}
          allowFreeText={Boolean(settings?.allowFreeText)}
          onSearch={openSearch}
          onSearchIntent={preloadSearch}
          onText={openText}
          onMine={openMine}
        />
        <InstallHint engaged={engaged} />
      </div>

      {searchOpen && venue ? (
        <SearchOverlay
          slug={slug}
          api={api}
          venue={venue}
          mine={feed.mine}
          allowFreeText={Boolean(settings?.allowFreeText)}
          requestsOpen={canRequest}
          onClose={closeSearch}
          onRequest={openTrackRequest}
          onRequestText={openTextRequest}
        />
      ) : null}

      {sheetsLoaded.request ? (
        <RequestSheet
          target={target}
          open={requestOpen}
          onOpenChange={setRequestOpen}
          allowNotes={Boolean(settings?.allowNotes)}
          submit={submitRequest}
          onSuccess={onRequestSuccess}
        />
      ) : null}
      {sheetsLoaded.mine ? (
        <MyRequestsSheet
          open={mineOpen}
          onOpenChange={setMineOpen}
          mine={feed.mine}
          queueOrder={queueOrder}
        />
      ) : null}
      <OfflineBanner status={feed.status} />
    </>
  );
}

function LoadingHero({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  if (failed) {
    return (
      <EmptyState
        illustration="offline"
        size="lg"
        title={t.networkTitle}
        description={t.networkText}
        action={
          <button
            type="button"
            onClick={onRetry}
            className="focus-ring h-11 rounded-pill bg-surface-3 px-5 text-[14px] font-bold hairline-strong"
          >
            {t.retry}
          </button>
        }
      />
    );
  }
  return (
    <div className="flex flex-col items-center gap-4" aria-busy="true">
      <Skeleton width={272} height={272} className="!rounded-cover" />
      <Skeleton shape="text" width={200} height={22} />
      <Skeleton shape="text" width={120} height={16} />
    </div>
  );
}
