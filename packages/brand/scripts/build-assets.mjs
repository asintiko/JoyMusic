import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  buildAppIconSvg,
  buildLogoSvg,
  logoColors,
  logoMarkGradient,
  logoMarkPath,
} from "../src/logo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "assets");
const tagline = JSON.parse(readFileSync(join(root, "src", "generated", "tagline.json"), "utf8"));

for (const directory of ["icons", "pwa", "social", "logo"]) {
  mkdirSync(join(assets, directory), { recursive: true });
}

const rasterize = (svg, width, height = width) =>
  sharp(Buffer.from(svg), { density: Math.max(72, (72 * Math.max(width, height)) / 96) })
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

const write = (relativePath, buffer) => {
  writeFileSync(join(assets, relativePath), buffer);
  process.stdout.write(`  ${relativePath} (${(buffer.length / 1024).toFixed(1)} KB)\n`);
};

const faviconSvg = buildAppIconSvg({ shape: "squircle", markScale: 0.7, glow: false });
const smallIconSvg = buildAppIconSvg({ shape: "squircle", markScale: 0.66, glow: false });
const appIconSvg = buildAppIconSvg({ shape: "squircle", markScale: 0.6 });
const appIconSquareSvg = buildAppIconSvg({ shape: "square", markScale: 0.6 });
const maskableSvg = buildAppIconSvg({ shape: "square", markScale: 0.5 });

const iconEntries = (sizes, svgFor) =>
  Promise.all(sizes.map(async (size) => ({ size, png: await rasterize(svgFor(size), size) })));

const svgForSize = (size) => (size <= 48 ? smallIconSvg : appIconSvg);

function icoFromPngs(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const directory = Buffer.alloc(16 * entries.length);
  let offset = 6 + directory.length;
  entries.forEach(({ size, png }, index) => {
    const base = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, base);
    directory.writeUInt8(size >= 256 ? 0 : size, base + 1);
    directory.writeUInt8(0, base + 2);
    directory.writeUInt8(0, base + 3);
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(png.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += png.length;
  });
  return Buffer.concat([header, directory, ...entries.map((entry) => entry.png)]);
}

function icnsFromPngs(entries) {
  const chunks = entries.map(({ type, png }) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, 4, "ascii");
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write("icns", 0, 4, "ascii");
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

async function macosIconPng() {
  const inner = 824;
  const margin = (1024 - inner) / 2;
  const icon = await sharp(Buffer.from(appIconSvg), { density: 300 })
    .resize(inner, inner)
    .png()
    .toBuffer();
  const shadowShape = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect x="${margin}" y="${margin + 12}" width="${inner}" height="${inner}" rx="185" fill="#000" fill-opacity="0.5"/></svg>`,
  );
  const shadow = await sharp(shadowShape).blur(14).png().toBuffer();
  return sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: icon, left: margin, top: margin },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function embed(svg, x, y, width) {
  const viewBox = svg
    .match(/viewBox="([^"]+)"/)[1]
    .split(/\s+/)
    .map(Number);
  const height = (width * viewBox[3]) / viewBox[2];
  const inner = svg.replace(
    /<svg [^>]*>/,
    `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox.join(" ")}">`,
  );
  return { markup: inner, height };
}

