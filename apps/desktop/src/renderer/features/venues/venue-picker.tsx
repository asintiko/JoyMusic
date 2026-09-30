import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { LogOut, Play, RefreshCw, Settings, Store } from "lucide-react";
import {
  AmbientBackground,
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Logo,
  Skeleton,
} from "@joymusic/ui";
import type { DjRouteOutput } from "../../../common/bridge";
import { getBridge } from "../../bridge/access";
import { useT } from "../../i18n";
import { callApi } from "../../lib/api";
import { describeError } from "../../lib/errors";
import { useTopic } from "../../lib/topics";
import { BridgeFailure } from "../../bridge/access";
import { useApplyTheme } from "../../state/appearance";

const brandAmbient = ["#7A5CFF", "#FF4FD8", "#3B2A8F"];

type VenueEntry = DjRouteOutput<"djVenues">["venues"][number];

export function VenuePicker() {
  const t = useT();
  const navigate = useNavigate();
  const auth = useTopic("auth");
  const [venues, setVenues] = useState<VenueEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  useApplyTheme("club");

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await callApi("djVenues");
      setVenues(result.venues);
    } catch (failure) {
      setError(describeError(t, failure));
      setVenues((current) => current ?? []);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (auth.status !== "signedIn") return <Navigate to="/login" replace />;

  const enter = async (venue: VenueEntry) => {
    setBusyId(venue.id);
    setError(null);
    try {
      const sessionId =
        venue.activeSessionId ??
        (await callApi("djSessionStart", { params: { venueId: venue.id } })).id;
      await getBridge().session.activate({
        venueId: venue.id,
        venueSlug: venue.slug,
        venueName: venue.name,
        venueTheme: venue.theme,
        sessionId,
      });
      await getBridge().settings.update({ lastVenueId: venue.id });
      navigate("/console");
    } catch (failure) {
      setError(
        failure instanceof BridgeFailure && failure.code === "conflict"
          ? t.sessionConflict
          : describeError(t, failure),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-canvas" data-testid="picker">
      <AmbientBackground colors={brandAmbient} intensity={0.45} />
      <header className="relative z-10 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface-1 px-5">
        <Logo variant="horizontal" height={24} />
        <div className="ml-auto flex items-center gap-2">
          <IconButton
            label={t.settings}
            variant="secondary"
            data-testid="picker-settings"
            icon={<Settings aria-hidden="true" className="size-[18px]" />}
            onClick={() => navigate("/settings/general")}
          />
          <IconButton
            label={t.signOut}
            variant="secondary"
            data-testid="sign-out"
            icon={<LogOut aria-hidden="true" className="size-[18px]" />}
            onClick={() => void getBridge().auth.logout()}
          />
          <Avatar name={auth.me?.user.name ?? "DJ"} size={34} status="online" />
        </div>
      </header>
      <div className="relative z-10 mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-6 overflow-y-auto px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em]">
              {t.pickerTitle}
            </h1>
            <p className="mt-1.5 text-[14px] text-fg-muted">
              {t.pickerSubtitle(auth.me?.user.name ?? "")}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw aria-hidden="true" className="size-4" />}
            onClick={() => void load()}
          >
            {t.refresh}
          </Button>
        </div>
        {error ? (
          <p
            role="alert"
            data-testid="picker-error"
            className="rounded-md bg-danger-soft px-4 py-3 text-[14px] font-semibold text-danger-fg"
          >
            {error}
          </p>
        ) : null}
        {venues === null ? (
          <div className="grid gap-3">
            <Skeleton className="h-[88px] rounded-xl" />
            <Skeleton className="h-[88px] rounded-xl" />
          </div>
        ) : venues.length === 0 ? (
          <EmptyState illustration="qr" title={t.pickerEmpty} description={t.pickerEmptyBody} />
        ) : (
          <ul className="grid gap-3" data-testid="venue-list">
            {venues.map((venue) => (
              <li
                key={venue.id}
                data-testid={`venue-${venue.slug}`}
                className="jm-glass flex items-center gap-4 rounded-xl p-5 hairline"
                data-theme={venue.theme}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Store aria-hidden="true" className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-bold tracking-[-0.01em]">{venue.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="type-mono text-[12px] text-fg-subtle">{venue.slug}</span>
                    {venue.activeSessionId ? (
                      <Badge tone="playing" dot size="sm">
                        {t.sessionActive}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <Button
                  size="lg"
                  loading={busyId === venue.id}
                  data-testid={`enter-${venue.slug}`}
                  leftIcon={<Play aria-hidden="true" className="size-[18px]" />}
                  onClick={() => void enter(venue)}
                >
                  {venue.activeSessionId ? t.sessionResume : t.sessionStart}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
