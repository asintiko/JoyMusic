import type { NowPlayingAdapter, Timers } from "@joymusic/dj-bridge";
import type { AdapterId, AdapterSettings } from "../common/settings";

export interface FileStore {
  read(name: string): Promise<string | null>;
  write(name: string, text: string): Promise<void>;
}

export interface SecretStore {
  available(): boolean;
  load(): Promise<string | null>;
  save(text: string): Promise<void>;
  clear(): Promise<void>;
}

export interface EndpointConfig {
  apiUrl: string;
  adminUrl: string;
  webUrl: string;
}

export type AdapterFactory = (id: AdapterId, settings: AdapterSettings) => NowPlayingAdapter | null;

export interface CoreEnvironment {
  config: EndpointConfig;
  fetch: typeof fetch;
  WebSocketImpl?: typeof WebSocket;
  secrets: SecretStore;
  files: FileStore;
  openExternal(url: string): Promise<void>;
  now(): number;
  timers: Timers;
  adapterFactory: AdapterFactory;
  requestTimeoutMs?: number;
}
