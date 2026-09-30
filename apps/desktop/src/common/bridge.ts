import type { AdapterInfo, DetectedTrack } from "@joymusic/dj-bridge";
import type {
  Locale,
  Me,
  RouteInput,
  RouteName,
  Routes,
  RouteOutput,
  VenueState,
  VenueTheme,
} from "@joymusic/shared";
import type { CommandOutcome, OutboxCommand, OutboxState } from "./commands";
import type { MenuCommand } from "./channels";
import type { Settings, SettingsPatch } from "./settings";

export const djRouteNames = [
  "health",
  "me",
  "catalogSearch",
  "djVenues",
  "djSessionStart",
  "djSessionEnd",
  "djSessionState",
  "djQueueAdd",
] as const satisfies readonly RouteName[];
export type DjRouteName = (typeof djRouteNames)[number];

export type DjRouteInput<N extends DjRouteName> = RouteInput<Routes[N]>;
export type DjRouteOutput<N extends DjRouteName> = RouteOutput<Routes[N]>;

export interface BridgeError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
  network?: boolean;
}

export type Envelope<T> = { ok: true; value: T } | { ok: false; error: BridgeError };

export interface AppInfo {
  version: string;
  platform: string;
  packaged: boolean;
  apiUrl: string;
  adminUrl: string;
  webUrl: string;
  systemLocale: string;
  homeDirectory: string;
  shim: boolean;
}

export interface AuthState {
  status: "signedOut" | "signedIn";
  me: Me | null;
  browserLoginPending: boolean;
  error: string | null;
  restored: boolean;
}

export const signedOutAuthState: AuthState = {
  status: "signedOut",
  me: null,
  browserLoginPending: false,
  error: null,
  restored: false,
};

export interface NetState {
  online: boolean;
  latencyMs: number | null;
  checkedAt: number | null;
}

export interface AdapterSnapshotEntry extends Omit<AdapterInfo, "current"> {
  current: DetectedTrack | null;
}

export interface AdaptersState {
  adapters: AdapterSnapshotEntry[];
  detected: { adapterId: string; track: DetectedTrack | null; at: number } | null;
}

export interface SessionContext {
  venueId: string;
  venueSlug: string;
  venueName: string;
  venueTheme: VenueTheme;
  sessionId: string;
}

export interface StageConfig {
  venueSlug: string;
  venueName: string;
  venueCity: string | null;
  venueTheme: VenueTheme;
  logoUrl: string | null;
  coverUrl: string | null;
  qrUrl: string;
  displayUrl: string;
  locale: Locale;
  themeOverride: "venue" | VenueTheme;
}

export interface DisplayInfo {
  id: number;
  label: string;
  width: number;
  height: number;
  primary: boolean;
  scaleFactor: number;
}

export interface StageState {
  open: boolean;
  displayId: number | null;
  displays: DisplayInfo[];
}

export type UpdateStatus =
  | "disabled"
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "notAvailable"
  | "error";

export interface UpdateState {
  status: UpdateStatus;
  version: string | null;
  progress: number | null;
  message: string | null;
  checkedAt: number | null;
}

export interface TopicMap {
  auth: AuthState;
  net: NetState;
  outbox: OutboxState;
  adapters: AdaptersState;
  settings: Settings;
  session: SessionContext | null;
  stage: StageState;
  stageConfig: StageConfig | null;
  updates: UpdateState;
}
export type TopicName = keyof TopicMap;

export const topicNames = [
  "auth",
  "net",
  "outbox",
  "adapters",
  "settings",
  "session",
  "stage",
  "stageConfig",
  "updates",
] as const satisfies readonly TopicName[];

export type RealtimeTarget = { venue: string; role: "dj" | "tv" };
export type RealtimeConnectionStatus = "connecting" | "open" | "closed";

export interface RealtimeUpdate {
  target: RealtimeTarget;
  state: VenueState | null;
  status: RealtimeConnectionStatus;
  offsetMs: number;
  receivedAt: number;
}

export type Unsubscribe = () => void;

export interface DesktopBridge {
  info(): Promise<AppInfo>;
  topics: {
    get<K extends TopicName>(name: K): Promise<TopicMap[K]>;
    subscribe<K extends TopicName>(name: K, listener: (value: TopicMap[K]) => void): Unsubscribe;
  };
  auth: {
    loginWithPassword(email: string, password: string): Promise<Envelope<AuthState>>;
    beginBrowserLogin(): Promise<Envelope<{ url: string }>>;
    cancelBrowserLogin(): Promise<void>;
    logout(): Promise<void>;
  };
  api: {
    call<N extends DjRouteName>(
      name: N,
      input?: DjRouteInput<N>,
    ): Promise<Envelope<DjRouteOutput<N>>>;
  };
  commands: {
    run(command: OutboxCommand): Promise<Envelope<CommandOutcome>>;
    retryOutbox(): Promise<void>;
    discardOutbox(): Promise<void>;
  };
  session: {
    activate(context: SessionContext | null): Promise<void>;
  };
  realtime: {
    subscribe(target: RealtimeTarget, listener: (update: RealtimeUpdate) => void): Unsubscribe;
    resync(): Promise<void>;
  };
  settings: {
    update(patch: SettingsPatch): Promise<Envelope<Settings>>;
  };
  adapters: {
    advanceSimulator(): Promise<void>;
  };
  midi: {
    loadBindings(): Promise<string | null>;
    saveBindings(json: string): Promise<void>;
  };
  stage: {
    open(displayId?: number | null): Promise<Envelope<StageState>>;
    close(): Promise<void>;
    setConfig(config: StageConfig | null): Promise<void>;
    refreshDisplays(): Promise<DisplayInfo[]>;
  };
  updates: {
    check(): Promise<void>;
    install(): Promise<void>;
  };
  menu: {
    onCommand(listener: (command: MenuCommand) => void): Unsubscribe;
  };
  system: {
    pickPath(kind: "directory" | "file"): Promise<string | null>;
    openExternal(url: string): Promise<void>;
  };
}

declare global {
  interface Window {
    joy?: DesktopBridge;
  }
}
