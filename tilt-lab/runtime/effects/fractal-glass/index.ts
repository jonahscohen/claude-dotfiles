import type { Effect, EffectOpts } from '../../types';
import * as THREE from 'three';
import { FluidSolver } from '../../lib/fluid-solver';

/**
 * Fractal Glass - the shared stable-fluid field rendered onto a background
 * plane, viewed through a fluted-glass refraction material. The flute profile
 * is the verbatim GLSL from regent's fractal-glass tool (IndiciumAI lineage),
 * injected into a MeshPhysicalMaterial via onBeforeCompile. The fluid sim is the
 * shared CPU FluidSolver (runtime/lib/fluid-solver.ts). Three.js.
 *
 * Headless-safe: no WebGL context -> dead, methods no-op (CPU solver still steps
 * harmlessly).
 */

// fractal-glass fluid constants (lane-1 report; differ from halftone)
const FLUID = {
  iterations: 2,
  velocityDecay: 4,
  colorDecay: 6.0,
  curlStrength: 0.012,
  curlScale: 1.5,
  curlChangeRate: 0.015,
  pointerStrength: 0.35,
  pointerDrag: 0.32,
  pointerSpread: 150,
};

// verbatim fluted-glass functions injected after #include <common>
const FLUTE_FUNCS = /* glsl */ `
uniform float singleFluteWidth;
uniform float fluteExponent;
uniform float fluteDepth;
const float MAX_FLUTE_GEOMETRY_DEPTH = 0.02;

float getFluteU(float x) {
    float fluteLocal = fract(x / singleFluteWidth + 0.5);
    return fluteLocal * 2.0 - 1.0;
}
float getSquircleZ(float u, float n) {
    float absU = clamp(abs(u), 0.0, 0.999);
    return pow(1.0 - pow(absU, n), 1.0 / n);
}
vec2 getSquircleNormalXZ(float u, float n) {
    float absU = clamp(abs(u), 0.001, 0.999);
    float signU = sign(u);
    float nx = signU * pow(absU, n - 1.0);
    float nz = pow(1.0 - pow(absU, n), (n - 1.0) / n);
    float len = sqrt(nx * nx + nz * nz);
    return vec2(nx, nz) / len;
}
`;

