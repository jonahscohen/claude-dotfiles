// Swarm reference implementation.
// Interactive particle swarm with spring physics and shape morphing.
// Tech: HTML5 Canvas 2D, pure JavaScript physics (no dependencies).
//
// SWARM_PRESETS is not included here - presets are color sets.
// Each preset provides: idleColor, swarmColor, bgColor (hex strings).
// Define your own matching DESIGN.md tokens.

// ================================================================
// Defaults - direct port of SwarmTuner DEFAULTS
// ================================================================

type DotShape = "circle" | "square" | "diamond" | "triangle" | "sparkle" | "cross";

type SwarmPreset = {
  name: string;
  idleColor: string;
  swarmColor: string;
  bgColor: string;
  idleAlpha: number;
  swarmAlpha: number;
  glowAlpha: number;
};

const DEFAULT_PARAMS = {
  scene: 0,
  gridSpacing: 18,
  dotRadius: 1,
  dotShape: "circle" as DotShape,
  attractRadius: 220,
  attractStrength: 0.035,
  repelMode: false,
  orbitRadius: 30,
  orbitJitter: 0.6,
  friction: 0.92,
  returnStrength: 0.008,
  idleColor: "#ffffff",
  swarmColor: "#ffffff",
  bgColor: "#060608",
  idleAlpha: 0.08,
  swarmAlpha: 0.55,
  glowAlpha: 0.15,
  customThemeId: null as string | null,
};

// ================================================================
// Helpers
// ================================================================

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function resolvePreset(params: typeof DEFAULT_PARAMS): SwarmPreset {
  // Supply your SWARM_PRESETS array here and index with params.scene
  // e.g., if (params.scene >= 0 && params.scene < SWARM_PRESETS.length) { ... }
  return {
    name: "Custom",
    idleColor: params.idleColor,
    swarmColor: params.swarmColor,
    bgColor: params.bgColor,
    idleAlpha: params.idleAlpha,
    swarmAlpha: params.swarmAlpha,
    glowAlpha: params.glowAlpha,
  };
}

// ================================================================
// Dot particle - includes per-dot orbit state from original
// ================================================================

interface Dot {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  orbitAngle: number;
  orbitSpeed: number;
}

// ================================================================
// Shape drawing - ported verbatim from original drawShape()
// Note: original uses beginPath before calling drawShape, then
// fill() after. We combine into one call for our wrapper.
// ================================================================

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: DotShape,
  x: number,
  y: number,
  r: number
): void {
  ctx.beginPath();
  switch (shape) {
    case "circle":
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;

    case "square":
      ctx.rect(x - r, y - r, r * 2, r * 2);
      break;

    case "diamond":
      ctx.moveTo(x, y - r * 1.3);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r * 1.3);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;

    case "triangle":
      ctx.moveTo(x, y - r * 1.2);
      ctx.lineTo(x + r * 1.1, y + r * 0.8);
      ctx.lineTo(x - r * 1.1, y + r * 0.8);
      ctx.closePath();
      break;

    case "sparkle": {
      const inner = r * 0.35;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const aNext = ((i + 0.5) / 4) * Math.PI * 2 - Math.PI / 2;
        if (i === 0)
          ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
        else
          ctx.lineTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
        ctx.lineTo(x + Math.cos(aNext) * inner, y + Math.sin(aNext) * inner);
      }
      ctx.closePath();
      break;
    }

    case "cross": {
      const w = r * 0.45;
      ctx.moveTo(x - w, y - r);
      ctx.lineTo(x + w, y - r);
      ctx.lineTo(x + w, y - w);
      ctx.lineTo(x + r, y - w);
      ctx.lineTo(x + r, y + w);
      ctx.lineTo(x + w, y + w);
      ctx.lineTo(x + w, y + r);
      ctx.lineTo(x - w, y + r);
      ctx.lineTo(x - w, y + w);
      ctx.lineTo(x - r, y + w);
      ctx.lineTo(x - r, y - w);
      ctx.lineTo(x - w, y - w);
      ctx.closePath();
      break;
    }
  }
  ctx.fill();
}

// ================================================================
// Grid builder
// ================================================================

function buildGrid(spacing: number, w: number, h: number): Dot[] {
  const dots: Dot[] = [];
  const cols = Math.ceil(w / spacing) + 2;
  const rows = Math.ceil(h / spacing) + 2;
  const offsetX = (w - (cols - 1) * spacing) / 2;
  const offsetY = (h - (rows - 1) * spacing) / 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const hx = offsetX + col * spacing;
      const hy = offsetY + row * spacing;
      dots.push({
        homeX: hx,
        homeY: hy,
        x: hx,
        y: hy,
        vx: 0,
        vy: 0,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.02 + Math.random() * 0.02,
      });
    }
  }
  return dots;
}

