import type { Effect, EffectOpts } from '../../types';

/**
 * ASCII - Canvas2D post-process that resamples the composited canvas beneath it
 * into a grid of glyphs / tiles / dots / cubes chosen by per-cell luminance.
 *
 * REIMPLEMENTED (not verbatim): ascii-magic.com ships proprietary, all-rights-
 * reserved inline source, so this is a clean reimplementation of the standard
 * luminance-ramp ASCII algorithm it uses - Rec.601 luma, min/max auto-normalize,
 * Sobel edge boost, and charIdx = floor((1 - charScore) * pool.length). The
 * character ramps are conventional.
 *
 * Full render-mode set from the lane-9 recon (deep-link decode + source scan):
 * characters, block-chars, lines, diagonal, cross, diamond, mixed, dots, pixel,
 * lego, mosaic, braille, 3d, disco, shapes. `3d` and `shapes` own dedicated grid
 * passes; the rest share the per-cell luminance loop.
 *
 * As a `post` layer the runtime composites the layers beneath into this effect's
 * canvas before calling frame(); we snapshot that into an offscreen sampler, then
 * clear and redraw the ASCII art. Headless-safe: with no 2D context or no
 * getImageData support the effect goes dead and all methods no-op.
 */

const CHAR_PRESETS: Record<string, string> = {
  standard: '@#S08Xx+=-;:,.',
  detailed: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  minimal: '@#*+=-:. ',
  blocks: '█▓▒░ ',
};

// Per-style character pools (bright -> dark, trailing char is space = skip).
const STYLE_POOLS: Record<string, string> = {
  'block-chars': '█▓▒░ ',
  lines: '┃|│╏┆ ',
  diagonal: '╲╱/⁄ ',
  cross: '╋┼+× ',
  diamond: '⬥◆◇⋄ ',
};

const MIXED_POOLS = [
  STYLE_POOLS['block-chars'], STYLE_POOLS.lines, STYLE_POOLS.diagonal,
  STYLE_POOLS.cross, STYLE_POOLS.diamond,
];

interface AsciiState {
  renderMode: string;
  charSet: string; // preset name OR a custom literal glyph ramp (bright -> dark)
  fontSize: number;
  coverage: number;
  edgeEmphasis: number;
  darkThreshold: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  randomChars: boolean;
  charOpacity: number;
  mosaicShape: string;
  overlayColor: string;
  overlayOpacity: number;
  overlayBlend: string;
  // 3D isometric-cube knobs.
  shape3dCellSize: number;
  shape3dHSpacing: number;
  shape3dVSpacing: number;
  shape3dTopShade: number;
  shape3dLightShade: number;
  shape3dDarkShade: number;
  shape3dOutline: number;
  shape3dFlip: boolean;
  // Disco (mirror-tile / lens-flare) knobs.
  discoUniformity: number;
  discoSeed: number;
}

