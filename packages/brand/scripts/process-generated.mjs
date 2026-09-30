import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const generatedDirectory = fileURLToPath(new URL("../assets/generated/", import.meta.url));
const originalsDirectory = join(generatedDirectory, "originals");
const webDirectory = join(generatedDirectory, "web");

const placeholderByteLimit = 2048;

const rasterImages = [
  { name: "hero-landing", widths: [2560, 1280], quality: 82 },
  { name: "hero-phone-table", widths: [1440, 720], quality: 82 },
  { name: "backdrop-lounge", widths: [2560, 1280], quality: 80 },
  { name: "backdrop-cafe", widths: [2560, 1280], quality: 80 },
];

async function writeResized(source, name, width, quality) {
  const target = join(webDirectory, `${name}-${width}.webp`);
  await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(target);
  const { size } = await stat(target);
  return { file: `${name}-${width}.webp`, bytes: size };
}

async function writePlaceholder(source, name) {
  const target = join(webDirectory, `${name}-placeholder.webp`);
  for (const width of [64, 48, 40, 32, 24, 16]) {
    for (const quality of [50, 40, 30, 20]) {
      const buffer = await sharp(source)
        .resize({ width })
        .blur(1.2)
        .webp({ quality, smartSubsample: true, effort: 6 })
        .toBuffer();
      if (buffer.length <= placeholderByteLimit) {
        await writeFile(target, buffer);
        return { file: `${name}-placeholder.webp`, bytes: buffer.length, width };
      }
    }
  }
  throw new Error(`Placeholder for ${name} does not fit ${placeholderByteLimit} bytes`);
}

async function main() {
  await mkdir(webDirectory, { recursive: true });
  const report = [];
  for (const { name, widths, quality } of rasterImages) {
    const source = await readFile(join(originalsDirectory, `${name}.png`));
    for (const width of widths) report.push(await writeResized(source, name, width, quality));
    report.push(await writePlaceholder(source, name));
  }
  for (const entry of report) process.stdout.write(`${entry.file} ${entry.bytes}\n`);
}

await main();