function pseudoRandom(column, row) {
  let value = (column * 374761393 + row * 668265263) >>> 0;
  value = ((value ^ (value >>> 13)) * 1274126177) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function joyCode({ x, y, size, id }) {
  const grid = 25;
  const gap = size / 120;
  const module = (size - gap * (grid - 1)) / grid;
  const step = module + gap;
  const finderSpan = 7;
  const inFinder = (c, r) =>
    (c < finderSpan + 1 && r < finderSpan + 1) ||
    (c > grid - finderSpan - 2 && r < finderSpan + 1) ||
    (c < finderSpan + 1 && r > grid - finderSpan - 2);
  const centerStart = 9;
  const centerEnd = grid - 10;
  const inCenter = (c, r) =>
    c >= centerStart && c <= centerEnd && r >= centerStart && r <= centerEnd;
  let modules = "";
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (inFinder(c, r) || inCenter(c, r)) continue;
      if (pseudoRandom(c, r) < 0.5) {
        modules += `<rect x="${(c * step).toFixed(2)}" y="${(r * step).toFixed(2)}" width="${module.toFixed(2)}" height="${module.toFixed(2)}" rx="${(module * 0.32).toFixed(2)}"/>`;
      }
    }
  }
  const finderOuter = finderSpan * step - gap;
  const stroke = module;
  const finder = (c, r) => {
    const fx = c * step;
    const fy = r * step;
    return (
      `<rect x="${(fx + stroke / 2).toFixed(2)}" y="${(fy + stroke / 2).toFixed(2)}" width="${(finderOuter - stroke).toFixed(2)}" height="${(finderOuter - stroke).toFixed(2)}" rx="${(module * 1.9).toFixed(2)}" fill="none" stroke="url(#${id}-g)" stroke-width="${stroke.toFixed(2)}"/>` +
      `<rect x="${(fx + 2 * step).toFixed(2)}" y="${(fy + 2 * step).toFixed(2)}" width="${(3 * step - gap).toFixed(2)}" height="${(3 * step - gap).toFixed(2)}" rx="${(module * 0.9).toFixed(2)}" fill="url(#${id}-g)"/>`
    );
  };
  const centerSize = (centerEnd - centerStart + 1) * step - gap;
  const centerX = centerStart * step;
  const markScale = (centerSize * 0.96) / 128;
  const markOffset = centerX + (centerSize - 128 * markScale) / 2;
  return (
    `<g transform="translate(${x} ${y})">` +
    `<defs><linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="${size}" y1="0" x2="0" y2="${size}"><stop offset="0" stop-color="${logoColors.ultraviolet}"/><stop offset="1" stop-color="${logoColors.magenta}"/></linearGradient>` +
    `<linearGradient id="${id}-m" gradientUnits="userSpaceOnUse" x1="${logoMarkGradient.x1}" y1="${logoMarkGradient.y1}" x2="${logoMarkGradient.x2}" y2="${logoMarkGradient.y2}"><stop offset="0" stop-color="#9B85FF"/><stop offset="1" stop-color="${logoColors.magenta}"/></linearGradient></defs>` +
    `<g fill="url(#${id}-g)">${modules}</g>` +
    finder(0, 0) +
    finder(grid - finderSpan, 0) +
    finder(0, grid - finderSpan) +
    `<g transform="translate(${markOffset.toFixed(2)} ${markOffset.toFixed(2)}) scale(${markScale.toFixed(4)})"><path fill="url(#${id}-m)" d="${logoMarkPath}"/></g>` +
    `</g>`
  );
}

function taglineElement(x, y, width, opacity) {
  const scale = width / tagline.width;
  return `<g transform="translate(${x} ${y}) scale(${scale.toFixed(5)})" fill="${logoColors.paper}" fill-opacity="${opacity}"><path d="${tagline.path}"/></g>`;
}

function glowBackground(width, height, variant) {
  const a = variant === "wide" ? { cx: 0.08, cy: 0.05, r: 0.7 } : { cx: 0.15, cy: 0.05, r: 0.9 };
  const b = variant === "wide" ? { cx: 0.98, cy: 1, r: 0.75 } : { cx: 0.9, cy: 1, r: 0.85 };
  return (
    `<defs>` +
    `<radialGradient id="bg-a" cx="${a.cx}" cy="${a.cy}" r="${a.r}"><stop offset="0" stop-color="${logoColors.ultraviolet}" stop-opacity="0.46"/><stop offset="1" stop-color="${logoColors.ultraviolet}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="bg-b" cx="${b.cx}" cy="${b.cy}" r="${b.r}"><stop offset="0" stop-color="${logoColors.magenta}" stop-opacity="0.34"/><stop offset="1" stop-color="${logoColors.magenta}" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect width="${width}" height="${height}" fill="${logoColors.ink}"/>` +
    `<rect width="${width}" height="${height}" fill="url(#bg-a)"/>` +
    `<rect width="${width}" height="${height}" fill="url(#bg-b)"/>`
  );
}

