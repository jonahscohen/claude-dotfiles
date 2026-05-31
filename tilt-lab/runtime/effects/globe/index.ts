import createGlobe from 'cobe';
import type { Effect, EffectOpts } from '../../types';

/**
 * Globe (cobe) - an interactive dotted WebGL globe by Shu Ding.
 *
 * Loop adaptation: the installed cobe (v0.6.5) is the phenomenon-based v1 API.
 * `createGlobe` returns a phenomenon Renderer that owns an internal
 * requestAnimationFrame loop driven by `onRender`. tilt-lab effects must NOT
 * own a RAF, so we call `renderer.toggle(false)` right after construction to
 * stop the internal loop, then drive a single `renderer.render()` pass from
 * `frame(t)`. Rotation is advanced from the external clock and pushed into the
 * uniforms through cobe's `onRender` bridge.
 *
 * Control surface (parity rebuild): exposes cobe's full COBEOptions set
 * (phi/theta/dark/diffuse/mapSamples/mapBrightness/mapBaseBrightness/opacity/
 * scale/offset/baseColor/markerColor/glowColor) PLUS:
 *   - a PRESET library reproducing the documented cobe demo looks
 *     (the "dozens of configurations" from cobe.vercel.app),
 *   - selectable MARKER SETS (None / cities / capitals / continents / ...),
 *   - a map-LABEL overlay (an ADDITION beyond stock cobe - cobe ships no text
 *     labels; we draw them on a 2D overlay canvas projected from the same
 *     phi/theta the globe spins by).
 */

type GlobeHandle = ReturnType<typeof createGlobe>;

/** A cobe marker: a lat/lng dot drawn on the globe surface. */
interface GlobeMarker {
  location: [number, number];
  size: number;
  /** Optional place name used by the label overlay (tilt-lab addition). */
  label?: string;
}

// ---------------------------------------------------------------------------
// PRESET LIBRARY - reproduces the documented cobe demo "looks". Each preset is
// a partial set of COBEOptions-shaped values applied on top of the live state.
// Colors are hex (converted to cobe's [r,g,b] 0..1 triplets at apply time).
// ---------------------------------------------------------------------------
interface GlobePreset {
  baseColor: string;
  markerColor: string;
  glowColor: string;
  dark: number;
  diffuse: number;
  mapBrightness: number;
  mapBaseBrightness: number;
  theta: number;
  scale: number;
  opacity: number;
}

const PRESETS: Record<string, GlobePreset> = {
  // cobe's TRUE library defaults (the createGlobe destructure defaults), not the
  // README demo overrides: white base, orange markers, dark 0, diffuse 1,
  // mapBrightness 1. This is the shipped default-selected preset, so the globe
  // boots to cobe's stock look. (mapSamples 10000 is set via the manifest
  // default since cobe bakes it at creation and it is not a live preset field.)
  'Cobe Default': { baseColor: '#ffffff', markerColor: '#ff8000', glowColor: '#ffffff', dark: 0, diffuse: 1, mapBrightness: 1, mapBaseBrightness: 0, theta: 0.3, scale: 1, opacity: 1 },
  'Day / Light': { baseColor: '#e6e6e6', markerColor: '#1f6feb', glowColor: '#ffffff', dark: 0, diffuse: 3, mapBrightness: 9, mapBaseBrightness: 0.12, theta: 0.25, scale: 1, opacity: 1 },
  'Inverted Dark': { baseColor: '#1a1a2e', markerColor: '#00d4ff', glowColor: '#4361ee', dark: 1, diffuse: 3, mapBrightness: 1.2, mapBaseBrightness: 0, theta: 0.3, scale: 1, opacity: 1 },
  'Tech Blue': { baseColor: '#0f172a', markerColor: '#60a5fa', glowColor: '#93c5fd', dark: 1, diffuse: 1.4, mapBrightness: 6, mapBaseBrightness: 0, theta: 0.35, scale: 1, opacity: 1 },
  Emerald: { baseColor: '#0b3d2e', markerColor: '#34d399', glowColor: '#6ee7b7', dark: 1, diffuse: 1.5, mapBrightness: 5, mapBaseBrightness: 0, theta: 0.3, scale: 1, opacity: 1 },
  Ocean: { baseColor: '#0a2540', markerColor: '#38bdf8', glowColor: '#7dd3fc', dark: 1, diffuse: 1.6, mapBrightness: 5, mapBaseBrightness: 0, theta: 0.3, scale: 1, opacity: 1 },
  Aurora: { baseColor: '#10231f', markerColor: '#a3e635', glowColor: '#22d3ee', dark: 1, diffuse: 2.2, mapBrightness: 4, mapBaseBrightness: 0, theta: 0.4, scale: 1, opacity: 1 },
  Magma: { baseColor: '#2b0a0a', markerColor: '#ff4422', glowColor: '#ff8855', dark: 1, diffuse: 2, mapBrightness: 4, mapBaseBrightness: 0, theta: 0.3, scale: 1, opacity: 1 },
  Sunset: { baseColor: '#2a0e2e', markerColor: '#fb7185', glowColor: '#fbbf24', dark: 1, diffuse: 2, mapBrightness: 4, mapBaseBrightness: 0, theta: 0.35, scale: 1, opacity: 1 },
  Gold: { baseColor: '#3a2e05', markerColor: '#fcd34d', glowColor: '#fde68a', dark: 1, diffuse: 1.8, mapBrightness: 5, mapBaseBrightness: 0, theta: 0.3, scale: 1, opacity: 1 },
  'Neon Night': { baseColor: '#0d0221', markerColor: '#f000ff', glowColor: '#00f0ff', dark: 1, diffuse: 2.5, mapBrightness: 3, mapBaseBrightness: 0, theta: 0.4, scale: 1, opacity: 1 },
  'Mono Wire': { baseColor: '#000000', markerColor: '#ffffff', glowColor: '#888888', dark: 1, diffuse: 0.6, mapBrightness: 8, mapBaseBrightness: 0, theta: 0.25, scale: 1, opacity: 1 },
};

