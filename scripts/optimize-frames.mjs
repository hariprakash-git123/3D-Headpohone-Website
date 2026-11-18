/**
 * Builds the deployable image assets from the high-resolution sources in /assets-src.
 *
 *   npm run optimize:frames
 *
 * - assets-src/sequence/ezgif-frame-NNN.jpg  ->  public/frames/<version>/sm/NNN.webp  (960w, phones)
 *                                           ->  public/frames/<version>/lg/NNN.jpg   (1920w, copied as-is)
 * - assets-src/images/rockerz440-hero.jpg    ->  public/og-image.jpg (1200x630 share image)
 *
 * The source JPGs are already tightly compressed: re-encoding them at 1920w (WebP or JPEG) gives no
 * size win, so the large set is a straight copy and only the phone set is re-encoded.
 *
 * When the source frames change, bump FRAMES_VERSION in src/lib/sequenceStore.ts and pass the
 * same value here (FRAMES_VERSION=v2 npm run optimize:frames). The versioned folder lets the
 * frames be cached as immutable (see public/_headers).
 */
import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT, "assets-src", "sequence");
const VERSION = process.env.FRAMES_VERSION ?? "v1";
const OUT_DIR = path.join(ROOT, "public", "frames", VERSION);

const VARIANTS = [
  { name: "sm", width: 960, quality: 60 },
  { name: "lg", copy: true },
];

async function dirSize(dir) {
  let total = 0;
  for (const f of await readdir(dir)) total += (await stat(path.join(dir, f))).size;
  return total;
}

async function buildFrames() {
  const files = (await readdir(SRC_DIR)).filter((f) => f.endsWith(".jpg")).sort();
  if (files.length === 0) throw new Error(`No source frames found in ${SRC_DIR}`);

  await rm(OUT_DIR, { recursive: true, force: true });
  for (const v of VARIANTS) await mkdir(path.join(OUT_DIR, v.name), { recursive: true });

  const CONCURRENCY = 8;
  let cursor = 0;
  const worker = async () => {
    while (cursor < files.length) {
      const file = files[cursor++];
      const num = file.match(/(\d+)\.jpg$/)?.[1];
      if (!num) continue;
      const input = path.join(SRC_DIR, file);
      const id = num.padStart(3, "0");
      for (const v of VARIANTS) {
        if (v.copy) {
          await copyFile(input, path.join(OUT_DIR, v.name, `${id}.jpg`));
          continue;
        }
        await sharp(input)
          .resize({ width: v.width, withoutEnlargement: true })
          .webp({ quality: v.quality, effort: 5 })
          .toFile(path.join(OUT_DIR, v.name, `${id}.webp`));
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const srcSize = await dirSize(SRC_DIR);
  console.log(`Frames: ${files.length} source JPGs (${(srcSize / 1e6).toFixed(1)} MB)`);
  for (const v of VARIANTS) {
    const size = await dirSize(path.join(OUT_DIR, v.name));
    console.log(`  ${v.name} (${v.copy ? "original jpg" : `${v.width}w webp`}): ${(size / 1e6).toFixed(1)} MB`);
  }
}

async function buildOgImage() {
  const src = path.join(ROOT, "assets-src", "images", "rockerz440-hero.jpg");
  const meta = await sharp(src).metadata();
  // Crop to 1.905:1 from the left so the generator watermark in the bottom-right corner is excluded.
  const width = Math.round(meta.width * 0.93);
  const height = Math.round(width / (1200 / 630));
  const top = Math.max(0, Math.round((meta.height - height) / 2));
  await sharp(src)
    .extract({ left: 0, top, width, height })
    .resize(1200, 630)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(ROOT, "public", "og-image.jpg"));
  console.log("OG image: public/og-image.jpg (1200x630)");
}

await buildFrames();
await buildOgImage();
