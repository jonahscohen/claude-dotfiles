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
 */

type GlobeHandle = ReturnType<typeof createGlobe>;

/** A cobe marker: a lat/lng dot drawn on the globe surface. */
interface GlobeMarker {
  location: [number, number];
  size: number;
  color?: [number, number, number];
}

// cobe's canonical demo markers (San Francisco + New York City). This is the
// real default marker set shown on cobe.vercel.app, restored verbatim so the
// `markers` option is not dropped.
const DEFAULT_MARKERS: GlobeMarker[] = [
  { location: [37.7595, -122.4367], size: 0.03 },
  { location: [40.7128, -74.006], size: 0.1 },
];

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createGlobeEffect(): Effect {
  let globe: GlobeHandle | null = null;
  let dead = false;
  let dpr = 1;

  // Rotation state (driven from the external clock, not cobe's RAF).
  let speed = 0.3; // radians/second of auto-rotation
  let basePhi = 0;
  let clockPhi = 0;
  let theta = 0;

  // cobe `offset` ([x, y] in backing-store pixels, default [0, 0]) and the
  // `markers` array. Both are full createGlobe options restored here.
  let offsetX = 0;
  let offsetY = 0;
  let markers: GlobeMarker[] = DEFAULT_MARKERS;

  // Live param changes queued for the next render pass.
  const pending: Record<string, unknown> = {};

  // Resolution to push into the uResolution uniform on the next pass.
  let resW = 0;
  let resH = 0;
  let resDirty = false;

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
      // Headless guard: happy-dom has no WebGL, so getContext returns null.
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) {
        dead = true;
        return;
      }
      dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

      const p = opts.params;
      speed = Number(p.speed ?? 0.3);
      basePhi = Number(p.phi ?? 0);
      theta = Number(p.theta ?? 0);
      offsetX = Number(p.offsetX ?? 0);
      offsetY = Number(p.offsetY ?? 0);
      markers = Array.isArray(p.markers) ? (p.markers as GlobeMarker[]) : DEFAULT_MARKERS;

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
        dark: Number(p.dark ?? 1),
        diffuse: Number(p.diffuse ?? 1.2),
        mapSamples: Number(p.mapSamples ?? 16000),
        mapBrightness: Number(p.mapBrightness ?? 6),
        mapBaseBrightness: Number(p.mapBaseBrightness ?? 0),
        opacity: Number(p.opacity ?? 1),
        scale: Number(p.scale ?? 1),
        offset: [offsetX, offsetY],
        baseColor: hexToRgb(String(p.baseColor ?? '#4d4d4d')),
        markerColor: hexToRgb(String(p.markerColor ?? '#1accff')),
        glowColor: hexToRgb(String(p.glowColor ?? '#ffffff')),
        markers,
        onRender: onRenderBridge,
      });

      // Stop cobe's internal RAF loop; tilt-lab drives frame() instead.
      globe.toggle(false);
    },

    frame(t: number) {
      if (dead || !globe) return;
      clockPhi = (t / 1000) * speed;
      globe.render();
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
        case 'speed':
          speed = Number(value);
          break;
        case 'phi':
          basePhi = Number(value);
          break;
        case 'theta':
          theta = Number(value);
          break;
        case 'offsetX':
          offsetX = Number(value);
          pending.offset = [offsetX, offsetY];
          break;
        case 'offsetY':
          offsetY = Number(value);
          pending.offset = [offsetX, offsetY];
          break;
        case 'markers':
          if (Array.isArray(value)) {
            markers = value as GlobeMarker[];
            pending.markers = markers;
          }
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
        case 'scale':
          pending[key] = Number(value);
          break;
        default:
          break;
      }
    },

    dispose() {
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
