import { BrowserWindow, powerSaveBlocker, screen, shell } from "electron";
import type { Display, WebContents } from "electron";
import type { DisplayInfo, StageState } from "../common/bridge";
import { chooseStageDisplay, describeDisplay } from "./displays";
import { createTopic } from "../core/topic";
import { isAppUrl, isBlockedStageInput, isSafeExternalUrl } from "./security";

export interface WindowEnvironment {
  preloadPath: string;
  rendererUrl(route: string): string;
  developmentOrigin: string | null;
  packaged: boolean;
  platform: string;
}

export function lockdownContents(contents: WebContents, environment: WindowEnvironment): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  const guard = (event: { preventDefault(): void }, url: string) => {
    if (!isAppUrl(url, environment.developmentOrigin)) event.preventDefault();
  };
  contents.on("will-navigate", guard);
  contents.on("will-redirect", guard);
  contents.on("will-attach-webview", (event) => event.preventDefault());
}

function secureWebPreferences(environment: WindowEnvironment) {
  return {
    preload: environment.preloadPath,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    spellcheck: false,
    backgroundThrottling: false,
    devTools: !environment.packaged,
  };
}

export function createConsoleWindow(environment: WindowEnvironment): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    title: "Joy Music",
    backgroundColor: "#0A0812",
    autoHideMenuBar: environment.platform !== "darwin",
    webPreferences: secureWebPreferences(environment),
  });
  lockdownContents(window.webContents, environment);
  window.once("ready-to-show", () => window.show());
  void window.loadURL(environment.rendererUrl("/console"));
  return window;
}

export function createStageManager(environment: WindowEnvironment) {
  const topic = createTopic<StageState>({ open: false, displayId: null, displays: [] });
  let window: BrowserWindow | null = null;
  let blockerId: number | null = null;
  let closingIntentionally = false;

  const listDisplays = (): DisplayInfo[] => {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((display) => describeDisplay(display, primaryId));
  };

  const publish = (patch: Partial<StageState> = {}) => {
    topic.update((current) => ({ ...current, displays: listDisplays(), ...patch }));
  };

  const releaseBlocker = () => {
    if (blockerId !== null && powerSaveBlocker.isStarted(blockerId))
      powerSaveBlocker.stop(blockerId);
    blockerId = null;
  };

  const fit = (display: Display) => {
    if (!window || window.isDestroyed()) return;
    window.setBounds(display.bounds);
    if (environment.platform === "darwin") window.setSimpleFullScreen(true);
    else window.setKiosk(true);
  };

  const onDisplayChange = () => {
    if (!window || window.isDestroyed()) {
      publish();
      return;
    }
    const primaryId = screen.getPrimaryDisplay().id;
    const wanted = topic.get().displayId;
    const target = chooseStageDisplay(screen.getAllDisplays(), primaryId, wanted);
    if (target) {
      fit(target);
      publish({ displayId: target.id });
    }
  };

  screen.on("display-added", onDisplayChange);
  screen.on("display-removed", onDisplayChange);
  screen.on("display-metrics-changed", onDisplayChange);

  return {
    topic,
    displays: listDisplays,
    refresh() {
      publish();
      return listDisplays();
    },
    isOpen: () => window !== null && !window.isDestroyed(),
    open(requested: number | null): StageState {
      const displays = screen.getAllDisplays();
      const primaryId = screen.getPrimaryDisplay().id;
      const target = chooseStageDisplay(displays, primaryId, requested);
      if (!target) throw new Error("No display available");
      if (window && !window.isDestroyed()) {
        fit(target);
        publish({ open: true, displayId: target.id });
        return topic.get();
      }
      const created = new BrowserWindow({
        x: target.bounds.x,
        y: target.bounds.y,
        width: target.bounds.width,
        height: target.bounds.height,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: true,
        skipTaskbar: false,
        autoHideMenuBar: true,
        backgroundColor: "#000000",
        title: "Joy Music Stage",
        webPreferences: secureWebPreferences(environment),
      });
      window = created;
      closingIntentionally = false;
      lockdownContents(created.webContents, environment);
      created.setMenuBarVisibility(false);
      created.setAlwaysOnTop(true, "screen-saver");
      created.webContents.on("before-input-event", (event, input) => {
        if (
          isBlockedStageInput({
            key: input.key,
            control: input.control,
            meta: input.meta,
            shift: input.shift,
            alt: input.alt,
          })
        ) {
          event.preventDefault();
        }
      });
      created.on("close", (event) => {
        if (!closingIntentionally) event.preventDefault();
      });
      created.on("closed", () => {
        window = null;
        releaseBlocker();
        publish({ open: false });
      });
      created.once("ready-to-show", () => {
        fit(target);
        created.show();
      });
      blockerId = powerSaveBlocker.start("prevent-display-sleep");
      void created.loadURL(environment.rendererUrl("/stage"));
      publish({ open: true, displayId: target.id });
      return topic.get();
    },
    close() {
      if (!window || window.isDestroyed()) {
        publish({ open: false });
        return;
      }
      closingIntentionally = true;
      if (environment.platform === "darwin") window.setSimpleFullScreen(false);
      window.close();
    },
    dispose() {
      closingIntentionally = true;
      screen.off("display-added", onDisplayChange);
      screen.off("display-removed", onDisplayChange);
      screen.off("display-metrics-changed", onDisplayChange);
      releaseBlocker();
      if (window && !window.isDestroyed()) window.destroy();
      window = null;
    },
  };
}

export type StageManager = ReturnType<typeof createStageManager>;
