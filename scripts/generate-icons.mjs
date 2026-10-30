#!/usr/bin/env node
/**
 * Generate the complete app icon set from ONE source of truth: the Rutex
 * logo the app itself renders (`src/assets/rutex-logo.jpg`). Every surface a
 * student can install from — the web manifest, the iOS home screen, and the
 * Android APK launcher — now shows the same Rutex logo.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two problems made the logo inconsistent:
 *   1. The web manifest icons (`public/pwa-*.png`) were JPEGs wearing a .png
 *      extension. Browsers that sniff content kept working; stricter
 *      consumers (Android WebAPK launcher, iOS home screen) failed to decode
 *      them — "some downloads show the logo, some don't".
 *   2. The Android APK mipmaps shipped a completely different mark (a generic
 *      gold graduation cap) than the web app.
 *
 * This script re-encodes real, losslessly-compressed PNGs for every density
 * and flavour. Maskable / round / adaptive variants scale the logo mark down
 * slightly onto a matching field so no launcher mask ever clips it.
 *
 * No dependencies beyond jpeg-js (the master is a JPEG):
 *   npm i --no-save jpeg-js
 *
 * USAGE
 *   node scripts/generate-icons.mjs          # write every icon
 *   node scripts/generate-icons.mjs --check  # exit 1 if any icon is stale
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jpeg = require("jpeg-js");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const MASTER = join(ROOT, "src", "assets", "rutex-logo.jpg");

/* ------------------------------------------------------------------ *
 * PNG encode (8-bit RGBA, no interlacing) — deterministic output
 * ------------------------------------------------------------------ */

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ *
 * Image helpers (all operate on { width, height, data: Uint8Array RGBA })
 * ------------------------------------------------------------------ */

/** High-quality box-filter downscale; premultiplied so light-grey edges
 *  don't bleed. Correct for arbitrary ratios. */
function resize(src, w, h) {
  const out = new Uint8Array(w * h * 4);
  const xr = src.width / w;
  const yr = src.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * yr);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * yr));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * xr);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * xr));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * src.width + sx) * 4;
          const pa = src.data[i + 3];
          r += src.data[i] * pa;
          g += src.data[i + 1] * pa;
          b += src.data[i + 2] * pa;
          a += pa;
          n++;
        }
      }
      const d = (y * w + x) * 4;
      if (a === 0) {
        out[d] = out[d + 1] = out[d + 2] = out[d + 3] = 0;
      } else {
        out[d] = Math.round(r / a);
        out[d + 1] = Math.round(g / a);
        out[d + 2] = Math.round(b / a);
        out[d + 3] = Math.round(a / n);
      }
    }
  }
  return { width: w, height: h, data: out };
}

/** Sample the master's background colour (top-left corner, averaged over a
 *  small block) so masked variants blend into the same field. */
function sampleBackground(img) {
  let r = 0, g = 0, b = 0, n = 0;
  const edge = Math.max(2, Math.floor(img.width * 0.01));
  for (let y = 0; y < edge; y++) {
    for (let x = 0; x < edge; x++) {
      const i = (y * img.width + x) * 4;
      r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++;
    }
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n), 255];
}

/** Composite `img` (scaled to `content` of the canvas) centred on a solid
 *  `bg` field of `size`. `content < 1` shrinks the mark so launcher masks
 *  (maskable safe circle, adaptive squircle, round) never clip it. */
function compose(img, size, content, bg) {
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = bg[0]; out[i + 1] = bg[1]; out[i + 2] = bg[2]; out[i + 3] = bg[3];
  }
  const inner = Math.round(size * content);
  const scaled = resize(img, inner, inner);
  const off = Math.floor((size - inner) / 2);
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const s = (y * inner + x) * 4;
      const sa = scaled.data[s + 3];
      if (sa === 0) continue;
      const d = ((y + off) * size + (x + off)) * 4;
      const na = sa / 255;
      out[d] = Math.round(scaled.data[s] * na + out[d] * (1 - na));
      out[d + 1] = Math.round(scaled.data[s + 1] * na + out[d + 1] * (1 - na));
      out[d + 2] = Math.round(scaled.data[s + 2] * na + out[d + 2] * (1 - na));
      out[d + 3] = 255;
    }
  }
  return { width: size, height: size, data: out };
}

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

const written = [];
const stale = [];

function emit(relPath, img) {
  const abs = join(ROOT, relPath);
  const bytes = encodePng(img.width, img.height, img.data);
  if (existsSync(abs) && Buffer.compare(readFileSync(abs), bytes) === 0) return;
  stale.push(relPath);
  if (!CHECK) {
    writeFileSync(abs, bytes);
    written.push(`${relPath} (${img.width}x${img.height})`);
  }
}

function main() {
  // Master source: the same logo the app renders in its header.
  const master = jpeg.decode(readFileSync(MASTER), {
    useTArray: true,
    formatAsRGBA: true,
  });
  const bg = sampleBackground(master); // light grey field of the logo

  // ---- Web manifest (PWA) -------------------------------------------
  // "any" purpose: the plain square logo. Full-bleed, no scaling — the logo
  // already has generous margins.
  emit("public/pwa-192x192.png", resize(master, 192, 192));
  emit("public/pwa-512x512.png", resize(master, 512, 512));
  // "maskable": content must survive the 80% safe circle → scale to 82%.
  emit("public/pwa-maskable-512x512.png", compose(master, 512, 0.82, bg));
  emit("public/pwa-maskable-192x192.png", compose(master, 192, 0.82, bg));

  // ---- iOS home screen ----------------------------------------------
  // Apple squircle-masks and expects no transparency; keep the mark clear of
  // the rounded corners.
  emit("public/apple-touch-icon.png", compose(master, 180, 0.9, bg));

  // ---- Android APK launcher -----------------------------------------
  // Replace the generic gold-cap art with the Rutex logo at every density.
  // Legacy square + round (pre-O launchers) and the adaptive foreground.
  const densities = {
    mdpi: [48, 108],
    hdpi: [72, 162],
    xhdpi: [96, 216],
    xxhdpi: [144, 324],
    xxxhdpi: [192, 432],
  };
  for (const [density, [launcher, foreground]] of Object.entries(densities)) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    // Legacy square: full-bleed logo.
    emit(`${dir}/ic_launcher.png`, compose(master, launcher, 1.0, bg));
    // Round: circle mask → shrink the mark so the wordmark never clips.
    emit(`${dir}/ic_launcher_round.png`, compose(master, launcher, 0.82, bg));
    // Adaptive foreground: opaque matching field with the mark inside the
    // ~66% safe zone, so any launcher mask (squircle/circle) shows the full
    // Rutex logo. The background layer colour matches the same field.
    emit(`${dir}/ic_launcher_foreground.png`, compose(master, foreground, 0.72, bg));
  }

  // Report the sampled colour so the adaptive background XML can match it.
  const hex = "#" + bg.slice(0, 3).map((c) => c.toString(16).padStart(2, "0")).join("");

  if (CHECK) {
    if (stale.length) {
      console.error("Icons out of date:\n" + stale.map((s) => `  ${s}`).join("\n"));
      process.exit(1);
    }
    console.log("Icons up to date.");
    return;
  }
  console.log(`Sampled logo background: ${hex}`);
  if (!written.length) {
    console.log("All icons already up to date.");
    return;
  }
  console.log("Wrote:\n" + written.map((s) => `  ${s}`).join("\n"));
}

main();
