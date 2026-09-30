import { join } from "node:path";
import {
  createNodeFileSystem,
  createProlinkAdapter,
  createSeratoAdapter,
  createSimulatorAdapter,
  createStageLinqAdapter,
  createTextFileAdapter,
  createTraktorAdapter,
  createVirtualDjAdapter,
  seratoSessionDirectories,
  virtualDjHistoryDirectories,
} from "@joymusic/dj-bridge/node";
import type { DesktopPlatform, FileSystemLike, ModuleLoader } from "@joymusic/dj-bridge/node";
import type { AdapterFactory } from "../core/environment";

export interface NodeAdapterFactoryOptions {
  platform: string;
  homeDir: string;
  env: Record<string, string | undefined>;
  fs?: FileSystemLike;
  loader?: ModuleLoader;
}

export function toDesktopPlatform(platform: string): DesktopPlatform {
  return platform === "win32" ? "win32" : "darwin";
}

export function createNodeAdapterFactory(options: NodeAdapterFactoryOptions): AdapterFactory {
  const fs = options.fs ?? createNodeFileSystem();
  const platform = toDesktopPlatform(options.platform);
  const pathContext = { platform, homeDir: options.homeDir, env: options.env };
  return (id, settings) => {
    switch (id) {
      case "serato": {
        const custom = settings.serato.directory;
        return createSeratoAdapter({
          fs,
          sessionDirectories: custom
            ? [join(custom, "History", "Sessions"), custom]
            : seratoSessionDirectories(pathContext),
        });
      }
      case "virtualdj": {
        const custom = settings.virtualdj.directory;
        const file = settings.virtualdj.nowPlayingFile;
        return createVirtualDjAdapter({
          fs,
          historyDirectories: custom ? [custom] : virtualDjHistoryDirectories(pathContext),
          nowPlayingFile: file ? { path: file } : undefined,
        });
      }
      case "traktor":
        return createTraktorAdapter({
          port: settings.traktor.port,
          password: settings.traktor.password,
        });
      case "textfile":
        return createTextFileAdapter({
          fs,
          path: settings.textfile.path ?? "",
          template: settings.textfile.template,
        });
      case "prolink":
        return createProlinkAdapter({ loader: options.loader });
      case "stagelinq":
        return createStageLinqAdapter({ loader: options.loader });
      case "simulator":
        return createSimulatorAdapter();
    }
  };
}
