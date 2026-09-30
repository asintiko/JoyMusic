"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale, RequestItem, Track, VenueState } from "@joymusic/shared";
import { AmbientBackground, EmptyState, Logo, Skeleton, cx } from "@joymusic/ui";
import { MapPin, Users } from "lucide-react";
import { I18nProvider, useI18n } from "@/components/i18n";
import { LangSwitch } from "@/components/lang-switch";
import { Toaster, useToast } from "@/components/toaster";
import { artworkSrc } from "@/lib/art";
import { haptic } from "@/lib/haptics";
import { browserStorage } from "@/lib/storage";
import { createGuestApi, createLazyApi } from "./api";
import { InstallHint, OfflineBanner } from "./banners";
import { ArtworkGlow } from "./artwork-glow";
import { Dock } from "./dock";
import { activeMineCount } from "./live-state";
import { loadSuggestions } from "./suggestions-cache";
import { NowPlayingSection } from "./now-playing-section";
import { failureCopy, mapRequestError } from "./request-errors";
import type { RequestOutcome, RequestPayload, RequestTarget } from "./request-sheet";
import { createGuestSessionStore, type GuestSession } from "./session-store";
import { UpNext } from "./up-next";
import { useConnectivity, useVenueFeed } from "./use-venue-feed";
import { useMineNotifications } from "./use-mine-notifications";

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

function GuestScreen({ slug, initial }: { slug: string; initial: VenueState | null }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const store = useMemo(() => {
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
  const api = useMemo(() => createGuestApi(store), [store]);
  const feed = useVenueFeed({ slug, role: "guest", initial, api, store });

  const [session, setSession] = useState<GuestSession | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mineOpen, setMineOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [target, setTarget] = useState<RequestTarget | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [sheetsLoaded, setSheetsLoaded] = useState({ request: false, mine: false });
  const online = useConnectivity(feed.status);

  useEffect(() => {
    setSession(store.current());
    return store.subscribe(setSession);
  }, [store]);

  useEffect(() => {
    const url = new URL(window.location.href);
    void store
      .ensure()
      .catch(() => undefined)
      .then(() => {
        if (!url.searchParams.has("t")) return;
        url.searchParams.delete("t");
        window.history.replaceState(window.history.state, "", url);
      });
  }, [store]);

  useEffect(() => {
    const idle =
      window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1200));
    const handle = idle(() => {
      void loadSearchOverlay();
      void loadSuggestions(api, slug).catch(() => undefined);
    });
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
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

  const glowArtwork = useMemo(() => {
    if (!nowPlaying || !settings?.showArtwork) return null;
    return artworkSrc(nowPlaying.artworkUrl ?? nowPlaying.track?.artworkUrl ?? null, 120);
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

  const submitRequest = useCallback(
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
    [api, slug, store, feed],
  );

  const onRequestSuccess = useCallback(
    (outcome: RequestOutcome) => {
      setRequestOpen(false);
      setEngaged(true);
      toast.toast({
        title: outcome.merged ? t.voteAddedTitle : t.requestSentTitle,
        description: outcome.merged ? t.voteAddedText : t.requestSentText,
        tone: "success",
        action: { label: t.viewMine, onClick: openMine },
      });
    },
    [toast, t, openMine],
  );

  const vote = useCallback(
    async (request: RequestItem) => {
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
    },
    [api, feed, toast, t],
  );

  const queueOrder = useMemo(() => (venue?.queue ?? []).map((item) => item.id), [venue?.queue]);
  const dockMode = !venue || !hasSession ? "waiting" : requestsOpen ? "open" : "closed";
  const overlayActive = searchOpen;

  return (
    <>
      <div className="guest-shell relative isolate" inert={overlayActive}>
        <AmbientBackground
          fixed
          src={artwork}
          seed={nowPlaying ? `${nowPlaying.artist} ${nowPlaying.title}` : `venue ${slug}`}
          intensity={nowPlaying ? 1 : 0.7}
        />
        <ArtworkGlow src={glowArtwork} />
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[520px] flex-col pt-safe md:max-w-[860px]">
          <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo variant="mark" height={30} decorative />
              <div className="min-w-0 leading-tight">
                <h1 className="truncate text-[15px] font-extrabold tracking-[-0.01em]">
                  {venue?.venue.name ?? t.venueLoading}
                </h1>
                <p className="flex items-center gap-1.5 truncate text-[12px] font-medium text-fg-muted">
                  {venue?.venue.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-3" />
                      {venue.venue.city}
                    </span>
                  ) : null}
                  {session?.tableLabel ? (
                    <span
                      data-testid="table-label"
                      className="inline-flex items-center gap-1 rounded-pill bg-surface-3 px-2 py-0.5 text-[11px] font-bold text-fg"
                    >
                      <Users aria-hidden="true" className="size-3" />
                      {session.tableLabel}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <LangSwitch />
          </header>

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
                  offsetMs={feed.offsetMs}
                  mine={Boolean(nowPlaying.requestId && feed.mine[nowPlaying.requestId])}
                />
              ) : (
                <EmptyState
                  illustration="queue"
                  size="lg"
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
                onVote={(request) => void vote(request)}
                votingId={votingId}
                className="mt-6 md:mt-0"
              />
            ) : null}
          </main>
        </div>

        <Dock
          mode={dockMode}
          activeCount={activeMineCount(feed.mine)}
          allowFreeText={Boolean(settings?.allowFreeText)}
          onSearch={() => setSearchOpen(true)}
          onSearchIntent={() => void loadSearchOverlay()}
          onText={() => openTextRequest()}
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
      <OfflineBanner online={online} />
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
