import { homedir } from "node:os";
import { join } from "node:path";
import { BrowserWindow, app, dialog, net, protocol, safeStorage, session, shell } from "electron";
import electronUpdater from "electron-updater";
import { channels } from "../common/channels";
import type { MenuCommand } from "../common/channels";
import type { AppInfo, StageConfig } from "../common/bridge";
import { createDesktopCore } from "../core/desktop-core";
import { parseDeepLink, findDeepLinkArgument, deepLinkScheme } from "../core/deep-link";
import { createTopic } from "../core/topic";
import { createNodeAdapterFactory } from "./adapter-factories";
import { developmentEndpoints, resolveEndpoints } from "./config";
import { createDiskFileStore, createSafeStorageSecretStore } from "./file-stores";
import { registerIpc } from "./ipc";
import { installMenu } from "./menu";
import { serveAppFile } from "./protocol";
import {
  appHost,
  appScheme,
  buildContentSecurityPolicy,
  isAllowedPermission,
  isAppUrl,
  isSafeExternalUrl,
} from "./security";
import { createUpdaterService } from "./updater";
import { createConsoleWindow, createStageManager } from "./windows";
import type { WindowEnvironment } from "./windows";

declare const __JOY_BUILD_ENDPOINTS__: {
  apiUrl: string;
  adminUrl: string;
  webUrl: string;
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: appScheme,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false },
  },
]);

const userDataOverride = process.env.JOYMUSIC_USER_DATA;
if (userDataOverride) app.setPath("userData", userDataOverride);

const developmentOrigin = app.isPackaged ? null : (process.env.ELECTRON_RENDERER_URL ?? null);
const development = !app.isPackaged;
const developmentServer = developmentOrigin !== null;
const rendererRoot = join(import.meta.dirname, "../renderer");
const preloadPath = join(import.meta.dirname, "../preload/index.cjs");

let consoleWindow: BrowserWindow | null = null;
let pendingDeepLink: string | null = findDeepLinkArgument(process.argv);
let handleDeepLink: (url: string) => void = (url) => {
  pendingDeepLink = url;
};

function rendererUrl(route: string): string {
  const hash = `#${route}`;
  if (developmentOrigin) return `${developmentOrigin}/${hash}`;
  return `${appScheme}://${appHost}/index.html${hash}`;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const link = findDeepLinkArgument(argv);
    if (link) handleDeepLink(link);
    if (consoleWindow) {
      if (consoleWindow.isMinimized()) consoleWindow.restore();
      consoleWindow.focus();
    }
  });
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
  void start();
}

function registerProtocolClient(): void {
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient(deepLinkScheme, process.execPath, [process.argv[1]]);
  } else {
    app.setAsDefaultProtocolClient(deepLinkScheme);
  }
}

async function start(): Promise<void> {
  await app.whenReady();
  app.setName("Joy Music");
  registerProtocolClient();

  const endpoints = resolveEndpoints(
    process.env,
    typeof __JOY_BUILD_ENDPOINTS__ === "undefined" ? developmentEndpoints : __JOY_BUILD_ENDPOINTS__,
  );
  const userData = app.getPath("userData");
  const files = createDiskFileStore(userData);
  const secrets = createSafeStorageSecretStore({ directory: userData, safeStorage });
  const homeDir = homedir();

  const core = createDesktopCore(
    {
      config: endpoints,
      fetch: (input, init) => net.fetch(input as string, init as RequestInit),
      WebSocketImpl: globalThis.WebSocket,
      secrets,
      files,
      openExternal: async (url) => {
        if (!isSafeExternalUrl(url)) throw new Error("Blocked url");
        await shell.openExternal(url);
      },
      now: () => Date.now(),
      timers: {
        after(ms, task) {
          const handle = setTimeout(task, ms);
          return { cancel: () => clearTimeout(handle) };
        },
        every(ms, task) {
          const handle = setInterval(task, ms);
          return { cancel: () => clearInterval(handle) };
        },
      },
      adapterFactory: createNodeAdapterFactory({
        platform: process.platform,
        homeDir,
        env: process.env,
      }),
    },
    {
      onError: (scope, error) => console.error(`[joymusic] ${scope}`, error),
    },
  );

  await core.start();

  const windowEnvironment: WindowEnvironment = {
    preloadPath,
    rendererUrl,
    developmentOrigin,
    packaged: app.isPackaged,
    platform: process.platform,
  };
  const stage = createStageManager(windowEnvironment);
  const stageConfig = createTopic<StageConfig | null>(null);

  const updater = createUpdaterService({
    updater: electronUpdater.autoUpdater as never,
    enabled: app.isPackaged && process.env.JOYMUSIC_DISABLE_UPDATES !== "1",
    now: () => Date.now(),
    autoCheck: core.settings.get().updates.autoCheck,
  });
  updater.start();

  const info: AppInfo = {
    version: app.getVersion(),
    platform: process.platform,
    packaged: app.isPackaged,
    apiUrl: endpoints.apiUrl,
    adminUrl: endpoints.adminUrl,
    webUrl: endpoints.webUrl,
    systemLocale: app.getLocale(),
    homeDirectory: homeDir,
    shim: false,
  };

  const csp = buildContentSecurityPolicy({ development: developmentServer, developmentOrigin });
  const appSession = session.defaultSession;
  appSession.webRequest.onHeadersReceived((details, callback) => {
    if (!isAppUrl(details.url, developmentOrigin)) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
  appSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
    callback(isAllowedPermission(permission, details.requestingUrl, developmentOrigin));
  });
  appSession.setPermissionCheckHandler((_contents, permission, requestingOrigin) =>
    isAllowedPermission(permission, requestingOrigin, developmentOrigin),
  );

  protocol.handle(appScheme, (request) =>
    serveAppFile(rendererRoot, request.url, { "content-security-policy": csp }),
  );

  const pickPath = async (kind: "directory" | "file", sender: Electron.WebContents) => {
    const parent = BrowserWindow.fromWebContents(sender) ?? undefined;
    const options: Electron.OpenDialogOptions = {
      properties: kind === "directory" ? ["openDirectory"] : ["openFile"],
    };
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled) return null;
    return result.filePaths[0] ?? null;
  };

  const disposeIpc = registerIpc({
    core,
    stage,
    updater,
    info,
    files,
    developmentOrigin,
    stageConfig,
    allWebContents: () => BrowserWindow.getAllWindows().map((window) => window.webContents),
    pickPath,
    openExternal: async (url) => {
      await shell.openExternal(url);
    },
  });

  const sendMenuCommand = (command: MenuCommand) => {
    const target = consoleWindow ?? BrowserWindow.getAllWindows()[0];
    if (target && !target.isDestroyed()) target.webContents.send(channels.menuCommand, command);
  };
  installMenu(sendMenuCommand, { platform: process.platform, development });

  handleDeepLink = (url) => {
    const link = parseDeepLink(url);
    if (!link) return;
    void core.auth.handleDeepLink(link).then(() => {
      if (consoleWindow && !consoleWindow.isDestroyed()) {
        consoleWindow.show();
        consoleWindow.focus();
      }
    });
  };
  if (pendingDeepLink) {
    const queued = pendingDeepLink;
    pendingDeepLink = null;
    handleDeepLink(queued);
  }

  const openConsole = () => {
    consoleWindow = createConsoleWindow(windowEnvironment);
    consoleWindow.on("closed", () => {
      consoleWindow = null;
      stage.close();
    });
  };
  openConsole();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) openConsole();
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("before-quit", () => {
    updater.stop();
    stage.dispose();
    disposeIpc();
    void core.dispose();
  });
}