// ---------------------------------------------------------------------------
// MARKER SETS - curated lat/long dot collections, selectable from a dropdown so
// the user gets marker variety out of the box (parity with cobe's demo marker
// sets). Each marker carries an optional `label` for the overlay.
// ---------------------------------------------------------------------------
const MARKER_SETS: Record<string, GlobeMarker[]> = {
  None: [],
  'SF + NYC (default)': [
    { location: [37.7595, -122.4367], size: 0.03, label: 'San Francisco' },
    { location: [40.7128, -74.006], size: 0.1, label: 'New York' },
  ],
  'World Capitals': [
    { location: [51.5074, -0.1278], size: 0.06, label: 'London' },
    { location: [40.7128, -74.006], size: 0.06, label: 'Washington' },
    { location: [35.6895, 139.6917], size: 0.06, label: 'Tokyo' },
    { location: [48.8566, 2.3522], size: 0.05, label: 'Paris' },
    { location: [55.7558, 37.6173], size: 0.05, label: 'Moscow' },
    { location: [39.9042, 116.4074], size: 0.06, label: 'Beijing' },
    { location: [28.6139, 77.209], size: 0.06, label: 'Delhi' },
    { location: [-15.7939, -47.8828], size: 0.05, label: 'Brasilia' },
    { location: [-35.2809, 149.13], size: 0.04, label: 'Canberra' },
    { location: [30.0444, 31.2357], size: 0.05, label: 'Cairo' },
  ],
  'Tech Hubs': [
    { location: [37.7749, -122.4194], size: 0.08, label: 'San Francisco' },
    { location: [47.6062, -122.3321], size: 0.05, label: 'Seattle' },
    { location: [30.2672, -97.7431], size: 0.05, label: 'Austin' },
    { location: [40.7128, -74.006], size: 0.06, label: 'New York' },
    { location: [51.5074, -0.1278], size: 0.05, label: 'London' },
    { location: [52.52, 13.405], size: 0.05, label: 'Berlin' },
    { location: [12.9716, 77.5946], size: 0.06, label: 'Bangalore' },
    { location: [1.3521, 103.8198], size: 0.05, label: 'Singapore' },
    { location: [35.6895, 139.6917], size: 0.05, label: 'Tokyo' },
    { location: [32.0853, 34.7818], size: 0.04, label: 'Tel Aviv' },
  ],
  Continents: [
    { location: [40, -100], size: 0.1, label: 'N. America' },
    { location: [-15, -60], size: 0.1, label: 'S. America' },
    { location: [50, 10], size: 0.09, label: 'Europe' },
    { location: [2, 20], size: 0.1, label: 'Africa' },
    { location: [45, 90], size: 0.11, label: 'Asia' },
    { location: [-25, 135], size: 0.08, label: 'Oceania' },
  ],
  Americas: [
    { location: [40.7128, -74.006], size: 0.07, label: 'New York' },
    { location: [34.0522, -118.2437], size: 0.06, label: 'Los Angeles' },
    { location: [19.4326, -99.1332], size: 0.06, label: 'Mexico City' },
    { location: [4.711, -74.0721], size: 0.05, label: 'Bogota' },
    { location: [-12.0464, -77.0428], size: 0.05, label: 'Lima' },
    { location: [-23.5505, -46.6333], size: 0.06, label: 'Sao Paulo' },
    { location: [-34.6037, -58.3816], size: 0.05, label: 'Buenos Aires' },
    { location: [43.6532, -79.3832], size: 0.05, label: 'Toronto' },
  ],
  Europe: [
    { location: [51.5074, -0.1278], size: 0.06, label: 'London' },
    { location: [48.8566, 2.3522], size: 0.06, label: 'Paris' },
    { location: [52.52, 13.405], size: 0.06, label: 'Berlin' },
    { location: [40.4168, -3.7038], size: 0.05, label: 'Madrid' },
    { location: [41.9028, 12.4964], size: 0.05, label: 'Rome' },
    { location: [52.3676, 4.9041], size: 0.05, label: 'Amsterdam' },
    { location: [59.3293, 18.0686], size: 0.05, label: 'Stockholm' },
    { location: [52.2297, 21.0122], size: 0.05, label: 'Warsaw' },
  ],
  'Asia Pacific': [
    { location: [35.6895, 139.6917], size: 0.07, label: 'Tokyo' },
    { location: [37.5665, 126.978], size: 0.06, label: 'Seoul' },
    { location: [39.9042, 116.4074], size: 0.06, label: 'Beijing' },
    { location: [31.2304, 121.4737], size: 0.06, label: 'Shanghai' },
    { location: [1.3521, 103.8198], size: 0.05, label: 'Singapore' },
    { location: [-33.8688, 151.2093], size: 0.06, label: 'Sydney' },
    { location: [19.076, 72.8777], size: 0.06, label: 'Mumbai' },
    { location: [-6.2088, 106.8456], size: 0.05, label: 'Jakarta' },
  ],
};