// verbatim normal-perturbation injected after #include <normal_fragment_maps>
const FLUTE_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
{
    float u = getFluteU(vWorldPosition.x);
    vec2 squircleNormalXZ = getSquircleNormalXZ(u, fluteExponent);
    vec3 fluteNormalModel = vec3(squircleNormalXZ.x, 0.0, squircleNormalXZ.y);
    vec3 blendedNormalModel = normalize(mix(vec3(0.0, 0.0, 1.0), fluteNormalModel, fluteDepth));
    normal = normalize(mat3(viewMatrix) * mat3(modelMatrix) * blendedNormalModel);
}
`;

interface GlassParams {
  scene: number;
  fluidInfluence: number;
  turbulence: number;
  glassAmount: number;
  highlight: number;
  midtone: number;
  shadow: number;
  fluteCount: number;
  fluteExponent: number;
  fluteDepth: number;
  ior: number;
  thickness: number;
  roughness: number;
  envIntensity: number;
  bloomStrength: number;
}

// The 5 built-in scene presets, verbatim from the regent original
// (app/(app)/tools/fractal-glass/presets.ts). baseColor1-4 drive the 4-stop
// radial background gradient; envColor1-3 tint the procedural environment map.
const SCENE_PRESETS: {
  baseColor1: string; baseColor2: string; baseColor3: string; baseColor4: string;
  envColor1: string; envColor2: string; envColor3: string;
}[] = [
  { baseColor1: '#030618', baseColor2: '#1040a0', baseColor3: '#78b0dc', baseColor4: '#A0C4E8', envColor1: '#030620', envColor2: '#1248b0', envColor3: '#68a0d0' }, // Indicium
  { baseColor1: '#0a0318', baseColor2: '#2d1054', baseColor3: '#6b2fa0', baseColor4: '#B8A8C8', envColor1: '#0f0520', envColor2: '#3a1570', envColor3: '#9b4dca' }, // Violet Abyss
  { baseColor1: '#011a0a', baseColor2: '#0a4a2a', baseColor3: '#1a8a5a', baseColor4: '#A8C8B8', envColor1: '#021f0e', envColor2: '#0e5535', envColor3: '#2ecc71' }, // Emerald Depth
  { baseColor1: '#1a0505', baseColor2: '#5a0a0a', baseColor3: '#b82020', baseColor4: '#C8B0A8', envColor1: '#200808', envColor2: '#701212', envColor3: '#ff4444' }, // Crimson Forge
  { baseColor1: '#010102', baseColor2: '#061440', baseColor3: '#0c90d0', baseColor4: '#58c0f8', envColor1: '#010204', envColor2: '#062050', envColor3: '#00a0e8' }, // Regent
];

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToLinearRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [
    srgbToLinear(((n >> 16) & 255) / 255),
    srgbToLinear(((n >> 8) & 255) / 255),
    srgbToLinear((n & 255) / 255),
  ];
}

export function createFractalGlassEffect(): Effect {
  let dead = false;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let bgMaterial: THREE.MeshBasicMaterial | null = null;
  let glassMaterial: THREE.MeshPhysicalMaterial | null = null;
  let bgGeo: THREE.PlaneGeometry | null = null;
  let glassGeo: THREE.PlaneGeometry | null = null;
  let dataTex: THREE.DataTexture | null = null;
  let envRT: THREE.WebGLRenderTarget | null = null;
  let solver: FluidSolver | null = null;
  let fluteShader: { uniforms: Record<string, THREE.IUniform> } | null = null;
  let lastT = 0;

  let pointerX = 0.5;
  let pointerY = 0.5;
  let lastPointerX = 0.5;
  let lastPointerY = 0.5;
  let pointerDown = false;

  let sceneIdx = 0;

  const p: GlassParams = {
    scene: 0,
    fluidInfluence: 0.3,
    turbulence: 0.1,
    glassAmount: 0.5,
    highlight: 1.0,
    midtone: 1.0,
    shadow: 1.0,
    fluteCount: 50,
    fluteExponent: 2.0,
    fluteDepth: 1.0,
    ior: 1.3,
    thickness: 0.1,
    roughness: 0,
    envIntensity: 1.0,
    bloomStrength: 0.3,
  };

  // 4-stop radial background from the active scene's baseColor1-4, with the
  // highlight/midtone/shadow tonal weights setting each zone's radius share.
  // Verbatim mapping from the original createBackgroundTexture().
  function buildBackground(): void {
    if (!solver) return;
    const preset = SCENE_PRESETS[sceneIdx] || SCENE_PRESETS[0];
    const c1 = hexToLinearRGB(preset.baseColor1);
    const c2 = hexToLinearRGB(preset.baseColor2);
    const c3 = hexToLinearRGB(preset.baseColor3);
    const c4 = hexToLinearRGB(preset.baseColor4);
    const hi = p.highlight;
    const mi = p.midtone;
    const sh = p.shadow;
    const total = hi + mi + sh || 1;
    const s1 = hi / total;
    const s2 = (hi + mi) / total;
    const lerp3 = (a: number[], b: number[], t: number): [number, number, number] => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
    solver.setBackgroundField((u, v) => {
      const dx = u - 0.5;
      const dy = v - 0.5;
      const r = Math.min(1, Math.hypot(dx, dy) * 2);
      if (r <= s1) return lerp3(c4, c3, s1 > 0 ? r / s1 : 0);
      if (r <= s2) return lerp3(c3, c2, s2 > s1 ? (r - s1) / (s2 - s1) : 0);
      return lerp3(c2, c1, s2 < 1 ? (r - s2) / (1 - s2) : 0);
    });
  }

  function buildEnvMap(r: THREE.WebGLRenderer): void {
    // Procedural HDR-ish environment: vertical-gradient equirect run through
    // PMREMGenerator. Tinted by the active scene's envColor1-3 (dark base +
    // bright softbox), matching the original createProceduralEnvMap palette.
    const preset = SCENE_PRESETS[sceneIdx] || SCENE_PRESETS[0];
    const env1 = hexToLinearRGB(preset.envColor1);
    const env3 = hexToLinearRGB(preset.envColor3);
    const size = 16;
    const data = new Float32Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      const v = y / (size - 1);
      // dark base (envColor1) + soft top light (envColor3)
      const top = Math.pow(1 - v, 2) * 1.4;
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        data[i] = env1[0] * 0.05 + top * env3[0];
        data[i + 1] = env1[1] * 0.05 + top * env3[1];
        data[i + 2] = env1[2] * 0.05 + top * env3[2];
        data[i + 3] = 1;
      }
    }
    const equirect = new THREE.DataTexture(data as unknown as BufferSource, size, size, THREE.RGBAFormat, THREE.FloatType);
    equirect.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(r);
    pmrem.compileEquirectangularShader();
    envRT = pmrem.fromEquirectangular(equirect);
    if (scene) scene.environment = envRT.texture;
    equirect.dispose();
    pmrem.dispose();
  }

  return {
    init(canvas: HTMLCanvasElement, opts: EffectOpts) {
      for (const k of Object.keys(p) as (keyof GlassParams)[]) {
        if (k in opts.params) this.setParam(k, opts.params[k]);
      }

      solver = new FluidSolver({
        width: 96,
        height: 96,
        ...FLUID,
        curlStrength: FLUID.curlStrength * (p.turbulence / 0.1),
      });
      buildBackground();

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        dead = true;
        return;
      }
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      } catch {
        dead = true;
        return;
      }
      renderer.toneMapping = THREE.NeutralToneMapping;

      scene = new THREE.Scene();
      scene.environmentRotation = new THREE.Euler(0, -1.73, 0);
      camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
      camera.position.z = 2;

      const rgba = solver.colorRGBA;
      dataTex = new THREE.DataTexture(rgba as unknown as BufferSource, solver.width, solver.height, THREE.RGBAFormat, THREE.FloatType);
      dataTex.minFilter = THREE.LinearFilter;
      dataTex.magFilter = THREE.LinearFilter;
      dataTex.needsUpdate = true;

      bgMaterial = new THREE.MeshBasicMaterial({ map: dataTex });
      bgGeo = new THREE.PlaneGeometry(1, 1);
      const bgMesh = new THREE.Mesh(bgGeo, bgMaterial);
      bgMesh.position.z = -0.2;
      scene.add(bgMesh);

      glassMaterial = new THREE.MeshPhysicalMaterial({
        transmission: 1.0,
        roughness: p.roughness,
        metalness: 0,
        ior: p.ior,
        thickness: p.thickness,
        specularIntensity: 0,
        clearcoat: 0,
        side: THREE.FrontSide,
        transparent: true,
        envMapIntensity: p.envIntensity,
      });
      glassMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.singleFluteWidth = { value: 1 / p.fluteCount };
        shader.uniforms.fluteExponent = { value: p.fluteExponent };
        shader.uniforms.fluteDepth = { value: p.fluteDepth };
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${FLUTE_FUNCS}`)
          .replace('#include <normal_fragment_maps>', FLUTE_NORMAL);
        fluteShader = shader as unknown as { uniforms: Record<string, THREE.IUniform> };
      };
      glassGeo = new THREE.PlaneGeometry(1, 1);
      const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
      scene.add(glassMesh);

      buildEnvMap(renderer);
    },

    frame(t: number) {
      const dt = lastT === 0 ? 1 / 60 : Math.min((t - lastT) / 1000, 1 / 30);
      lastT = t;
      if (solver) {
        if (pointerDown) solver.addPointer(pointerX, pointerY, lastPointerX, lastPointerY, true);
        solver.step(dt, t / 1000);
        lastPointerX = pointerX;
        lastPointerY = pointerY;
      }
      if (dead || !renderer || !scene || !camera || !dataTex || !solver) return;
      dataTex.image.data = solver.colorRGBA as unknown as Uint8Array;
      dataTex.needsUpdate = true;
      renderer.render(scene, camera);
    },

    resize(w: number, h: number) {
      if (dead || !renderer) return;
      renderer.setSize(w, h, false);
    },

    setParam(key: string, value: unknown) {
      switch (key) {
        case 'scene': {
          const idx = Number(value);
          if (SCENE_PRESETS[idx]) {
            sceneIdx = idx;
            p.scene = idx;
            buildBackground();
            // rebuild the tinted environment map for the new palette
            if (renderer && scene) {
              envRT?.dispose();
              buildEnvMap(renderer);
            }
          }
          break;
        }
        // fluidInfluence / glassAmount / bloomStrength: present in the original's
        // param set with these defaults but left inert by the original render
        // pipeline; stored here to preserve the full param surface 1:1.
        case 'fluidInfluence':
          p.fluidInfluence = Number(value);
          break;
        case 'glassAmount':
          p.glassAmount = Number(value);
          break;
        case 'bloomStrength':
          p.bloomStrength = Number(value);
          break;
        case 'turbulence':
          p.turbulence = Number(value);
          if (solver) solver.opts.curlStrength = FLUID.curlStrength * (p.turbulence / 0.1);
          break;
        case 'highlight':
          p.highlight = Number(value);
          buildBackground();
          break;
        case 'midtone':
          p.midtone = Number(value);
          buildBackground();
          break;
        case 'shadow':
          p.shadow = Number(value);
          buildBackground();
          break;
        case 'fluteCount':
          p.fluteCount = Number(value);
          if (fluteShader) fluteShader.uniforms.singleFluteWidth.value = 1 / p.fluteCount;
          break;
        case 'fluteExponent':
          p.fluteExponent = Number(value);
          if (fluteShader) fluteShader.uniforms.fluteExponent.value = p.fluteExponent;
          break;
        case 'fluteDepth':
          p.fluteDepth = Number(value);
          if (fluteShader) fluteShader.uniforms.fluteDepth.value = p.fluteDepth;
          break;
        case 'ior':
          p.ior = Number(value);
          if (glassMaterial) glassMaterial.ior = p.ior;
          break;
        case 'thickness':
          p.thickness = Number(value);
          if (glassMaterial) glassMaterial.thickness = p.thickness;
          break;
        case 'roughness':
          p.roughness = Number(value);
          if (glassMaterial) glassMaterial.roughness = p.roughness;
          break;
        case 'envIntensity':
          p.envIntensity = Number(value);
          if (glassMaterial) glassMaterial.envMapIntensity = p.envIntensity;
          break;
        default:
          break;
      }
    },

    onPointer(x: number, y: number) {
      if (Number.isNaN(x) || Number.isNaN(y)) {
        pointerDown = false;
        return;
      }
      pointerX = x;
      pointerY = y;
      pointerDown = true;
    },

    dispose() {
      bgGeo?.dispose();
      glassGeo?.dispose();
      bgMaterial?.dispose();
      glassMaterial?.dispose();
      dataTex?.dispose();
      envRT?.dispose();
      renderer?.dispose();
      bgGeo = null;
      glassGeo = null;
      bgMaterial = null;
      glassMaterial = null;
      dataTex = null;
      envRT = null;
      renderer = null;
      scene = null;
      camera = null;
      solver = null;
      fluteShader = null;
      dead = true;
    },
  };
}
