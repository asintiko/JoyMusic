import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { FileEntry, FileSystemLike } from "./io";

const maxReadBytes = 32 * 1024 * 1024;

function isMissing(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
}

export function createNodeFileSystem(): FileSystemLike {
  return {
    async listFiles(directory) {
      let names: string[];
      try {
        names = await readdir(directory);
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
      const entries: FileEntry[] = [];
      for (const name of names) {
        const path = join(directory, name);
        try {
          const info = await stat(path);
          if (info.isFile()) entries.push({ name, path, mtimeMs: info.mtimeMs, size: info.size });
        } catch (error) {
          if (!isMissing(error)) throw error;
        }
      }
      return entries;
    },
    async readFile(path) {
      try {
        const info = await stat(path);
        if (info.size > maxReadBytes) return null;
        return new Uint8Array(await readFile(path));
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
  };
}
