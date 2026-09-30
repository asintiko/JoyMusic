import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));

const sources = [
  ["unbounded700Latin", "@fontsource/unbounded", "unbounded-latin-700-normal.woff"],
  ["unbounded700Cyrillic", "@fontsource/unbounded", "unbounded-cyrillic-700-normal.woff"],
  ["manrope700Latin", "@fontsource/manrope", "manrope-latin-700-normal.woff"],
  ["manrope700Cyrillic", "@fontsource/manrope", "manrope-cyrillic-700-normal.woff"],
  ["manrope500Latin", "@fontsource/manrope", "manrope-latin-500-normal.woff"],
  ["manrope500Cyrillic", "@fontsource/manrope", "manrope-cyrillic-500-normal.woff"],
];

const lines = sources.map(([name, pkg, file]) => {
  const packageDirectory = dirname(require.resolve(`${pkg}/package.json`));
  const data = readFileSync(join(packageDirectory, "files", file)).toString("base64");
  return `export const ${name} = "${data}";`;
});

writeFileSync(join(root, "src", "fonts", "data.ts"), `${lines.join("\n")}\n`);