// ================================================================
// Animation loop reference
// Mount this onto a canvas element to run the swarm.
// ================================================================

function createSwarm(canvas: HTMLCanvasElement, initialParams = DEFAULT_PARAMS) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  let params = { ...initialParams };
  let dots: Dot[] = [];
  const pointer = { x: -9999, y: -9999, active: false };
  let rafId = 0;

  let w = window.innerWidth;
  let h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots = buildGrid(params.gridSpacing, w, h);
  }

  resize();
  window.addEventListener("resize", resize);

  function onPointerMove(e: PointerEvent) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }
  function onPointerLeave() {
    pointer.active = false;
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerenter", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);

  let prevSpacing = params.gridSpacing;

  // ---- Animation loop: direct port of original updateDots() + render() ----
  function frame() {
    const p = params;
    const preset = resolvePreset(p);
    const idleRgb = hexToRgb(preset.idleColor);
    const swarmRgb = hexToRgb(preset.swarmColor);

    if (p.gridSpacing !== prevSpacing) {
      dots = buildGrid(p.gridSpacing, w, h);
      prevSpacing = p.gridSpacing;
    }

    // Clear
    ctx.fillStyle = preset.bgColor;
    ctx.fillRect(0, 0, w, h);

    const mx = pointer.x;
    const my = pointer.y;
    const mouseActive = pointer.active;

    // ---- Physics: ported from original updateDots() ----
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      dot.orbitAngle += dot.orbitSpeed;
      let attracted = false;

      if (mouseActive) {
        // Original uses distance from HOME position to mouse, not current position
        const dx = mx - dot.homeX;
        const dy = my - dot.homeY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.attractRadius) {
          const force = 1 - (dist / p.attractRadius);
          const eased = force * force * force; // cubic easing

          if (p.repelMode) {
            // Repel: push dot toward a point on the attract radius boundary
            const homeDx = dot.homeX - mx;
            const homeDy = dot.homeY - my;
            const homeDist = Math.sqrt(homeDx * homeDx + homeDy * homeDy) || 1;
            const nx = homeDx / homeDist;
            const ny = homeDy / homeDist;
            const targetX = mx + nx * p.attractRadius;
            const targetY = my + ny * p.attractRadius;
            dot.vx += (targetX - dot.x) * p.attractStrength * eased;
            dot.vy += (targetY - dot.y) * p.attractStrength * eased;
          } else {
            // Attract: pull toward mouse with orbital jitter
            const orbitR = p.orbitRadius * (1 - eased * 0.5);
            const jitterX = Math.cos(dot.orbitAngle) * orbitR * p.orbitJitter;
            const jitterY = Math.sin(dot.orbitAngle) * orbitR * p.orbitJitter;
            dot.vx += (mx + jitterX - dot.x) * p.attractStrength * eased;
            dot.vy += (my + jitterY - dot.y) * p.attractStrength * eased;
          }
          attracted = true;
        }
      }

      // Return spring - weakened when attracted (original: * 0.15)
      if (!attracted) {
        dot.vx += (dot.homeX - dot.x) * p.returnStrength;
        dot.vy += (dot.homeY - dot.y) * p.returnStrength;
      } else {
        dot.vx += (dot.homeX - dot.x) * p.returnStrength * 0.15;
        dot.vy += (dot.homeY - dot.y) * p.returnStrength * 0.15;
      }

      dot.vx *= p.friction;
      dot.vy *= p.friction;
      dot.x += dot.vx;
      dot.y += dot.vy;
    }

    // ---- Render: ported from original render() ----
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const dx = dot.x - dot.homeX;
      const dy = dot.y - dot.homeY;
      const displacement = Math.sqrt(dx * dx + dy * dy);
      // Original hardcodes /60 for displacement normalization
      const t = Math.min(displacement / 60, 1);

      const alpha = preset.idleAlpha +
        (preset.swarmAlpha - preset.idleAlpha) * t;
      // Original: dotRadius + t * 0.8
      const radius = p.dotRadius + t * 0.8;

      const r = Math.round(idleRgb[0] + (swarmRgb[0] - idleRgb[0]) * t);
      const g = Math.round(idleRgb[1] + (swarmRgb[1] - idleRgb[1]) * t);
      const b = Math.round(idleRgb[2] + (swarmRgb[2] - idleRgb[2]) * t);

      // Main dot
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      drawShape(ctx, p.dotShape, dot.x, dot.y, radius);

      // Glow: original activates at t > 0.4, alpha = glowAlpha * (t - 0.4)
      if (t > 0.4) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${preset.glowAlpha * (t - 0.4)})`;
        drawShape(ctx, p.dotShape, dot.x, dot.y, radius + 2);
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return {
    setParams(next: typeof DEFAULT_PARAMS) {
      params = next;
    },
    dispose() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerenter", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}
