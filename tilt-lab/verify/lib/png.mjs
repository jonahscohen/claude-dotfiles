// Minimal PNG decoder + pixel-stat helpers.
// Playwright screenshots are 8-bit RGBA, non-interlaced, zlib-deflated PNGs;
// that is the only shape we need to handle. We decode just enough to answer one
// functional question: "did the canvas actually paint something, or is it blank?"
import zlib from 'node:zlib';

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/** Decode an RGBA PNG buffer into { width, height, data } where data is Uint8Array RGBA. */
export function decodePng(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) throw new Error('not a PNG');
  }
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const start = off + 8;
    if (type === 'IHDR') {
      width = buf.readUInt32BE(start);
      height = buf.readUInt32BE(start + 4);
      bitDepth = buf[start + 8];
      colorType = buf[start + 9];
    } else if (type === 'IDAT') {
      idat.push(buf.subarray(start, start + len));
    } else if (type === 'IEND') {
      break;
    }
    off = start + len + 4; // skip data + CRC
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error(`unsupported color type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  const line = new Uint8Array(stride);
  const prev = new Uint8Array(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos++];
      const a = x >= channels ? line[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let val;
      switch (filter) {
        case 0: val = rawByte; break;
        case 1: val = rawByte + a; break;
        case 2: val = rawByte + b; break;
        case 3: val = rawByte + ((a + b) >> 1); break;
        case 4: val = rawByte + paeth(a, b, c); break;
        default: throw new Error(`bad filter ${filter}`);
      }
      line[x] = val & 0xff;
    }
    // expand the decoded scanline to RGBA
    for (let x = 0; x < width; x++) {
      const si = x * channels;
      const di = (y * width + x) * 4;
      if (channels === 4) {
        out[di] = line[si]; out[di + 1] = line[si + 1]; out[di + 2] = line[si + 2]; out[di + 3] = line[si + 3];
      } else if (channels === 3) {
        out[di] = line[si]; out[di + 1] = line[si + 1]; out[di + 2] = line[si + 2]; out[di + 3] = 255;
      } else {
        out[di] = out[di + 1] = out[di + 2] = line[si]; out[di + 3] = 255;
      }
    }
    prev.set(line);
  }
  return { width, height, data: out };
}

/**
 * Reduce an image to functional "is it blank?" stats. Samples a grid of pixels
 * (full decode can be large) and reports how many distinct colors appear plus
 * a luminance spread. A blank/solid canvas yields 1 distinct color and 0 spread.
 */
export function imageStats(img, sampleStep = 4) {
  const { width, height, data } = img;
  const colors = new Set();
  let min = 255;
  let max = 0;
  let count = 0;
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // quantize to 5 bits/channel so anti-aliasing noise doesn't inflate the count
      colors.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3));
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < min) min = lum;
      if (lum > max) max = lum;
      count++;
    }
  }
  return { distinctColors: colors.size, luminanceSpread: max - min, sampled: count };
}
