import type { DesktopBridge } from "../../src/common/bridge";

declare global {
  interface Window {
    __joyShim?: {
      bridge: DesktopBridge;
      deepLink(url: string): Promise<void>;
      lastOpenedUrl(): string | null;
      dispose(): Promise<void>;
    };
  }
}

export {};
