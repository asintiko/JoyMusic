import { describe, expect, it } from "vitest";
import { seratoSessionDirectories, virtualDjHistoryDirectories } from "./paths";

describe("default paths", () => {
  it("builds macOS paths", () => {
    const context = { platform: "darwin", homeDir: "/Users/dj/" } as const;
    expect(seratoSessionDirectories(context)).toEqual([
      "/Users/dj/Music/_Serato_/History/Sessions",
    ]);
    expect(virtualDjHistoryDirectories(context)).toEqual([
      "/Users/dj/Library/Application Support/VirtualDJ/History",
      "/Users/dj/Documents/VirtualDJ/History",
    ]);
  });

  it("builds Windows paths and honours LOCALAPPDATA", () => {
    const context = { platform: "win32", homeDir: "C:\\Users\\dj", env: {} } as const;
    expect(seratoSessionDirectories(context)).toEqual([
      "C:\\Users\\dj\\Music\\_Serato_\\History\\Sessions",
    ]);
    expect(virtualDjHistoryDirectories(context)[0]).toBe(
      "C:\\Users\\dj\\AppData\\Local\\VirtualDJ\\History",
    );
    expect(virtualDjHistoryDirectories({ ...context, env: { LOCALAPPDATA: "D:\\Local" } })[0]).toBe(
      "D:\\Local\\VirtualDJ\\History",
    );
  });
});