function ogImageSvg() {
  const width = 1200;
  const height = 630;
  const lockup = embed(
    buildLogoSvg({ variant: "lockup-horizontal", tone: "default", idPrefix: "og" }),
    84,
    200,
    500,
  );
  const code = joyCode({ x: 722, y: 115, size: 400, id: "og-code" });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    glowBackground(width, height, "wide") +
    `<g transform="rotate(-5 920 315)" opacity="0.98">${code}</g>` +
    lockup.markup +
    `<g transform="translate(84 ${200 + lockup.height + 58})"><rect width="64" height="6" rx="3" fill="${logoColors.magenta}"/></g>` +
    taglineElement(84, 200 + lockup.height + 92, 470, 0.72) +
    `</svg>`
  );
}

function squareSocialSvg() {
  const size = 1080;
  const lockup = embed(
    buildLogoSvg({ variant: "lockup-stacked", tone: "default", idPrefix: "sq" }),
    290,
    250,
    500,
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    glowBackground(size, size, "square") +
    lockup.markup +
    taglineElement(290, 250 + lockup.height + 90, 500, 0.72) +
    `</svg>`
  );
}

process.stdout.write("brand assets\n");

write("icons/icon-1024.png", await rasterize(appIconSvg, 1024));
write("icons/icon-macos-1024.png", await macosIconPng());

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
write("icons/icon.ico", icoFromPngs(await iconEntries(icoSizes, svgForSize)));

const icnsSpecs = [
  ["icp4", 16],
  ["icp5", 32],
  ["icp6", 64],
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024],
  ["ic11", 32],
  ["ic12", 64],
  ["ic13", 256],
  ["ic14", 512],
];
const macSource = await macosIconPng();
const macRender = (size) =>
  sharp(macSource).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
write(
  "icons/icon.icns",
  icnsFromPngs(
    await Promise.all(
      icnsSpecs.map(async ([type, size]) => ({ type, png: await macRender(size) })),
    ),
  ),
);

writeFileSync(join(assets, "icons", "favicon.svg"), `${faviconSvg}\n`);
write("icons/favicon.ico", icoFromPngs(await iconEntries([16, 32, 48], () => smallIconSvg)));
write("icons/favicon-32.png", await rasterize(smallIconSvg, 32));
write("icons/favicon-16.png", await rasterize(smallIconSvg, 16));
write("icons/apple-touch-icon.png", await rasterize(appIconSquareSvg, 180));

write("pwa/icon-192.png", await rasterize(appIconSvg, 192));
write("pwa/icon-512.png", await rasterize(appIconSvg, 512));
write("pwa/icon-maskable-512.png", await rasterize(maskableSvg, 512));

const ogSvg = ogImageSvg();
writeFileSync(join(assets, "social", "og-image.svg"), `${ogSvg}\n`);
write("social/og-image.png", await rasterize(ogSvg, 1200, 630));
const squareSvg = squareSocialSvg();
writeFileSync(join(assets, "social", "social-square.svg"), `${squareSvg}\n`);
write("social/social-square.png", await rasterize(squareSvg, 1080, 1080));

write(
  "logo/mark-512.png",
  await rasterize(buildLogoSvg({ variant: "mark", tone: "gradient" }), 512),
);
write(
  "logo/lockup-horizontal-1600.png",
  await rasterize(buildLogoSvg({ variant: "lockup-horizontal", tone: "default" }), 1600, 320),
);
