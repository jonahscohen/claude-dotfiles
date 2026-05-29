// Zero-dependency PNG generator for tilt-lab sample assets.
// Hand-builds real raster PNGs (RGBA, 8-bit) via node's zlib - no canvas/sharp.
// Each slot gets a DISTINCT photo-like procedural image so asset-requiring
// effects render real content (not their procedural fallbacks). Depth maps are
// grayscale (near = white, far = black) for the fake-3d parallax effect.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EFFECTS = resolve(HERE, '../runtime/effects');
const SIZE = 384;

// --- PNG encoding ---------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  // Prefix each scanline with filter byte 0 (none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- helpers --------------------------------------------------------------
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
function clamp8(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
// Generate an RGBA buffer from a per-pixel callback (nx, ny in [0,1]).
function render(fn) {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const nx = x / (SIZE - 1);
      const ny = y / (SIZE - 1);
      const [r, g, b] = fn(nx, ny, x, y);
      const i = (y * SIZE + x) * 4;
      buf[i] = clamp8(r);
      buf[i + 1] = clamp8(g);
      buf[i + 2] = clamp8(b);
      buf[i + 3] = 255;
    }
  }
  return buf;
}
function save(effect, file, rgba) {
  const dir = resolve(EFFECTS, effect, 'assets');
  mkdirSync(dir, { recursive: true });
  const png = encodePNG(SIZE, SIZE, rgba);
  const path = resolve(dir, file);
  writeFileSync(path, png);
  console.log(`${effect}/assets/${file}  ${(png.length / 1024).toFixed(1)}KB`);
}

// --- distinct photo-like scenes ------------------------------------------
// Sunset over hills: warm horizontal sky gradient + sun disc + rolling hills.
function sceneSunset(nx, ny) {
  const horizon = 0.62;
  if (ny < horizon) {
    const t = ny / horizon;
    const [r, g, b] = hsl2rgb(30 + t * 25, 0.85, 0.55 + t * 0.1);
    // sun disc
    const dx = nx - 0.5, dy = ny - 0.4;
    const d = Math.sqrt(dx * dx + dy * dy);
    const sun = Math.max(0, 1 - d / 0.14);
    return [r + sun * 90, g + sun * 70, b + sun * 30];
  }
  const hill = 0.62 + 0.05 * Math.sin(nx * Math.PI * 3);
  const shade = ny > hill ? 0.18 : 0.32;
  const [r, g, b] = hsl2rgb(265, 0.4, shade);
  return [r, g, b];
}
// Forest canopy: layered green sine bands with dappled light.
function sceneForest(nx, ny) {
  const band = Math.sin((ny * 4 + Math.sin(nx * 5) * 0.6) * Math.PI);
  const light = 0.5 * (Math.sin(nx * 7) * Math.sin(ny * 7)) + 0.5;
  const l = 0.22 + 0.18 * band + 0.12 * light;
  return hsl2rgb(110 + 30 * band, 0.55, l);
}
// Ocean waves: cool blue diagonal interference.
function sceneOcean(nx, ny) {
  const w = Math.sin((nx * 4 + ny * 2) * Math.PI) * Math.sin((nx * 1.5 - ny * 3) * Math.PI);
  const l = 0.4 + 0.22 * w;
  return hsl2rgb(200 + 25 * w, 0.7, l);
}
// Desert dunes: ochre layered ridges.
function sceneDesert(nx, ny) {
  const ridge = Math.sin((nx * 5 + Math.sin(ny * 4) * 1.2) * Math.PI);
  const l = 0.45 + 0.2 * ridge - 0.15 * ny;
  return hsl2rgb(38 + 10 * ridge, 0.6, Math.max(0.15, l));
}
// City lights at night: dark base with bright window grid.
function sceneCity(nx, ny) {
  const gx = Math.floor(nx * 14), gy = Math.floor(ny * 18);
  const lit = (gx * 7 + gy * 13) % 5 === 0 && ny > 0.25;
  if (lit) {
    const [r, g, b] = hsl2rgb(45, 0.9, 0.6);
    return [r, g, b];
  }
  const l = 0.05 + 0.08 * (ny);
  return hsl2rgb(230, 0.4, l);
}
// Abstract bloom: radial magenta-cyan plasma.
function sceneBloom(nx, ny) {
  const dx = nx - 0.5, dy = ny - 0.5;
  const d = Math.sqrt(dx * dx + dy * dy);
  const a = Math.atan2(dy, dx);
  const v = Math.sin(d * 7 - a * 2);
  return hsl2rgb(300 + 120 * v, 0.75, 0.4 + 0.2 * v);
}
// Portrait-ish subject: centered warm blob on cool ground (good dither subject).
function scenePortrait(nx, ny) {
  const dx = (nx - 0.5) * 1.1, dy = (ny - 0.45) * 1.3;
  const d = Math.sqrt(dx * dx + dy * dy);
  const subj = Math.max(0, 1 - d / 0.38);
  if (subj > 0) {
    const [r, g, b] = hsl2rgb(25, 0.5, 0.45 + 0.25 * subj);
    return [r, g, b];
  }
  return hsl2rgb(210, 0.35, 0.25 + 0.1 * ny);
}
// Grayscale radial depth map: near (center) = white, far (edges) = black.
function depthRadial(nx, ny) {
  const dx = (nx - 0.5) * 1.15, dy = (ny - 0.45) * 1.25;
  const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 0.72);
  const v = clamp8(255 * (1 - d));
  return [v, v, v];
}

// --- emit -----------------------------------------------------------------
// dithered-image[src] - high tonal range subject for visible dithering.
save('dithered-image', 'src.png', render(scenePortrait));

// fake-3d-image[colorSrc, depthSrc] - color scene + matching radial depth map.
save('fake-3d-image', 'color.png', render(sceneSunset));
save('fake-3d-image', 'depth.png', render(depthRadial));

// interactive-grid[image]
save('interactive-grid', 'image.png', render(sceneBloom));

// glass-slideshow[image0, image1] - two distinct slides.
save('glass-slideshow', 'image0.png', render(sceneOcean));
save('glass-slideshow', 'image1.png', render(sceneDesert));

// infinite-gallery[image0, image1, image2] - three distinct tiles.
save('infinite-gallery', 'image0.png', render(sceneForest));
save('infinite-gallery', 'image1.png', render(sceneCity));
save('infinite-gallery', 'image2.png', render(sceneBloom));

// water-ripple[image] - brush already present; add the displaced image.
save('water-ripple', 'image.png', render(sceneOcean));

console.log('done.');
