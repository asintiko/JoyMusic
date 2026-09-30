import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAppIconSvg, buildLogoSvg } from "../src/logo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoDirectory = join(root, "assets", "logo");
mkdirSync(logoDirectory, { recursive: true });

const files = {
  "mark.svg": { variant: "mark", tone: "gradient" },
  "mark-white.svg": { variant: "mark", tone: "white" },
  "mark-black.svg": { variant: "mark", tone: "black" },
  "wordmark.svg": { variant: "wordmark", tone: "default" },
  "wordmark-on-light.svg": { variant: "wordmark", tone: "on-light" },
  "wordmark-gradient.svg": { variant: "wordmark", tone: "gradient" },
  "wordmark-white.svg": { variant: "wordmark", tone: "white" },
  "wordmark-black.svg": { variant: "wordmark", tone: "black" },
  "lockup-horizontal.svg": { variant: "lockup-horizontal", tone: "default" },
  "lockup-horizontal-on-light.svg": { variant: "lockup-horizontal", tone: "on-light" },
  "lockup-horizontal-gradient.svg": { variant: "lockup-horizontal", tone: "gradient" },
  "lockup-stacked.svg": { variant: "lockup-stacked", tone: "default" },
  "lockup-stacked-on-light.svg": { variant: "lockup-stacked", tone: "on-light" },
  "lockup-stacked-gradient.svg": { variant: "lockup-stacked", tone: "gradient" },
  "mono-white.svg": { variant: "lockup-horizontal", tone: "white" },
  "mono-black.svg": { variant: "lockup-horizontal", tone: "black" },
  "mono-stacked-white.svg": { variant: "lockup-stacked", tone: "white" },
  "mono-stacked-black.svg": { variant: "lockup-stacked", tone: "black" },
};

for (const [name, options] of Object.entries(files)) {
  writeFileSync(join(logoDirectory, name), `${buildLogoSvg(options)}\n`);
}

const icons = {
  "app-icon.svg": {},
  "app-icon-mono.svg": { mono: true },
  "app-icon-square.svg": { shape: "square" },
  "app-icon-maskable.svg": { shape: "square", markScale: 0.5 },
};

for (const [name, options] of Object.entries(icons)) {
  writeFileSync(join(logoDirectory, name), `${buildAppIconSvg(options)}\n`);
}

process.stdout.write(
  `logo: wrote ${Object.keys(files).length + Object.keys(icons).length} svg files\n`,
);
