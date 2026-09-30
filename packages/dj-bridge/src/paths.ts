export type DesktopPlatform = "darwin" | "win32";

export interface PathContext {
  platform: DesktopPlatform;
  homeDir: string;
  env?: Record<string, string | undefined>;
}

function join(platform: DesktopPlatform, ...parts: string[]): string {
  const separator = platform === "win32" ? "\\" : "/";
  return parts
    .map((part, index) =>
      index === 0 ? part.replace(/[\\/]+$/u, "") : part.replace(/^[\\/]+|[\\/]+$/gu, ""),
    )
    .filter((part) => part.length > 0)
    .join(separator);
}

export function seratoSessionDirectories(context: PathContext): string[] {
  const { platform, homeDir } = context;
  return [join(platform, homeDir, "Music", "_Serato_", "History", "Sessions")];
}

export function virtualDjHistoryDirectories(context: PathContext): string[] {
  const { platform, homeDir, env } = context;
  if (platform === "darwin") {
    return [
      join(platform, homeDir, "Library", "Application Support", "VirtualDJ", "History"),
      join(platform, homeDir, "Documents", "VirtualDJ", "History"),
    ];
  }
  const localAppData = env?.LOCALAPPDATA ?? join(platform, homeDir, "AppData", "Local");
  return [
    join(platform, localAppData, "VirtualDJ", "History"),
    join(platform, homeDir, "Documents", "VirtualDJ", "History"),
  ];
}
