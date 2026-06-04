#!/usr/bin/env node
/**
 * Generates PWA icons for mkxa from an in-script SVG (no external assets).
 *
 * Outputs:
 *   public/icons/icon-192.png            (rounded, full-bleed look — for browsers)
 *   public/icons/icon-512.png            (rounded, full-bleed look — for browsers)
 *   public/icons/icon-maskable-512.png   (full-bleed with 10% safe-area padding — for Android adaptive icons)
 *   public/icons/apple-touch-icon.png    (180×180, rounded, full-bleed — iOS home screen)
 *
 * Run once:  node scripts/generate-icons.mjs
 *
 * Palette:
 *   ink   #1b1d1f   background
 *   gold  #fed282   wordmark + heart
 *   cream #f0eee9   secondary subtle
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..', 'public', 'icons');

const INK = '#1b1d1f';
const GOLD = '#fed282';
const CREAM = '#f0eee9';

/**
 * Build an SVG icon.
 *
 * @param {object} opts
 * @param {number} opts.size      - final pixel size (square)
 * @param {boolean} opts.maskable - if true, paint full-bleed bg + leave 10% safe area around content
 * @param {boolean} opts.rounded  - if true, clip to rounded square (for non-maskable PNGs)
 */
function buildSvg({ size, maskable, rounded }) {
  // For non-maskable rounded icons: corner radius ~22% (iOS / Android style)
  const radius = rounded ? Math.round(size * 0.22) : 0;

  // Content scale: maskable shrinks content into the inner 80% (safe area)
  // so adaptive icon crops don't chop the wordmark.
  const contentScale = maskable ? 0.78 : 0.92;
  const contentSize = size * contentScale;
  const contentX = (size - contentSize) / 2;
  const contentY = (size - contentSize) / 2;

  // Wordmark layout — done in SVG with viewBox 0 0 100 100 inside the content box.
  // Heart sits centred above the wordmark.
  // Font: sans-serif fallback chain (sharp's librsvg doesn't load custom fonts).
  // We make the wordmark heavy and tracked-tight to look intentional.
  const fontFamily = "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

  // Heart path (centered around 0,0 in a 100x100 box, scaled down).
  // Standard two-arc + downward tip heart.
  const heartPath = 'M0,-2 C -3,-7 -10,-7 -10,-1 C -10,5 0,11 0,11 C 0,11 10,5 10,-1 C 10,-7 3,-7 0,-2 Z';

  // Maskable variant: solid INK to the very edge (Android crops to circle/squircle).
  // Non-maskable rounded: same INK with rounded corners (clipPath).
  const clip = rounded
    ? `<clipPath id="rounded"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></clipPath>`
    : '';

  const bgGroup = rounded
    ? `<g clip-path="url(#rounded)"><rect width="${size}" height="${size}" fill="${INK}"/></g>`
    : `<rect width="${size}" height="${size}" fill="${INK}"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    ${clip}
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#26282a"/>
      <stop offset="100%" stop-color="${INK}"/>
    </linearGradient>
  </defs>
  ${bgGroup.replace(`fill="${INK}"`, 'fill="url(#glow)"')}
  <g transform="translate(${contentX} ${contentY})">
    <svg width="${contentSize}" height="${contentSize}" viewBox="0 0 100 100">
      <!-- heart, above wordmark -->
      <g transform="translate(50 32) scale(1.55)" fill="${GOLD}">
        <path d="${heartPath}"/>
      </g>
      <!-- wordmark "mkxa" -->
      <text x="50" y="76"
            text-anchor="middle"
            font-family="${fontFamily}"
            font-size="34"
            font-weight="900"
            letter-spacing="-2"
            fill="${GOLD}">mkxa</text>
      <!-- subtle underscore -->
      <rect x="32" y="84" width="36" height="2.2" rx="1.1" fill="${CREAM}" opacity="0.45"/>
    </svg>
  </g>
</svg>`;
}

async function renderIcon({ size, maskable, rounded, filename }) {
  const svg = buildSvg({ size, maskable, rounded });
  const buf = Buffer.from(svg);
  const out = path.join(outDir, filename);
  await sharp(buf, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✔ ${filename} (${size}x${size}${maskable ? ', maskable' : rounded ? ', rounded' : ''})`);
}

async function main() {
  await mkdir(outDir, { recursive: true });

  await renderIcon({ size: 192, maskable: false, rounded: true,  filename: 'icon-192.png' });
  await renderIcon({ size: 512, maskable: false, rounded: true,  filename: 'icon-512.png' });
  await renderIcon({ size: 512, maskable: true,  rounded: false, filename: 'icon-maskable-512.png' });
  await renderIcon({ size: 180, maskable: false, rounded: true,  filename: 'apple-touch-icon.png' });

  // Also drop a monochrome SVG sibling for browsers that want it.
  const mono = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g transform="translate(50 36) scale(1.6)" fill="currentColor">
    <path d="M0,-2 C -3,-7 -10,-7 -10,-1 C -10,5 0,11 0,11 C 0,11 10,5 10,-1 C 10,-7 3,-7 0,-2 Z"/>
  </g>
  <text x="50" y="78" text-anchor="middle"
        font-family="system-ui, -apple-system, Arial, sans-serif"
        font-size="32" font-weight="900" letter-spacing="-2"
        fill="currentColor">mkxa</text>
</svg>`;
  await writeFile(path.join(outDir, 'icon-monochrome.svg'), mono, 'utf8');
  console.log('✔ icon-monochrome.svg');

  console.log('\nAll icons written to public/icons/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
