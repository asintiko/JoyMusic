import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");

function packageDirectory(fromPackage: string, name: string): string {
  const require = createRequire(resolve(root, fromPackage, "package.json"));
  return dirname(require.resolve(`${name}/package.json`));
}

const fontPackages = [
  "@fontsource-variable/unbounded",
  "@fontsource-variable/manrope",
  "@fontsource-variable/jetbrains-mono",
];

export function rendererAliases(): Record<string, string> {
  const require = createRequire(resolve(root, "packages/qr/package.json"));
  const aliases: Record<string, string> = {
    "opentype.js": require.resolve("opentype.js"),
  };
  for (const name of fontPackages) aliases[name] = packageDirectory("packages/ui", name);
  return aliases;
}
