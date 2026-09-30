import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button, Dialog, useCommandPalette, useToast } from "@joymusic/ui";
import type { Locale } from "@joymusic/shared";
import type { SessionContext } from "../../../common/bridge";
import { getBridge } from "../../bridge/access";
import { useLocale, useT } from "../../i18n";
import { callApi } from "../../lib/api";
import { describeError } from "../../lib/errors";
import { useTopic } from "../../lib/topics";
import { useApplyTheme, useLargeTargetScale } from "../../state/appearance";
import { useMenuCommands } from "../../state/menu";
import { useMidi } from "../../state/midi";
import { buildStageConfig, useStageConfigSync, useStageControl } from "../../state/stage-control";
import { DeclineDialog } from "./decline-dialog";
import { IncomingPanel } from "./incoming-panel";
import { NowPlayingPanel, RecentPanel } from "./now-playing-panel";
import { OfflineBanner } from "./offline-banner";
import { ConsolePalette } from "./palette";
import { QueuePanel } from "./queue-panel";
import { StatusBar } from "./status-bar";
import { TopBar } from "./top-bar";
import { useConsole } from "./use-console";
import { useConsoleShortcuts } from "./use-shortcuts";

export function ConsoleScreen() {
  const session = useTopic("session");
  if (!session) return <Navigate to="/venues" replace />;
  return <ConsoleView key={session.sessionId} session={session} />;
}

function ConsoleView({ session }: { session: SessionContext }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const navigate = useNavigate();
  const auth = useTopic("auth");
  const settings = useTopic("settings");
  const adapters = useTopic("adapters");
  const controller = useConsole(session);
  const midi = useMidi();
  const palette = useCommandPalette();
  const stageControl = useStageControl();
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [appInfo, setAppInfo] = useState({ version: "", webUrl: "http://localhost:3000" });
  const scale = useLargeTargetScale();
  useApplyTheme(session.venueTheme);

  useEffect(() => {
    void getBridge()
      .info()
      .then((info) => setAppInfo({ version: info.version, webUrl: info.webUrl }));
  }, []);

  const venue = controller.state?.venue ?? null;
  const stageConfig = useMemo(
    () =>
      venue ? buildStageConfig(venue, appInfo.webUrl, settings.locale, settings.stage.theme) : null,
    [venue, appInfo.webUrl, settings.locale, settings.stage.theme],
  );
  useStageConfigSync(stageConfig);

  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    if (autoOpened || !stageConfig || !settings.stage.autoOpen) return;
    setAutoOpened(true);
    void stageControl.open();
  }, [autoOpened, stageConfig, settings.stage.autoOpen, stageControl]);

  const dialogOpen = palette.open || controller.declineTarget !== null || endOpen;
  useConsoleShortcuts(controller.perform, !dialogOpen);

  useEffect(() => {
    midi.registerIntentHandler(controller.perform);
    return () => midi.registerIntentHandler(null);
  }, [midi, controller.perform]);

  const pendingCount = controller.state?.pending.length ?? 0;
  const queuedCount = controller.state?.queue.length ?? 0;
  const playing = Boolean(controller.state?.nowPlaying);
  useEffect(() => {
    midi.setLedState({
      pending: pendingCount,
      queued: queuedCount,
      playing,
      requestsOpen: controller.requestsOpen,
    });
    return () => midi.setLedState(null);
  }, [midi, pendingCount, queuedCount, playing, controller.requestsOpen]);

  const leave = useCallback(async () => {
    await getBridge().session.activate(null);
    await getBridge().stage.close();
    await getBridge().stage.setConfig(null);
    navigate("/venues", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (controller.sessionEnded) void leave();
  }, [controller.sessionEnded, leave]);

  const endSession = useCallback(async () => {
    setEnding(true);
    try {
      await callApi("djSessionEnd", { params: { sessionId: session.sessionId } });
      setEndOpen(false);
      await leave();
    } catch (error) {
      toast.error(describeError(t, error));
    } finally {
      setEnding(false);
    }
  }, [session.sessionId, leave, toast, t]);

  const setLocale = useCallback((next: Locale) => {
    void getBridge().settings.update({ locale: next });
  }, []);
  const toggleBooth = useCallback(() => {
    void getBridge().settings.update({ boothMode: !settings.boothMode });
  }, [settings.boothMode]);
  const toggleLarge = useCallback(() => {
    void getBridge().settings.update({ largeTargets: !settings.largeTargets });
  }, [settings.largeTargets]);
  const openSettings = useCallback(
    (tab?: string) => navigate(`/settings/${tab ?? "general"}`),
    [navigate],
  );
  const signOut = useCallback(() => {
    void getBridge().auth.logout();
  }, []);
  const checkUpdates = useCallback(() => {
    void getBridge().updates.check();
  }, []);
  const simulatorEnabled = adapters.adapters.some(
    (adapter) => adapter.id === "simulator" && adapter.enabled,
  );

  useMenuCommands({
    openPalette: () => palette.setOpen(true),
    toggleStage: () => void stageControl.toggle(),
    endSession: () => setEndOpen(true),
  });

  const paletteActions = useMemo(
    () => ({
      openSettings,
      toggleStage: () => void stageControl.toggle(),
      toggleBooth,
      toggleLarge,
      setLocale,
      endSession: () => setEndOpen(true),
      signOut,
      checkUpdates,
      advanceSimulator: simulatorEnabled
        ? () => void getBridge().adapters.advanceSimulator()
        : undefined,
    }),
    [
      openSettings,
      stageControl,
      toggleBooth,
      toggleLarge,
      setLocale,
      signOut,
      checkUpdates,
      simulatorEnabled,
    ],
  );

  const large = settings.largeTargets;

  return (
    <div
      data-testid="console"
      data-locale={locale}
      className="flex flex-col bg-canvas"
      style={{ zoom: scale, height: `calc(100dvh / ${scale})` }}
    >
      <TopBar
        session={session}
        controller={controller}
        djName={auth.me?.user.name ?? "DJ"}
        onOpenPalette={() => palette.setOpen(true)}
        onOpenSettings={() => openSettings()}
        onToggleStage={() => void stageControl.toggle()}
        onToggleBooth={toggleBooth}
        onToggleLarge={toggleLarge}
      />
      <OfflineBanner realtime={controller.status} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,372px)_minmax(0,1fr)_minmax(340px,392px)] gap-3 p-3">
        <IncomingPanel controller={controller} offsetMs={controller.offsetMs} large={large} />
        <QueuePanel controller={controller} large={large} />
        <div className="flex min-h-0 flex-col gap-3">
          <NowPlayingPanel controller={controller} />
          <RecentPanel items={controller.state?.recentlyPlayed ?? []} />
        </div>
      </div>
      <StatusBar realtime={controller.status} version={appInfo.version} />
      <DeclineDialog
        request={controller.declineTarget}
        onCancel={controller.closeDecline}
        onConfirm={controller.decline}
      />
      <ConsolePalette
        open={palette.open}
        onOpenChange={palette.setOpen}
        controller={controller}
        actions={paletteActions}
        stageOpen={stageControl.stage.open}
      />
      <Dialog
        open={endOpen}
        onOpenChange={setEndOpen}
        title={t.endSessionTitle}
        description={t.endSessionBody}
        closeLabel={t.close}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEndOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              variant="danger"
              loading={ending}
              data-testid="end-session-confirm"
              onClick={() => void endSession()}
            >
              {t.endSession}
            </Button>
          </>
        }
      />
    </div>
  );
}