const DEFAULT_MARKERS: GlobeMarker[] = MARKER_SETS['SF + NYC (default)'];

// Label-projection orientation constants. cobe's exact phi/longitude sign is
// matched empirically against the rendered globe; if labels read mirrored or
// rotated after visual QA, flip these (one-line fix, isolated here on purpose).
const LON_SIGN = 1;
const PHI_SIGN = 1;

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createGlobeEffect(): Effect {
  let globe: GlobeHandle | null = null;
  let dead = false;
  let dpr = 1;

  // Rotation state (driven from the external clock, not cobe's RAF).
  let speed = 0.3; // radians/second of auto-rotation
  let autoRotate = true;
  let basePhi = 0;
  let clockPhi = 0;
  let theta = 0.3;

  // cobe `offset` ([x, y] in backing-store pixels, default [0, 0]) and markers.
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let markers: GlobeMarker[] = DEFAULT_MARKERS;

  // Label overlay state (tilt-lab addition).
  let showLabels = false;
  let labelColor = '#ffffff';
  let labelSize = 11;
  let overlay: HTMLCanvasElement | null = null;
  let octx: CanvasRenderingContext2D | null = null;
  let hostCanvas: HTMLCanvasElement | null = null;

  // Live param changes queued for the next render pass.
  const pending: Record<string, unknown> = {};

  // Resolution to push into the uResolution uniform on the next pass.
  let resW = 0;
  let resH = 0;
  let resDirty = false;

  function applyPreset(name: string): void {
    const preset = PRESETS[name];
    if (!preset) return; // "Custom" or unknown -> leave live values untouched.
    theta = preset.theta;
    scale = preset.scale;
    pending.baseColor = hexToRgb(preset.baseColor);
    pending.markerColor = hexToRgb(preset.markerColor);
    pending.glowColor = hexToRgb(preset.glowColor);
    pending.dark = preset.dark;
    pending.diffuse = preset.diffuse;
    pending.mapBrightness = preset.mapBrightness;
    pending.mapBaseBrightness = preset.mapBaseBrightness;
    pending.scale = preset.scale;
    pending.opacity = preset.opacity;
  }

  function ensureOverlay(): void {
    if (overlay || !hostCanvas || typeof document === 'undefined') return;
    const parent = hostCanvas.parentElement;
    if (!parent) return;
    try {
      const c = document.createElement('canvas');
      c.style.position = 'absolute';
      c.style.left = '0';
      c.style.top = '0';
      c.style.width = '100%';
      c.style.height = '100%';
      c.style.pointerEvents = 'none';
      const ctx = c.getContext('2d');
      if (!ctx) return;
      parent.appendChild(c);
      overlay = c;
      octx = ctx;
    } catch {
      overlay = null;
      octx = null;
    }
  }

  function teardownOverlay(): void {
    if (overlay) {
      try {
        overlay.remove();
      } catch {
        /* ignore */
      }
    }
    overlay = null;
    octx = null;
  }

  // Project a lat/long onto the 2D overlay using the same phi/theta the globe
  // spins by. Returns null for back-hemisphere points (hidden behind the globe).
  function project(lat: number, long: number): { x: number; y: number; front: number } | null {
    const phiNow = (basePhi + clockPhi) * PHI_SIGN;
    const latR = (lat * Math.PI) / 180;
    const lonR = (long * Math.PI) / 180 * LON_SIGN + phiNow;
    const x0 = Math.cos(latR) * Math.sin(lonR);
    const y0 = Math.sin(latR);
    const z0 = Math.cos(latR) * Math.cos(lonR);
    // Tilt by theta around the X axis.
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const y1 = y0 * ct - z0 * st;
    const z1 = y0 * st + z0 * ct;
    if (z1 <= 0.02) return null; // behind the globe / on the limb
    const radius = Math.min(resW, resH) * 0.4 * scale;
    const cx = resW / 2 + offsetX * dpr;
    const cy = resH / 2 - offsetY * dpr;
    return { x: cx + x0 * radius, y: cy - y1 * radius, front: z1 };
  }

  function drawLabels(): void {
    ensureOverlay();
    if (!octx || !overlay) return;
    if (overlay.width !== resW || overlay.height !== resH) {
      overlay.width = resW;
      overlay.height = resH;
    }
    octx.clearRect(0, 0, resW, resH);
    if (!showLabels) return;
    const px = Math.max(6, labelSize) * dpr;
    octx.font = `${px}px -apple-system, system-ui, sans-serif`;
    octx.textBaseline = 'middle';
    octx.lineWidth = Math.max(1, dpr * 2);
    octx.strokeStyle = 'rgba(0,0,0,0.55)';
    octx.fillStyle = labelColor;
    const dot = Math.max(1.5, dpr * 2);
    for (const m of markers) {
      if (!m.label) continue;
      const p = project(m.location[0], m.location[1]);
      if (!p) continue;
      octx.globalAlpha = Math.min(1, 0.35 + p.front);
      // marker dot
      octx.beginPath();
      octx.arc(p.x, p.y, dot, 0, Math.PI * 2);
      octx.fill();
      // label text with a dark stroke for legibility
      const tx = p.x + dot * 2.2;
      octx.strokeText(m.label, tx, p.y);
      octx.fillText(m.label, tx, p.y);
    }
    octx.globalAlpha = 1;
  }

  // Bridge invoked by cobe each render pass. We mutate `state` in place; cobe
  // copies recognised keys into its GL uniforms.
  function onRenderBridge(state: Record<string, unknown>): void {
    state.phi = basePhi + clockPhi;
    state.theta = theta;
    for (const k in pending) {
      state[k] = pending[k];
      delete pending[k];
    }
    if (resDirty) {
      state.width = resW;
      state.height = resH;
      resDirty = false;
    }
  }

  return {
    init(c: HTMLCanvasElement, opts: EffectOpts) {
      hostCanvas = c;
      // Headless guard: happy-dom/jsdom have no WebGL, so getContext is null.
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) {
        dead = true;
        return;
      }
      dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

      const p = opts.params;
      // Markers: an explicit 'marker-list' value (live-editable list) wins; else
      // fall back to the named markerSet preset (which also carries overlay
      // labels). The label-less editor markers simply render as dots.
      const ms = String(p.markerSet ?? 'SF + NYC (default)');
      const fromSet = MARKER_SETS[ms] ? MARKER_SETS[ms].slice() : DEFAULT_MARKERS;
      markers = Array.isArray(p.markers)
        ? (p.markers as GlobeMarker[])
            .filter((m) => Array.isArray(m?.location))
            .map((m) => ({ location: [Number(m.location[0]), Number(m.location[1])] as [number, number], size: Number(m.size) }))
        : fromSet;

      speed = Number(p.speed ?? 0.3);
      autoRotate = p.autoRotate === undefined ? true : Boolean(p.autoRotate);
      basePhi = Number(p.phi ?? 0);
      theta = Number(p.theta ?? 0.3);
      offsetX = Number(p.offsetX ?? 0);
      offsetY = Number(p.offsetY ?? 0);
      scale = Number(p.scale ?? 1);
      showLabels = Boolean(p.showLabels ?? false);
      labelColor = String(p.labelColor ?? '#ffffff');
      labelSize = Number(p.labelSize ?? 11);

      // A non-"Custom" initial preset overrides the colour/lighting defaults.
      // Ships as "Cobe Default" so the globe boots to cobe's true library look.
      const presetName = String(p.preset ?? 'Cobe Default');

      const cw = c.clientWidth || c.width || 300;
      const ch = c.clientHeight || c.height || 150;
      resW = Math.max(1, Math.round(cw * dpr));
      resH = Math.max(1, Math.round(ch * dpr));

      globe = createGlobe(c, {
        width: resW,
        height: resH,
        devicePixelRatio: dpr,
        phi: basePhi,
        theta,
        dark: Number(p.dark ?? 0),
        diffuse: Number(p.diffuse ?? 1),
        mapSamples: Number(p.mapSamples ?? 10000),
        mapBrightness: Number(p.mapBrightness ?? 1),
        mapBaseBrightness: Number(p.mapBaseBrightness ?? 0),
        opacity: Number(p.opacity ?? 1),
        scale,
        offset: [offsetX, offsetY],
        baseColor: hexToRgb(String(p.baseColor ?? '#ffffff')),
        markerColor: hexToRgb(String(p.markerColor ?? '#ff8000')),
        glowColor: hexToRgb(String(p.glowColor ?? '#ffffff')),
        markers: markers.map((m) => ({ location: m.location, size: m.size })),
        onRender: onRenderBridge,
      });

      if (presetName !== 'Custom') applyPreset(presetName);

      // Stop cobe's internal RAF loop; tilt-lab drives frame() instead.
      globe.toggle(false);
    },

    frame(t: number) {
      if (dead || !globe) return;
      if (autoRotate) clockPhi = (t / 1000) * speed;
      globe.render();
      drawLabels();
    },

    resize(w: number, h: number) {
      if (dead || !globe) return;
      resW = Math.max(1, Math.round(w * dpr));
      resH = Math.max(1, Math.round(h * dpr));
      resDirty = true;
      // phenomenon recomputes the gl viewport + projection from the laid-out
      // canvas; we push the matching uResolution via onRenderBridge.
      globe.resize();
    },

    setParam(key: string, value: unknown) {
      switch (key) {
        case 'preset':
          applyPreset(String(value));
          break;
        case 'markerSet': {
          const set = MARKER_SETS[String(value)];
          markers = set ? set.slice() : [];
          pending.markers = markers.map((m) => ({ location: m.location, size: m.size }));
          break;
        }
        case 'markers': {
          // Live marker-list edit: rebuild cobe's marker buffer from the array.
          markers = Array.isArray(value)
            ? (value as GlobeMarker[])
                .filter((m) => Array.isArray(m?.location))
                .map((m) => ({
                  location: [Number(m.location[0]), Number(m.location[1])] as [number, number],
                  size: Number(m.size),
                }))
            : [];
          pending.markers = markers.map((m) => ({ location: m.location, size: m.size }));
          break;
        }
        case 'autoRotate':
          autoRotate = Boolean(value);
          break;
        case 'speed':
          speed = Number(value);
          break;
        case 'phi':
          basePhi = Number(value);
          break;
        case 'theta':
          theta = Number(value);
          break;
        case 'scale':
          scale = Number(value);
          pending.scale = scale;
          break;
        case 'offsetX':
          offsetX = Number(value);
          pending.offset = [offsetX, offsetY];
          break;
        case 'offsetY':
          offsetY = Number(value);
          pending.offset = [offsetX, offsetY];
          break;
        case 'showLabels':
          showLabels = Boolean(value);
          break;
        case 'labelColor':
          labelColor = String(value);
          break;
        case 'labelSize':
          labelSize = Number(value);
          break;
        case 'baseColor':
        case 'markerColor':
        case 'glowColor':
          pending[key] = hexToRgb(String(value));
          break;
        case 'mapSamples':
        case 'mapBrightness':
        case 'mapBaseBrightness':
        case 'diffuse':
        case 'dark':
        case 'opacity':
          pending[key] = Number(value);
          break;
        default:
          break;
      }
    },

    dispose() {
      teardownOverlay();
      hostCanvas = null;
      if (globe) {
        try {
          globe.destroy();
        } catch {
          /* releasing a dead GL context can throw; ignore */
        }
        globe = null;
      }
      dead = true;
    },
  };
}
