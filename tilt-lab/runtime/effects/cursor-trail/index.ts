import type { Effect, EffectOpts } from '../../types';

// Ported from unlumen UI "cursor-image-trail" (ui.unlumen.com, author "Leo").
// The original is a React DOM component animated by Framer Motion. tilt-lab has
// no React/Framer Motion runtime, so this is a faithful vanilla-DOM port that
// preserves the exact mechanics and easing:
//   - distance-gated spawning (spawnDistance px of cursor travel)
//   - round-robin item cycling, random rotation within rotationRange
//   - trailLength cap (oldest items animate out)
//   - per-item age scale: scaleFloor + (1-scaleFloor) * (1 - age / trailLength)
//   - enter/exit tweens at duration `fadeDuration`, selectable easing
//   - exit adds blur(exitBlur px)
// It renders into a DOM host via mount() and is driven by onPointer() rather
// than the canvas/frame loop (this is a pointer-role overlay effect).
//
// Parity rebuild: every constant the original hard-coded (duration, easing,
// blur, enter/exit scale + rotation multipliers, age-scale floor) is now an
// exposed param, plus a preset library of named feels.

// Easing curves the original exposed implicitly (expo-out) plus common peers.
const EASINGS: Record<string, string> = {
  expoOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  linear: 'linear',
  backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  circOut: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
};

interface TrailParams {
  itemSize: number;
  trailLength: number;
  spawnDistance: number;
  rotationRange: number;
  fadeDuration: number;
  exitBlur: number;
  enterScale: number;
  exitScale: number;
  scaleFloor: number;
  enterRotateMult: number;
  exitRotateMult: number;
  easing: string;
  wipeOnLeave: boolean;
}

const PRESETS: Record<string, Partial<TrailParams>> = {
  Classic: {
    itemSize: 120, trailLength: 8, spawnDistance: 80, rotationRange: 20,
    fadeDuration: 400, exitBlur: 4, enterScale: 0.5, exitScale: 0.3,
    scaleFloor: 0.6, enterRotateMult: 1.5, exitRotateMult: 0.5, easing: 'expoOut', wipeOnLeave: true,
  },
  Subtle: {
    itemSize: 90, trailLength: 5, spawnDistance: 120, rotationRange: 8,
    fadeDuration: 650, exitBlur: 8, enterScale: 0.7, exitScale: 0.5,
    scaleFloor: 0.75, enterRotateMult: 1, exitRotateMult: 0.3, easing: 'easeOut', wipeOnLeave: true,
  },
  Wild: {
    itemSize: 160, trailLength: 14, spawnDistance: 50, rotationRange: 60,
    fadeDuration: 320, exitBlur: 2, enterScale: 0.3, exitScale: 0.2,
    scaleFloor: 0.5, enterRotateMult: 2, exitRotateMult: 1, easing: 'backOut', wipeOnLeave: false,
  },
  Dense: {
    itemSize: 80, trailLength: 22, spawnDistance: 28, rotationRange: 25,
    fadeDuration: 450, exitBlur: 4, enterScale: 0.5, exitScale: 0.3,
    scaleFloor: 0.6, enterRotateMult: 1.5, exitRotateMult: 0.5, easing: 'expoOut', wipeOnLeave: true,
  },
  'Slow Fade': {
    itemSize: 130, trailLength: 10, spawnDistance: 90, rotationRange: 18,
    fadeDuration: 950, exitBlur: 12, enterScale: 0.6, exitScale: 0.4,
    scaleFloor: 0.45, enterRotateMult: 1.2, exitRotateMult: 0.5, easing: 'circOut', wipeOnLeave: true,
  },
};

interface TrailNode {
  el: HTMLElement;
  removeTimer: number | null;
  // Each node keeps its OWN rotation so its exit tween rotates by its own value.
  rotation: number;
}