export function createAsciiEffect(): Effect {
  let dead = false;
  let canvasRef: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let offscreen: HTMLCanvasElement | null = null;
  let offCtx: CanvasRenderingContext2D | null = null;
  let w = 1;
  let h = 1;

  const s: AsciiState = {
    renderMode: 'characters',
    charSet: 'standard',
    fontSize: 11,
    coverage: 85,
    edgeEmphasis: 60,
    darkThreshold: 30,
    brightness: 0,
    contrast: 100,
    invert: false,
    randomChars: false,
    charOpacity: 100,
    mosaicShape: 'square',
    overlayColor: '#ff0000',
    overlayOpacity: 0,
    overlayBlend: 'multiply',
    shape3dCellSize: 12,
    shape3dHSpacing: 100,
    shape3dVSpacing: 100,
    shape3dTopShade: 135,
    shape3dLightShade: 100,
    shape3dDarkShade: 55,
    shape3dOutline: 0,
    shape3dFlip: false,
    discoUniformity: 80,
    discoSeed: 1,
  };

  const STR_KEYS = new Set(['renderMode', 'charSet', 'mosaicShape', 'overlayColor', 'overlayBlend']);
  const BOOL_KEYS = new Set(['invert', 'randomChars', 'shape3dFlip']);

  function readParams(params: Record<string, unknown>) {
    for (const key of Object.keys(s) as (keyof AsciiState)[]) {
      const v = params[key];
      if (v == null) continue;
      if (BOOL_KEYS.has(key)) {
        (s as unknown as Record<string, unknown>)[key] = Boolean(v);
      } else if (STR_KEYS.has(key)) {
        (s as unknown as Record<string, unknown>)[key] = String(v);
      } else {
        (s as unknown as Record<string, unknown>)[key] = Number(v);
      }
    }
  }

  function lumaAt(d: Uint8ClampedArray, i: number): number {
    return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }

  function clamp255(n: number): number {
    return n < 0 ? 0 : n > 255 ? 255 : n;
  }

  function shade(r: number, g: number, b: number, factor: number): string {
    return `rgb(${clamp255(r * factor) | 0},${clamp255(g * factor) | 0},${clamp255(b * factor) | 0})`;
  }

  // Stable spatial hash -> 0..1 (deterministic; no Math.random so disco repeats).
  function hash01(a: number, b: number, seed: number): number {
    const hsh = ((a * 73856093) ^ (b * 19349663) ^ (seed * 83492791)) >>> 0;
    return (hsh % 100000) / 100000;
  }

  // Sobel edge magnitude map (normalized 0..1) over the sampled buffer.
  function computeEdges(data: Uint8ClampedArray, iw: number, ih: number): Float32Array {
    const gray = new Float32Array(iw * ih);
    for (let i = 0; i < iw * ih; i++) gray[i] = lumaAt(data, i * 4);
    const edges = new Float32Array(iw * ih);
    let maxEdge = 0;
    for (let y = 1; y < ih - 1; y++) {
      for (let x = 1; x < iw - 1; x++) {
        const idx = y * iw + x;
        const gx = -gray[(y - 1) * iw + (x - 1)] + gray[(y - 1) * iw + (x + 1)]
          - 2 * gray[y * iw + (x - 1)] + 2 * gray[y * iw + (x + 1)]
          - gray[(y + 1) * iw + (x - 1)] + gray[(y + 1) * iw + (x + 1)];
        const gy = -gray[(y - 1) * iw + (x - 1)] - 2 * gray[(y - 1) * iw + x] - gray[(y - 1) * iw + (x + 1)]
          + gray[(y + 1) * iw + (x - 1)] + 2 * gray[(y + 1) * iw + x] + gray[(y + 1) * iw + (x + 1)];
        const mag = Math.sqrt(gx * gx + gy * gy);
        edges[idx] = mag;
        if (mag > maxEdge) maxEdge = mag;
      }
    }
    if (maxEdge > 0) for (let i = 0; i < edges.length; i++) edges[i] /= maxEdge;
    return edges;
  }

  function activePoolFor(col: number, row: number): string {
    switch (s.renderMode) {
      case 'block-chars':
      case 'lines':
      case 'diagonal':
      case 'cross':
      case 'diamond':
        return STYLE_POOLS[s.renderMode];
      case 'mixed': {
        const hsh = ((col * 73856093) ^ (row * 19349663)) >>> 0;
        return MIXED_POOLS[hsh % MIXED_POOLS.length];
      }
      default:
        // Known preset, else treat charSet as a literal custom ramp (>1 char).
        return CHAR_PRESETS[s.charSet]
          ?? (typeof s.charSet === 'string' && s.charSet.length > 1 ? s.charSet : CHAR_PRESETS.standard);
    }
  }

  function brailleChar(d: Uint8ClampedArray, iw: number, ih: number, cx: number, cy: number, cw: number, ch: number, thresh: number): string {
    // 2x4 dot grid -> braille code point U+2800 + bit pattern.
    const bits = [0x1, 0x2, 0x4, 0x40, 0x8, 0x10, 0x20, 0x80]; // dot order (col,row)
    let code = 0;
    let k = 0;
    for (let dc = 0; dc < 2; dc++) {
      for (let dr = 0; dr < 4; dr++) {
        const sx = Math.min(iw - 1, Math.floor(cx + ((dc + 0.5) / 2) * cw));
        const sy = Math.min(ih - 1, Math.floor(cy + ((dr + 0.5) / 4) * ch));
        const l = lumaAt(d, (sy * iw + sx) * 4);
        if (l > thresh) code |= bits[k];
        k++;
      }
    }
    return String.fromCharCode(0x2800 + code);
  }

  // Isometric cube at center (cx, cy) with radius r (own pass: `3d` mode).
  function drawIsoCube(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, rr: number, gg: number, bb: number) {
    const top = s.shape3dTopShade / 100;
    const light = s.shape3dLightShade / 100;
    const dark = s.shape3dDarkShade / 100;
    const hy = r * 0.5; // iso half-height of a face edge
    // Top diamond.
    c.fillStyle = shade(rr, gg, bb, top);
    c.beginPath();
    c.moveTo(cx, cy - r);
    c.lineTo(cx + r, cy - hy);
    c.lineTo(cx, cy);
    c.lineTo(cx - r, cy - hy);
    c.closePath();
    c.fill();
    if (s.shape3dOutline > 0) { c.lineWidth = s.shape3dOutline; c.strokeStyle = shade(rr, gg, bb, 0.3); c.stroke(); }
    // Left face.
    c.fillStyle = shade(rr, gg, bb, light);
    c.beginPath();
    c.moveTo(cx - r, cy - hy);
    c.lineTo(cx, cy);
    c.lineTo(cx, cy + r);
    c.lineTo(cx - r, cy + hy);
    c.closePath();
    c.fill();
    if (s.shape3dOutline > 0) c.stroke();
    // Right face.
    c.fillStyle = shade(rr, gg, bb, dark);
    c.beginPath();
    c.moveTo(cx + r, cy - hy);
    c.lineTo(cx, cy);
    c.lineTo(cx, cy + r);
    c.lineTo(cx + r, cy + hy);
    c.closePath();
    c.fill();
    if (s.shape3dOutline > 0) c.stroke();
  }

  // Hex-tessellated isometric cubes (own pass for `3d`).
  function draw3dPass(c: CanvasRenderingContext2D, px: Uint8ClampedArray, iw: number, ih: number, minLum: number, lumRange: number, coverageCut: number, darkCut: number) {
    const cell = Math.max(4, s.shape3dCellSize);
    const hStep = Math.max(2, cell * (s.shape3dHSpacing / 100));
    const vStep = Math.max(2, cell * 0.5 * (s.shape3dVSpacing / 100));
    const cols = Math.ceil(iw / hStep) + 1;
    const rows = Math.ceil(ih / vStep) + 1;
    for (let row = 0; row < rows; row++) {
      const ox = (row % 2) * hStep * 0.5; // hex offset on alternate rows
      for (let col = 0; col < cols; col++) {
        const cx = col * hStep + ox;
        const cy = row * vStep;
        const sx = Math.min(iw - 1, Math.max(0, Math.floor(cx)));
        const sy = Math.min(ih - 1, Math.max(0, Math.floor(cy)));
        const pi = (sy * iw + sx) * 4;
        const rawLum = lumaAt(px, pi);
        if (rawLum < darkCut) continue;
        let normLum = Math.max(0, Math.min(1, (rawLum - minLum) / lumRange));
        if (s.invert) normLum = 1 - normLum;
        if (normLum < coverageCut) continue;
        const factor = s.shape3dFlip ? 1 - normLum : normLum;
        const r = (cell * 0.5) * (0.35 + 0.65 * factor);
        if (r < 0.5) continue;
        drawIsoCube(c, cx, cy, r, px[pi], px[pi + 1], px[pi + 2]);
      }
    }
  }

  // Posterized jittered primitives (own pass for `shapes`).
  function drawShapesPass(c: CanvasRenderingContext2D, px: Uint8ClampedArray, iw: number, ih: number, cw: number, ch: number, cols: number, rows: number, minLum: number, lumRange: number, coverageCut: number, darkCut: number) {
    const levels = 4; // posterize bands
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sx = Math.min(iw - 1, Math.floor((col + 0.5) * cw));
        const sy = Math.min(ih - 1, Math.floor((row + 0.5) * ch));
        const pi = (sy * iw + sx) * 4;
        const rawLum = lumaAt(px, pi);
        if (rawLum < darkCut) continue;
        let normLum = Math.max(0, Math.min(1, (rawLum - minLum) / lumRange));
        if (s.invert) normLum = 1 - normLum;
        if (normLum < coverageCut) continue;
        const q = Math.round(normLum * (levels - 1)) / (levels - 1); // posterize
        const r = clamp255(Math.round((px[pi] / 255) * levels) / levels * 255);
        const g = clamp255(Math.round((px[pi + 1] / 255) * levels) / levels * 255);
        const b = clamp255(Math.round((px[pi + 2] / 255) * levels) / levels * 255);
        // Positional jitter, deterministic per cell.
        const jx = (hash01(col, row, 7) - 0.5) * cw * 0.4;
        const jy = (hash01(row, col, 11) - 0.5) * ch * 0.4;
        const ccx = col * cw + cw / 2 + jx;
        const ccy = row * ch + ch / 2 + jy;
        const size = Math.min(cw, ch) * (0.3 + 0.7 * q);
        c.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        const kind = Math.floor(hash01(col, row, 3) * 4) % 4;
        c.beginPath();
        if (kind === 0) {
          c.arc(ccx, ccy, size / 2, 0, Math.PI * 2);
        } else if (kind === 1) {
          c.rect(ccx - size / 2, ccy - size / 2, size, size);
        } else if (kind === 2) {
          c.moveTo(ccx, ccy - size / 2);
          c.lineTo(ccx + size / 2, ccy + size / 2);
          c.lineTo(ccx - size / 2, ccy + size / 2);
          c.closePath();
        } else {
          c.moveTo(ccx, ccy - size / 2);
          c.lineTo(ccx + size / 2, ccy);
          c.lineTo(ccx, ccy + size / 2);
          c.lineTo(ccx - size / 2, ccy);
          c.closePath();
        }
        c.fill();
      }
    }
  }

  return {
    init(canvas: HTMLCanvasElement, opts: EffectOpts) {
      readParams(opts.params);
      canvasRef = canvas;
      ctx = canvas.getContext('2d');
      if (!ctx || typeof ctx.getImageData !== 'function' || typeof ctx.fillText !== 'function') {
        dead = true;
        return;
      }
      offscreen = document.createElement('canvas');
      offCtx = offscreen.getContext('2d');
      if (!offCtx) {
        dead = true;
      }
    },
    frame(_t: number) {
      if (dead || !ctx || !canvasRef || !offscreen || !offCtx) return;
      const cw = Math.max(2, Math.floor(s.fontSize * 0.6));
      const ch = Math.max(2, Math.floor(s.fontSize));
      const iw = Math.max(1, Math.floor(w));
      const ih = Math.max(1, Math.floor(h));

      // Snapshot the composited-beneath content (currently on our canvas) into the
      // offscreen sampler, then read its pixels.
      offscreen.width = iw;
      offscreen.height = ih;
      let img: ImageData;
      try {
        offCtx.drawImage(canvasRef, 0, 0, iw, ih);
        img = offCtx.getImageData(0, 0, iw, ih);
      } catch {
        return; // tainted or unsupported (headless) -> skip this frame
      }
      const px = img.data;

      const cols = Math.max(1, Math.floor(iw / cw));
      const rows = Math.max(1, Math.floor(ih / ch));
      const edges = s.edgeEmphasis > 0 ? computeEdges(px, iw, ih) : null;

      // Luminance auto-normalize prepass over a coarse grid.
      let minLum = 255;
      let maxLum = 0;
      const lumStep = Math.max(1, Math.floor(Math.min(rows, cols) / 40));
      for (let r0 = 0; r0 < rows; r0 += lumStep) {
        for (let c0 = 0; c0 < cols; c0 += lumStep) {
          const sx = Math.min(iw - 1, Math.floor((c0 + 0.5) * cw));
          const sy = Math.min(ih - 1, Math.floor((r0 + 0.5) * ch));
          const l = lumaAt(px, (sy * iw + sx) * 4);
          if (l < minLum) minLum = l;
          if (l > maxLum) maxLum = l;
        }
      }
      const lumRange = maxLum - minLum || 1;

      const edgeWeight = s.edgeEmphasis / 100;
      const brightnessAdj = s.brightness / 100;
      const contrastFactor = (259 * (s.contrast + 255)) / (255 * (259 - s.contrast));
      const alpha = Math.max(0, Math.min(1, s.charOpacity / 100));
      const darkCut = (s.darkThreshold / 100) * 255;
      const coverageCut = (100 - s.coverage) / 100; // higher coverage -> lower cut

      ctx.clearRect(0, 0, iw, ih);

      // Dedicated passes for modes that do not share the per-cell glyph loop.
      if (s.renderMode === '3d') {
        draw3dPass(ctx, px, iw, ih, minLum, lumRange, coverageCut, darkCut);
      } else if (s.renderMode === 'shapes') {
        drawShapesPass(ctx, px, iw, ih, cw, ch, cols, rows, minLum, lumRange, coverageCut, darkCut);
      } else {
        ctx.font = `${s.fontSize}px "Courier New", Courier, monospace`;
        ctx.textBaseline = 'top';

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const sx = Math.min(iw - 1, Math.floor((col + 0.5) * cw));
            const sy = Math.min(ih - 1, Math.floor((row + 0.5) * ch));
            const pi = (sy * iw + sx) * 4;
            const rawR = px[pi];
            const rawG = px[pi + 1];
            const rawB = px[pi + 2];
            const rawLum = 0.299 * rawR + 0.587 * rawG + 0.114 * rawB;

            if (rawLum < darkCut) continue;

            let normLum = Math.max(0, Math.min(1, (rawLum - minLum) / lumRange));
            if (s.invert) normLum = 1 - normLum;

            const r = Math.max(0, Math.min(255, contrastFactor * (rawR - 128) + 128 + brightnessAdj * 255));
            const g = Math.max(0, Math.min(255, contrastFactor * (rawG - 128) + 128 + brightnessAdj * 255));
            const b = Math.max(0, Math.min(255, contrastFactor * (rawB - 128) + 128 + brightnessAdj * 255));

            const edgeVal = edges ? edges[sy * iw + sx] : 0;
            const amplifiedEdge = Math.pow(edgeVal, 0.3);
            const edgeBoost = amplifiedEdge * edgeWeight * 4.0;

            let charScore = normLum + edgeBoost * 0.15;
            charScore = Math.max(0, Math.min(1, charScore));

            if (charScore < coverageCut) continue;

            const fill = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
            const cellX = col * cw;
            const cellY = row * ch;

            if (s.renderMode === 'dots') {
              const radius = (cw * 0.5) * charScore;
              if (radius <= 0.1) continue;
              ctx.fillStyle = fill;
              ctx.beginPath();
              ctx.arc(cellX + cw / 2, cellY + ch / 2, radius, 0, Math.PI * 2);
              ctx.fill();
            } else if (s.renderMode === 'pixel' || s.renderMode === 'mosaic') {
              ctx.fillStyle = fill;
              if (s.renderMode === 'mosaic' && s.mosaicShape === 'circle') {
                ctx.beginPath();
                ctx.arc(cellX + cw / 2, cellY + ch / 2, Math.min(cw, ch) / 2, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.fillRect(cellX, cellY, cw, ch);
              }
            } else if (s.renderMode === 'lego') {
              // Colored tile + raised circular stud (highlight + shadow).
              ctx.fillStyle = fill;
              ctx.fillRect(cellX, cellY, cw, ch);
              const studR = Math.min(cw, ch) * 0.32;
              const ccx = cellX + cw / 2;
              const ccy = cellY + ch / 2;
              ctx.fillStyle = shade(r, g, b, 0.7); // shadow ring
              ctx.beginPath();
              ctx.arc(ccx + studR * 0.12, ccy + studR * 0.12, studR, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = shade(r, g, b, 1.3); // raised stud highlight
              ctx.beginPath();
              ctx.arc(ccx - studR * 0.1, ccy - studR * 0.1, studR * 0.9, 0, Math.PI * 2);
              ctx.fill();
            } else if (s.renderMode === 'disco') {
              // Mirror-tile / lens-flare: seeded glare boosts tile brightness,
              // mirrored quadrant pattern; uniformity blends glare toward flat.
              const uniform = Math.max(0, Math.min(1, s.discoUniformity / 100));
              const glareRand = hash01(col, row, Math.round(s.discoSeed));
              const glare = uniform * 1 + (1 - uniform) * glareRand;
              const mirror = ((col & 1) ^ (row & 1)) ? 1.15 : 0.85; // mirrored tiling
              const f = 0.6 + 0.8 * glare * mirror;
              ctx.fillStyle = shade(r, g, b, f);
              ctx.fillRect(cellX, cellY, cw, ch);
              // Lens-flare core on the brightest cells.
              if (charScore * glare > 0.6) {
                ctx.fillStyle = `rgba(255,255,255,${0.25 * glare})`;
                ctx.beginPath();
                ctx.arc(cellX + cw / 2, cellY + ch / 2, Math.min(cw, ch) * 0.35 * glare, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (s.renderMode === 'braille') {
              const char = brailleChar(px, iw, ih, cellX, cellY, cw, ch, minLum + lumRange * 0.5);
              if (char === '⠀') continue;
              ctx.fillStyle = fill;
              ctx.fillText(char, cellX, cellY);
            } else {
              const pool = activePoolFor(col, row);
              let char: string;
              if (s.randomChars) {
                char = pool[Math.floor(Math.random() * pool.length)];
              } else {
                const idx = Math.min(pool.length - 1, Math.floor((1 - charScore) * pool.length));
                char = pool[idx];
              }
              if (char === ' ') continue;
              ctx.fillStyle = fill;
              ctx.fillText(char, cellX, cellY);
            }
          }
        }
      }

      // Optional overlay tint.
      if (s.overlayOpacity > 0) {
        const prevOp = ctx.globalCompositeOperation;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalCompositeOperation = s.overlayBlend as GlobalCompositeOperation;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.overlayOpacity / 100));
        ctx.fillStyle = s.overlayColor;
        ctx.fillRect(0, 0, iw, ih);
        ctx.globalCompositeOperation = prevOp;
        ctx.globalAlpha = prevAlpha;
      }
    },
    resize(nw: number, nh: number) {
      w = Math.max(1, Math.floor(nw));
      h = Math.max(1, Math.floor(nh));
      if (dead || !canvasRef) return;
      canvasRef.width = w;
      canvasRef.height = h;
    },
    setParam(key: string, value: unknown) {
      if (key in s) {
        const obj: Record<string, unknown> = { [key]: value };
        readParams(obj);
      }
    },
    dispose() {
      ctx = null;
      offCtx = null;
      offscreen = null;
      canvasRef = null;
      dead = true;
    },
  };
}
