import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, string>();

function readPlaceholder(name: string): string {
  try {
    const file = readFileSync(join(process.cwd(), "public", "landing", `${name}-placeholder.webp`));
    return `data:image/webp;base64,${file.toString("base64")}`;
  } catch {
    return "";
  }
}

export function placeholderUri(name: string): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const uri = readPlaceholder(name);
  cache.set(name, uri);
  return uri;
}