export function createCursorTrailEffect(): Effect {
  let host: HTMLElement | null = null;
  let container: HTMLElement | null = null;
  let imageUrls: string[] = [];
  const trail: TrailNode[] = [];
  let lastPos: { x: number; y: number } | null = null;
  let itemCounter = 0;
  let idCounter = 0;

  const p: TrailParams = {
    itemSize: 120,
    trailLength: 8,
    spawnDistance: 80,
    rotationRange: 20,
    fadeDuration: 400,
    exitBlur: 4,
    enterScale: 0.5,
    exitScale: 0.3,
    scaleFloor: 0.6,
    enterRotateMult: 1.5,
    exitRotateMult: 0.5,
    easing: 'expoOut',
    wipeOnLeave: true,
  };

  function ease(): string {
    return EASINGS[p.easing] ?? EASINGS.expoOut;
  }

  function applyParam(key: string, value: unknown): void {
    switch (key) {
      case 'preset': {
        const preset = PRESETS[String(value)];
        if (preset) Object.assign(p, preset);
        break;
      }
      case 'easing':
        p.easing = String(value);
        break;
      case 'wipeOnLeave':
        p.wipeOnLeave = Boolean(value);
        break;
      case 'itemSize':
      case 'trailLength':
      case 'spawnDistance':
      case 'rotationRange':
      case 'fadeDuration':
      case 'exitBlur':
      case 'enterScale':
      case 'exitScale':
      case 'scaleFloor':
      case 'enterRotateMult':
      case 'exitRotateMult':
        (p as unknown as Record<string, number>)[key] = Number(value);
        break;
      default:
        break;
    }
  }

  function readParams(params: Record<string, unknown>) {
    // preset first so explicit params can override the preset's values.
    if (params.preset != null) applyParam('preset', params.preset);
    for (const k of Object.keys(params)) {
      if (k === 'preset') continue;
      applyParam(k, params[k]);
    }
  }

  function clearTrail() {
    for (const node of trail) {
      if (node.removeTimer != null && typeof clearTimeout !== 'undefined') {
        clearTimeout(node.removeTimer);
      }
      node.el.remove();
    }
    trail.length = 0;
  }

  function exitNode(node: TrailNode) {
    node.el.style.opacity = '0';
    node.el.style.filter = `blur(${p.exitBlur}px)`;
    node.el.style.transform = `translate(-50%, -50%) rotate(${node.rotation * p.exitRotateMult}deg) scale(${p.exitScale})`;
    if (typeof setTimeout !== 'undefined') {
      node.removeTimer = setTimeout(() => {
        node.el.remove();
      }, p.fadeDuration) as unknown as number;
    } else {
      node.el.remove();
    }
  }

  // Re-derive each live item's resting scale from its age:
  // scale = scaleFloor + (1-scaleFloor) * (1 - age / trailLength). The newest
  // item is excluded - its enter tween sets its own scale.
  function rescaleLiveTrail(except: TrailNode) {
    const total = trail.length;
    for (let i = 0; i < total; i++) {
      const node = trail[i];
      if (node === except) continue;
      const age = total - 1 - i;
      const scale = p.scaleFloor + (1 - p.scaleFloor) * (1 - age / p.trailLength);
      node.el.style.opacity = '1';
      node.el.style.filter = 'none';
      node.el.style.transform = `translate(-50%, -50%) rotate(${node.rotation}deg) scale(${scale})`;
    }
  }

  return {
    init(_canvas: HTMLCanvasElement, opts: EffectOpts) {
      // Pointer/DOM effect: no canvas drawing. mount() does the real work.
      readParams(opts.params);
      imageUrls = Object.values(opts.assets ?? {});
    },

    mount(hostEl: HTMLElement, opts: EffectOpts) {
      readParams(opts.params);
      imageUrls = Object.values(opts.assets ?? {});
      host = hostEl;
      if (typeof document === 'undefined') return;

      container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.inset = '0';
      container.style.overflow = 'hidden';
      container.style.pointerEvents = 'none';
      host.appendChild(container);
    },

    onPointer(x: number, y: number) {
      if (!container || typeof document === 'undefined') return;
      if (imageUrls.length === 0) return;

      // Distance gate: only spawn after travelling spawnDistance px.
      if (lastPos) {
        const dx = x - lastPos.x;
        const dy = y - lastPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.spawnDistance) return;
      }
      lastPos = { x, y };

      const rotation = (Math.random() * 2 - 1) * p.rotationRange;
      const itemIndex = itemCounter % imageUrls.length;
      itemCounter += 1;
      idCounter += 1;

      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = `${x}px`;
      wrap.style.top = `${y}px`;
      wrap.style.width = `${p.itemSize}px`;
      wrap.style.userSelect = 'none';
      wrap.style.pointerEvents = 'none';
      wrap.style.zIndex = String(idCounter);
      wrap.style.transition = `opacity ${p.fadeDuration}ms ${ease()}, transform ${p.fadeDuration}ms ${ease()}, filter ${p.fadeDuration}ms ${ease()}`;
      // Initial state: opacity 0, enterScale, rotate*enterRotateMult.
      wrap.style.opacity = '0';
      wrap.style.transform = `translate(-50%, -50%) rotate(${rotation * p.enterRotateMult}deg) scale(${p.enterScale})`;

      const img = document.createElement('img');
      img.src = imageUrls[itemIndex];
      img.style.width = '100%';
      img.style.height = 'auto';
      img.draggable = false;
      wrap.appendChild(img);

      container.appendChild(wrap);

      const node: TrailNode = { el: wrap, removeTimer: null, rotation };
      trail.push(node);

      // Cap the trail length: oldest items animate out and are removed.
      while (trail.length > p.trailLength) {
        const oldest = trail.shift();
        if (oldest) exitNode(oldest);
      }

      // Re-derive resting scale for the existing (older) live items.
      rescaleLiveTrail(node);

      // Newest item (age 0) -> scale = scaleFloor + (1-scaleFloor) = 1.0.
      const scale = p.scaleFloor + (1 - p.scaleFloor) * (1 - 0 / p.trailLength);
      const animateIn = () => {
        wrap.style.opacity = '1';
        wrap.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
      };
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(animateIn);
      } else {
        animateIn();
      }
    },

    frame() {
      // Pointer-driven, event-based. Motion is handled by CSS transitions, so
      // there is nothing to advance on the canvas clock.
    },

    onPointerLeave() {
      if (p.wipeOnLeave) clearTrail();
      lastPos = null;
    },

    resize() {
      // The overlay is inset:0 and tracks the host automatically.
    },

    setParam(key: string, value: unknown) {
      applyParam(key, value);
    },

    dispose() {
      clearTrail();
      lastPos = null;
      if (container) {
        container.remove();
        container = null;
      }
      host = null;
    },
  };
}
