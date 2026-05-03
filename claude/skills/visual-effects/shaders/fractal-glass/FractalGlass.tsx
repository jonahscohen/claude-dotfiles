// Fractal glass reference implementation.
// Physical fluted glass with fluid-driven distortion and procedural lighting.
// Tech: Three.js (WebGLRenderer, MeshPhysicalMaterial with onBeforeCompile patches)
//
// SCENE_PRESETS is not included here - presets are color sets:
// Each preset provides 7 hex strings: baseColor1-4 (background gradient) + envColor1-3 (env map).
// Define your own presets matching DESIGN.md tokens.

import * as THREE from "three";

// ================================================================
// Constants (direct port from IndiciumAI webpack bundle chunk 386)
// ================================================================

// Default params exposed to controls
const DEFAULT_PARAMS = {
  scene: 0,
  customThemeId: null as string | null,
  customBaseColor1: null as string | null,
  customBaseColor2: null as string | null,
  customBaseColor3: null as string | null,
  customBaseColor4: null as string | null,
  customEnvColor1: null as string | null,
  customEnvColor2: null as string | null,
  customEnvColor3: null as string | null,
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

// Resolve the active scene preset from params (built-in or custom colors).
// SCENE_PRESETS are color sets - supply your own or use the fallback below.
// Each preset: { name, baseColor1, baseColor2, baseColor3, baseColor4, envColor1, envColor2, envColor3 }
type ScenePreset = {
  name: string;
  baseColor1: string;
  baseColor2: string;
  baseColor3: string;
  baseColor4: string;
  envColor1: string;
  envColor2: string;
  envColor3: string;
};

// Default built-in preset - replace with your DESIGN.md palette
const FALLBACK_PRESET: ScenePreset = {
  name: "Default",
  baseColor1: "#030618",
  baseColor2: "#1040a0",
  baseColor3: "#78b0dc",
  baseColor4: "#A0C4E8",
  envColor1: "#030620",
  envColor2: "#1248b0",
  envColor3: "#68a0d0",
};

function resolvePreset(params: typeof DEFAULT_PARAMS): ScenePreset {
  // Custom theme: read colors directly from params
  if (params.scene === -1 || params.customBaseColor1) {
    return {
      name: "Custom",
      baseColor1: params.customBaseColor1 || FALLBACK_PRESET.baseColor1,
      baseColor2: params.customBaseColor2 || FALLBACK_PRESET.baseColor2,
      baseColor3: params.customBaseColor3 || FALLBACK_PRESET.baseColor3,
      baseColor4: params.customBaseColor4 || FALLBACK_PRESET.baseColor4,
      envColor1: params.customEnvColor1 || FALLBACK_PRESET.envColor1,
      envColor2: params.customEnvColor2 || FALLBACK_PRESET.envColor2,
      envColor3: params.customEnvColor3 || FALLBACK_PRESET.envColor3,
    };
  }
  // Supply your SCENE_PRESETS array here and index with params.scene
  // e.g., return SCENE_PRESETS[params.scene] ?? FALLBACK_PRESET;
  return FALLBACK_PRESET;
}

// Fluid sim constants (from original MainScene constructor)
const FLUID_ITERATIONS = 2;
const FLUID_TIME_SCALE = 0.10;
const FLUID_VELOCITY_DECAY = 4;
const FLUID_COLOR_DECAY = 6.0;
const FLUID_POINTER_SPREAD = 150;
const FLUID_CURL_STRENGTH = 0.012;
const FLUID_CURL_SCALE = 1.5;
const FLUID_CURL_CHANGE_RATE = 0.015;
const FLUID_POINTER_STRENGTH = 0.35;
const FLUID_POINTER_DRAG = 0.32;
const FLUID_SIM_TEXTURE_SCALE = 0.25;
const FLUID_PHYSICS_SCALE = 1; // dx

// ================================================================
// GLSL: Shared fluid sim code (from FluidSimulation static fields)
// ================================================================
const FLUID_SHARED_GLSL = /* glsl */ `
vec2 clipToSimSpace(vec2 clipSpace){
    return vec2(clipSpace.x / invResolution.z, clipSpace.y);
}

vec2 simToTexelSpace(vec2 simSpace){
    return vec2(simSpace.x * invResolution.z + 1.0, simSpace.y + 1.0) * 0.5;
}

#define samplePressure(tex, coord) (texture2D(pressure, coord).x)
#define outOfBoundsVelocityMultiplier(coord) (velocityBoundaryEnabled ? (step(vec2(0.), coord) * step(coord, vec2(1.)) * 2. - 1.) : vec2(1.0))
#define sampleVelocity(tex, coord) (outOfBoundsVelocityMultiplier(coord) * texture2D(velocity, coord).xy)
`;

const FLUID_SD_SEGMENT_GLSL = /* glsl */ `
float sdSegment(vec2 x, vec2 a, vec2 b, out float alpha) {
    vec2 ab = b - a;
    vec2 ax = x - a;
    alpha = dot(ab, ax) / dot(ab, ab);
    vec2 d = ax - clamp(alpha, 0., 1.) * ab;
    return length(d);
}
float sdSegment(vec2 x, vec2 a, vec2 b) {
    float alpha;
    return sdSegment(x, a, b, alpha);
}
`;

// Simplex noise (from original, character-for-character)
const SIMPLEX_NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) {
    return x-floor(x*(1./289.))*289.;
}
vec4 mod289(vec4 x) {
    return x-floor(x*(1./289.))*289.;
}
vec4 permute(vec4 x) {
    return mod289(((x*34.)+1.)*x);
}
vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159-.85373472095314*r;
}
float snoise(vec3 v) {
    const vec2 C=vec2(1./6.,1./3.);
    const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(
        i.z+vec4(0.,i1.z,i2.z,1.))
        +i.y+vec4(0.,i1.y,i2.y,1.))
        +i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;
    vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;
    p1*=norm.y;
    p2*=norm.z;
    p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 snoiseVec3(vec3 x){
    float s=snoise(vec3(x));
    float s1=snoise(vec3(x.y-19.1,x.z+33.4,x.x+47.2));
    float s2=snoise(vec3(x.z+74.2,x.x-124.5,x.y+99.4));
    vec3 c=vec3(s,s1,s2);
    return c;
}
vec3 curlNoise(vec3 p){
    const float e=.1;
    vec3 dx=vec3(e,0.,0.);
    vec3 dy=vec3(0.,e,0.);
    vec3 dz=vec3(0.,0.,e);
    vec3 p_x0=snoiseVec3(p-dx);
    vec3 p_x1=snoiseVec3(p+dx);
    vec3 p_y0=snoiseVec3(p-dy);
    vec3 p_y1=snoiseVec3(p+dy);
    vec3 p_z0=snoiseVec3(p-dz);
    vec3 p_z1=snoiseVec3(p+dz);
    float x=p_y1.z-p_y0.z-p_z1.y+p_z0.y;
    float y=p_z1.x-p_z0.x-p_x1.z+p_x0.z;
    float z=p_x1.y-p_x0.y-p_y1.x+p_y0.x;
    return normalize(vec3(x,y,z));
}
`;

// ================================================================
// GLSL: Fluted glass functions (from original FlutedGlassMaterial)
// ================================================================
const FLUTE_FUNCTIONS_GLSL = /* glsl */ `
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

// ================================================================
// Helpers
// ================================================================
function hexToLinearRGB(hex: string): [number, number, number] {
  const c = parseInt(hex.replace("#", ""), 16);
  const r = ((c >> 16) & 0xff) / 255;
  const g = ((c >> 8) & 0xff) / 255;
  const b = (c & 0xff) / 255;
  const toLinear = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return [toLinear(r), toLinear(g), toLinear(b)];
}

function smoothstepJS(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
}

function dist3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

// ================================================================
// Double-buffered render target (port of original Xm class)
// ================================================================
class DoubleBufferTarget {
  private targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private index = 0;

  constructor(w: number, h: number, options: THREE.RenderTargetOptions) {
    this.targets = [
      new THREE.WebGLRenderTarget(w, h, options),
      new THREE.WebGLRenderTarget(w, h, options),
    ];
  }

  getTexture(): THREE.Texture {
    return this.targets[this.index].texture;
  }

  getReadTarget(): THREE.WebGLRenderTarget {
    return this.targets[this.index];
  }

  getWriteTarget(): THREE.WebGLRenderTarget {
    return this.targets[1 - this.index];
  }

  swap(): void {
    this.index = 1 - this.index;
  }

  resize(w: number, h: number): void {
    this.targets[0].setSize(w, h);
    this.targets[1].setSize(w, h);
  }

  clear(renderer: THREE.WebGLRenderer): void {
    const prev = renderer.getRenderTarget();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.targets[0]);
    renderer.clear();
    renderer.setRenderTarget(this.targets[1]);
    renderer.clear();
    renderer.setRenderTarget(prev);
  }

  dispose(): void {
    this.targets[0].dispose();
    this.targets[1].dispose();
  }
}

// ================================================================
// Fluid Simulation (port of original FluidSimulation + FluidPlane)
// Uses same Three.js renderer via render targets - NO separate GL context
// ================================================================
interface FluidSimState {
  velocity: DoubleBufferTarget;
  pressure: DoubleBufferTarget;
  color: DoubleBufferTarget;
  divergence: THREE.WebGLRenderTarget;
  sharedUniforms: Record<string, THREE.IUniform>;
  advectMat: THREE.ShaderMaterial;
  divergenceMat: THREE.ShaderMaterial;
  pressureSolveMat: THREE.ShaderMaterial;
  gradientSubMat: THREE.ShaderMaterial;
  paintVelocityMat: THREE.ShaderMaterial;
  paintColorMat: THREE.ShaderMaterial;
  fsQuad: THREE.Mesh;
  fsScene: THREE.Scene;
  fsCamera: THREE.OrthographicCamera;
  simWidth: number;
  simHeight: number;
  colorWidth: number;
  colorHeight: number;
  timeScale: number;
  iterations: number;
}

function makeFluidVertex(
  useUV: boolean,
  useFiniteDiff: boolean,
  useSimPos: boolean
): string {
  return /* glsl */ `
    uniform vec3 invResolution;
    ${useUV ? "varying vec2 vUv;" : ""}
    ${useFiniteDiff ? `
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vB;
    varying vec2 vT;
    ` : ""}
    ${useSimPos ? "varying vec2 p;" : ""}

    void main() {
      vec2 texelCoord = position.xy * 0.5 + 0.5;
      ${useFiniteDiff ? `
      vL = texelCoord - vec2(invResolution.x, 0.0);
      vR = texelCoord + vec2(invResolution.x, 0.0);
      vB = texelCoord - vec2(0.0, invResolution.y);
      vT = texelCoord + vec2(0.0, invResolution.y);
      ` : ""}
      ${useUV ? "vUv = texelCoord;" : ""}
      ${useSimPos ? "p = vec2(position.x / invResolution.z, position.y);" : ""}
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;
}

function createFluidSim(
  renderer: THREE.WebGLRenderer,
  colorW: number,
  colorH: number,
  periodicBoundary: boolean
): FluidSimState {
  const simW = Math.max(1, Math.floor(colorW * FLUID_SIM_TEXTURE_SCALE));
  const simH = Math.max(1, Math.floor(colorH * FLUID_SIM_TEXTURE_SCALE));
  const dx = FLUID_PHYSICS_SCALE;
  const wrapMode = periodicBoundary ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;

  const simTexOpts: THREE.RenderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    wrapS: wrapMode,
    wrapT: wrapMode,
    generateMipmaps: false,
  };

  const simTexNearestOpts: THREE.RenderTargetOptions = {
    ...simTexOpts,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  };

  const velocity = new DoubleBufferTarget(simW, simH, simTexOpts);
  const pressure = new DoubleBufferTarget(simW, simH, simTexNearestOpts);
  const color = new DoubleBufferTarget(colorW, colorH, {
    ...simTexOpts,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  const divergence = new THREE.WebGLRenderTarget(simW, simH, simTexNearestOpts);

  // Shared uniforms (from original FluidSimulation constructor)
  const sharedUniforms: Record<string, THREE.IUniform> = {
    invResolution: { value: new THREE.Vector3(1 / simW, 1 / simH, simH / simW) },
    dt: { value: 0 },
    dx: { value: dx },
    rdx: { value: 1 / dx },
    halfRdx: { value: 0.5 / dx },
    dxAlpha: { value: -dx * dx },
    velocityBoundaryEnabled: { value: !periodicBoundary },
    velocity: { value: velocity.getTexture() },
    pressure: { value: pressure.getTexture() },
    divergence: { value: divergence.texture },
    color: { value: color.getTexture() },
  };

  // --- Advect shader (port of original Advect class) ---
  const advectMat = new THREE.ShaderMaterial({
    uniforms: {
      ...sharedUniforms,
      target: { value: null as THREE.Texture | null },
    },
    vertexShader: makeFluidVertex(true, false, true),
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 invResolution;
      uniform bool velocityBoundaryEnabled;
      uniform float rdx;
      uniform float dt;
      uniform sampler2D velocity;
      uniform sampler2D target;
      varying vec2 vUv;
      varying vec2 p;
      ${FLUID_SHARED_GLSL}
      void main(){
          vec2 tracedPos = p - dt * rdx * texture2D(velocity, vUv).xy;
          gl_FragColor = texture2D(target, simToTexelSpace(tracedPos));
      }
    `,
    depthWrite: false,
    depthTest: false,
  });

  // --- Divergence shader ---
  const divergenceMat = new THREE.ShaderMaterial({
    uniforms: sharedUniforms,
    vertexShader: makeFluidVertex(false, true, false),
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 invResolution;
      uniform bool velocityBoundaryEnabled;
      uniform sampler2D velocity;
      uniform float halfRdx;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vB;
      varying vec2 vT;
      ${FLUID_SHARED_GLSL}
      void main(){
          vec2 L = sampleVelocity(velocity, vL);
          vec2 R = sampleVelocity(velocity, vR);
          vec2 B = sampleVelocity(velocity, vB);
          vec2 T = sampleVelocity(velocity, vT);
          gl_FragColor = vec4(halfRdx * ((R.x - L.x) + (T.y - B.y)), 0., 0., 1.);
      }
    `,
    depthWrite: false,
    depthTest: false,
  });

  // --- Pressure solve (Jacobi) ---
  const pressureSolveMat = new THREE.ShaderMaterial({
    uniforms: sharedUniforms,
    vertexShader: makeFluidVertex(true, true, false),
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 invResolution;
      uniform bool velocityBoundaryEnabled;
      uniform sampler2D pressure;
      uniform sampler2D divergence;
      uniform float dxAlpha;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vB;
      varying vec2 vT;
      ${FLUID_SHARED_GLSL}
      void main(){
          float L = samplePressure(pressure, vL);
          float R = samplePressure(pressure, vR);
          float B = samplePressure(pressure, vB);
          float T = samplePressure(pressure, vT);
          float bC = texture2D(divergence, vUv).x;
          gl_FragColor = vec4((L + R + B + T + dxAlpha * bC) * .25, 0., 0., 1.);
      }
    `,
    depthWrite: false,
    depthTest: false,
  });

  // --- Gradient subtract ---
  const gradientSubMat = new THREE.ShaderMaterial({
    uniforms: sharedUniforms,
    vertexShader: makeFluidVertex(true, true, false),
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 invResolution;
      uniform bool velocityBoundaryEnabled;
      uniform sampler2D pressure;
      uniform sampler2D velocity;
      uniform float halfRdx;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vB;
      varying vec2 vT;
      ${FLUID_SHARED_GLSL}
      void main(){
          float L = samplePressure(pressure, vL);
          float R = samplePressure(pressure, vR);
          float B = samplePressure(pressure, vB);
          float T = samplePressure(pressure, vT);
          vec2 v = texture2D(velocity, vUv).xy;
          gl_FragColor = vec4(v - halfRdx*vec2(R-L, T-B), 0., 1.);
      }
    `,
    depthWrite: false,
    depthTest: false,
  });

  // --- Paint velocity (forces + curl noise + pointer) ---
  const paintVelocityMat = new THREE.ShaderMaterial({
    uniforms: {
      ...sharedUniforms,
      uPointer: { value: new THREE.Vector3(0.5, 0.5, 0) },
      uPointerLast: { value: new THREE.Vector3(0.5, 0.5, 0) },
      uDecayFactor: { value: FLUID_VELOCITY_DECAY },
      uCurlParameters: { value: new THREE.Vector3(FLUID_CURL_STRENGTH, FLUID_CURL_SCALE, FLUID_CURL_CHANGE_RATE) },
      uPointerParameters: { value: new THREE.Vector3(FLUID_POINTER_STRENGTH, FLUID_POINTER_DRAG, FLUID_POINTER_SPREAD) },
      uTime_s: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform vec3 invResolution;
      varying vec2 p;
      varying vec2 vUv;
      void main() {
          vUv = position.xy * 0.5 + 0.5;
          p = vec2(position.x / invResolution.z, position.y);
          gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D velocity;
      uniform vec3 invResolution;
      uniform float dt;
      uniform float dx;
      uniform vec3 uPointer;
      uniform vec3 uPointerLast;
      uniform float uDecayFactor;
      uniform vec3 uCurlParameters;
      uniform vec3 uPointerParameters;
      uniform float uTime_s;
      varying vec2 vUv;
      varying vec2 p;
      ${FLUID_SHARED_GLSL}
      ${FLUID_SD_SEGMENT_GLSL}
      ${SIMPLEX_NOISE_GLSL}
      void main() {
          vec2 velLastFrame = texture2D(velocity, vUv).xy;
          vec2 vel = velLastFrame;
          // decay velocity
          {
              vec2 targetVelocity = vec2(0.);
              vec2 dv = targetVelocity - vel;
              vel += dv * clamp(uDecayFactor * dt, 0., 1.0);
          }
          vec2 cNoise = curlNoise(vec3(vUv * uCurlParameters.y, uTime_s * uCurlParameters.z)).xy;
          // curl noise
          if (uCurlParameters.x > 0.) {
              vel += uCurlParameters.x * cNoise;
          }
          // add user drag
          vec2 pointerPos = clipToSimSpace(uPointer.xy * 2.0 - 1.0);
          vec2 pointerPosLast = clipToSimSpace(uPointerLast.xy * 2.0 - 1.0);
          float pointerDown = uPointer.z;
          if (pointerDown < 0.5) {
              float d = sdSegment(p, pointerPos, pointerPosLast);
              vec2 userVelocity = (pointerPos - pointerPosLast) / dt;
              float strength = uPointerParameters.x;
              float dragStrength = uPointerParameters.y;
              float spread = uPointerParameters.z;
              float m = exp(-d * d * spread) * dragStrength;
              vec2 targetVelocity = userVelocity * dx * dt * 60.;
              vel += (targetVelocity - vel) * m;
          }
          gl_FragColor = vec4(vel, 0., 1.);
      }
    `,
    depthWrite: false,
    depthTest: false,
  });

  // --- Paint color (decay toward background) ---
  const paintColorMat = new THREE.ShaderMaterial({
    uniforms: {
      ...sharedUniforms,
      uPointer: { value: new THREE.Vector3(0.5, 0.5, 0) },
      uPointerLast: { value: new THREE.Vector3(0.5, 0.5, 0) },
      uBackgroundTexture: { value: null as THREE.Texture | null },
      uDecayFactor: { value: FLUID_COLOR_DECAY },
      uTime_s: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform vec3 invResolution;
      varying vec2 p;
      varying vec2 vUv;
      void main() {
          vUv = position.xy * 0.5 + 0.5;
          p = vec2(position.x / invResolution.z, position.y);
          gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D color;
      uniform vec3 invResolution;
      uniform float dt;
      uniform sampler2D uBackgroundTexture;
      uniform float uDecayFactor;
      varying vec2 vUv;
      varying vec2 p;
      ${FLUID_SHARED_GLSL}
      void main() {
          vec3 rgbLastFrame = texture2D(color, vUv).rgb;
          vec3 rgb = rgbLastFrame;
          // tend color towards background color
          vec4 backgroundSample = texture2D(uBackgroundTexture, vUv);
          {
              vec3 dColor = backgroundSample.rgb - rgb;
              rgb += dColor * clamp(uDecayFactor * dt, 0., 1.0);
          }
          gl_FragColor = vec4(clamp(rgb, 0., 1.), 1.);
      }
    `,
    depthWrite: false,
    depthTest: false,
  });

  // Fullscreen quad for fluid passes (matches original ClipSpaceQuad)
  const fsQuadGeo = new THREE.BufferGeometry();
  fsQuadGeo.setIndex([0, 1, 2, 2, 1, 3]);
  fsQuadGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0], 3)
  );
  fsQuadGeo.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2)
  );

  const fsQuad = new THREE.Mesh(fsQuadGeo);
  fsQuad.frustumCulled = false;
  const fsScene = new THREE.Scene();
  fsScene.add(fsQuad);
  const fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    velocity,
    pressure,
    color,
    divergence,
    sharedUniforms,
    advectMat,
    divergenceMat,
    pressureSolveMat,
    gradientSubMat,
    paintVelocityMat,
    paintColorMat,
    fsQuad,
    fsScene,
    fsCamera,
    simWidth: simW,
    simHeight: simH,
    colorWidth: colorW,
    colorHeight: colorH,
    timeScale: FLUID_TIME_SCALE,
    iterations: FLUID_ITERATIONS,
  };
}

function renderFluidPass(
  renderer: THREE.WebGLRenderer,
  sim: FluidSimState,
  material: THREE.ShaderMaterial,
  target: THREE.WebGLRenderTarget
): void {
  sim.fsQuad.material = material;
  renderer.setRenderTarget(target);
  renderer.render(sim.fsScene, sim.fsCamera);
}

function stepFluidSim(
  renderer: THREE.WebGLRenderer,
  sim: FluidSimState,
  dtRaw: number
): void {
  const dt = Math.min(Math.max(dtRaw, 1 / 240), 1 / 30);
  const scaledDt = dt * sim.timeScale;

  // Save renderer state
  const currentRenderTarget = renderer.getRenderTarget();
  const currentAutoClear = renderer.autoClear;
  renderer.autoClear = false;

  // --- Velocity passes (sim resolution) ---
  const simW = sim.simWidth;
  const simH = sim.simHeight;
  sim.sharedUniforms.invResolution.value.set(1 / simW, 1 / simH, simH / simW);
  sim.sharedUniforms.dt.value = scaledDt;

  // 1. Advect velocity
  sim.advectMat.uniforms.target.value = sim.velocity.getTexture();
  sim.sharedUniforms.velocity.value = sim.velocity.getTexture();
  renderFluidPass(renderer, sim, sim.advectMat, sim.velocity.getWriteTarget());
  sim.velocity.swap();

  // 2. Paint velocity (forces)
  sim.sharedUniforms.velocity.value = sim.velocity.getTexture();
  renderFluidPass(renderer, sim, sim.paintVelocityMat, sim.velocity.getWriteTarget());
  sim.velocity.swap();

  // 3. Divergence
  sim.sharedUniforms.velocity.value = sim.velocity.getTexture();
  renderFluidPass(renderer, sim, sim.divergenceMat, sim.divergence);

  // 4. Pressure solve (Jacobi iterations)
  sim.sharedUniforms.divergence.value = sim.divergence.texture;
  for (let i = 0; i < sim.iterations; i++) {
    sim.sharedUniforms.pressure.value = sim.pressure.getTexture();
    renderFluidPass(renderer, sim, sim.pressureSolveMat, sim.pressure.getWriteTarget());
    sim.pressure.swap();
  }

  // 5. Gradient subtract
  sim.sharedUniforms.velocity.value = sim.velocity.getTexture();
  sim.sharedUniforms.pressure.value = sim.pressure.getTexture();
  renderFluidPass(renderer, sim, sim.gradientSubMat, sim.velocity.getWriteTarget());
  sim.velocity.swap();

  // --- Color passes (full resolution) ---
  const colW = sim.colorWidth;
  const colH = sim.colorHeight;
  sim.sharedUniforms.invResolution.value.set(1 / colW, 1 / colH, colH / colW);

  // 6. Paint color (decay toward background)
  sim.sharedUniforms.color.value = sim.color.getTexture();
  sim.sharedUniforms.velocity.value = sim.velocity.getTexture();
  renderFluidPass(renderer, sim, sim.paintColorMat, sim.color.getWriteTarget());
  sim.color.swap();

  // 7. Advect color
  sim.advectMat.uniforms.target.value = sim.color.getTexture();
  sim.sharedUniforms.velocity.value = sim.velocity.getTexture();
  renderFluidPass(renderer, sim, sim.advectMat, sim.color.getWriteTarget());
  sim.color.swap();

  // Restore renderer state
  renderer.autoClear = currentAutoClear;
  renderer.setRenderTarget(currentRenderTarget);
}

function disposeFluidSim(sim: FluidSimState): void {
  sim.velocity.dispose();
  sim.pressure.dispose();
  sim.color.dispose();
  sim.divergence.dispose();
  sim.advectMat.dispose();
  sim.divergenceMat.dispose();
  sim.pressureSolveMat.dispose();
  sim.gradientSubMat.dispose();
  sim.paintVelocityMat.dispose();
  sim.paintColorMat.dispose();
  sim.fsQuad.geometry.dispose();
}

// ================================================================
// Procedural background texture (replaces original "justified.jpg")
// Generates a gradient image that the fluid sim decays toward
// ================================================================
function createBackgroundTexture(
  preset: ScenePreset,
  w: number,
  h: number,
  tonal?: { highlight: number; midtone: number; shadow: number },
  center?: { x: number; y: number }
): THREE.DataTexture {
  const data = new Uint8Array(w * h * 4);
  const c1 = hexToLinearRGB(preset.baseColor1);
  const c2 = hexToLinearRGB(preset.baseColor2);
  const c3 = hexToLinearRGB(preset.baseColor3);
  const c4 = hexToLinearRGB(preset.baseColor4);

  // Tonal weights control each zone's share of the gradient radius.
  // Higher value = that color occupies more of the gradient.
  const hi = tonal?.highlight ?? 1.0;
  const mi = tonal?.midtone ?? 1.0;
  const sh = tonal?.shadow ?? 1.0;
  const total = hi + mi + sh;

  // 4-stop radial with strict adjacency:
  //   Center(c4) -> Mid-Bright(c3) -> Mid-Dark(c2) -> Edge(c1)
  // Stop positions derived from proportional weights.
  const s1 = hi / total;
  const s2 = (hi + mi) / total;

  const lerp3 = (a: number[], b: number[], t: number): [number, number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];

  // Use explicit center if provided, otherwise randomize
  const cx = center?.x ?? (0.3 + Math.random() * 0.4);
  const cy = center?.y ?? (0.3 + Math.random() * 0.4);

  // Linear to sRGB for Uint8 storage
  const toSRGB = (v: number) =>
    v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      const dx = u - cx;
      const dy = v - cy;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);

      let rgb: [number, number, number];
      if (r <= s1) {
        rgb = lerp3(c4, c3, r / s1);
      } else if (r <= s2) {
        const t = (r - s1) / (s2 - s1);
        rgb = lerp3(c3, c2, t);
      } else {
        const t = (r - s2) / (1.0 - s2);
        rgb = lerp3(c2, c1, t);
      }

      const idx = (y * w + x) * 4;
      data[idx] = Math.max(0, Math.min(255, Math.round(toSRGB(Math.max(0, rgb[0])) * 255)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(toSRGB(Math.max(0, rgb[1])) * 255)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(toSRGB(Math.max(0, rgb[2])) * 255)));
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ================================================================
// Procedural HDR environment map
// ================================================================
function createProceduralEnvMap(
  renderer: THREE.WebGLRenderer,
  preset: ScenePreset
): THREE.Texture {
  const size = 512;
  const data = new Float32Array(size * size * 4);

  const envCol1 = hexToLinearRGB(preset.envColor1);
  const envCol2 = hexToLinearRGB(preset.envColor2);
  const envCol3 = hexToLinearRGB(preset.envColor3);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const phi = (u - 0.5) * 2 * Math.PI;
      const theta = v * Math.PI;
      const dirX = Math.sin(theta) * Math.cos(phi);
      const dirY = Math.cos(theta);
      const dirZ = Math.sin(theta) * Math.sin(phi);

      // Dark base
      let r = envCol1[0] * 0.03;
      let g = envCol1[1] * 0.03;
      let b = envCol1[2] * 0.03;

      // Broad ceiling light
      const ceiling = smoothstepJS(-0.1, 0.7, dirY);
      r += ceiling * envCol2[0] * 0.6;
      g += ceiling * envCol2[1] * 0.6;
      b += ceiling * envCol2[2] * 0.6;

      // Main softbox (soft-room.hdr style peaks)
      const sbDir = normalize3(0.4, 0.75, -0.2);
      const sbDist = dist3(dirX - sbDir[0], dirY - sbDir[1], dirZ - sbDir[2]);
      const softboxCore = Math.exp(-sbDist * sbDist * 8.0);
      const softboxMid = Math.exp(-sbDist * sbDist * 2.0);
      const softboxWide = Math.exp(-sbDist * sbDist * 0.5);
      // Core uses preset env colors instead of near-white to avoid grey
      r += softboxCore * envCol3[0] * 400.0;
      g += softboxCore * envCol3[1] * 400.0;
      b += softboxCore * envCol3[2] * 400.0;
      r += softboxMid * envCol2[0] * 60.0;
      g += softboxMid * envCol2[1] * 60.0;
      b += softboxMid * envCol2[2] * 60.0;
      r += softboxWide * envCol3[0] * 8.0;
      g += softboxWide * envCol3[1] * 8.0;
      b += softboxWide * envCol3[2] * 8.0;

      // Fill light - tinted to preset colors, not white
      const flDir = normalize3(-0.5, 0.3, 0.4);
      const flDist = dist3(dirX - flDir[0], dirY - flDir[1], dirZ - flDir[2]);
      const fill = Math.exp(-flDist * flDist * 4.0);
      r += fill * envCol2[0] * 30.0;
      g += fill * envCol2[1] * 30.0;
      b += fill * envCol2[2] * 30.0;

      // Floor bounce
      const floorBounce = Math.max(-dirY, 0.0);
      r += floorBounce * envCol1[0] * 0.08;
      g += floorBounce * envCol1[1] * 0.08;
      b += floorBounce * envCol1[2] * 0.08;

      const idx = (y * size + x) * 4;
      data[idx] = Math.max(0, r);
      data[idx + 1] = Math.max(0, g);
      data[idx + 2] = Math.max(0, b);
      data[idx + 3] = 1.0;
    }
  }

  const envTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.needsUpdate = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();
  const envMap = pmrem.fromEquirectangular(envTexture).texture;
  envTexture.dispose();
  pmrem.dispose();
  return envMap;
}

// ================================================================
// Fluted glass material (port of original FlutedGlassMaterial)
// Uses MeshPhysicalMaterial + onBeforeCompile with exact original GLSL
// ================================================================
function createFlutedGlassMaterial(
  singleFluteWidth: number,
  params: typeof DEFAULT_PARAMS
): THREE.MeshPhysicalMaterial {
  // Exact parameters from original FlutedGlassMaterial constructor
  const mat = new THREE.MeshPhysicalMaterial({
    transmission: 1.0,
    roughness: 0,
    metalness: 0,
    ior: params.ior,
    thickness: params.thickness,
    specularIntensity: 0,
    specularColor: new THREE.Color(1, 1, 1),
    clearcoat: 0,
    clearcoatRoughness: 0,
    side: THREE.FrontSide,
    transparent: true,
    envMapIntensity: params.envIntensity,
  });

  // Custom uniforms for shader patch
  const customUniforms = {
    singleFluteWidth: { value: singleFluteWidth },
    fluteExponent: { value: params.fluteExponent },
    fluteDepth: { value: params.fluteDepth },
  };

  mat.onBeforeCompile = (shader) => {
    // Merge custom uniforms into shader
    Object.assign(shader.uniforms, customUniforms);

    // Fragment shader: add flute functions before main()
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
${FLUTE_FUNCTIONS_GLSL}`
    );

    // Fragment shader: compute flute normal after normal_fragment_maps
    // This is a direct port of the original's fragment shader patch
    // Uses vWorldPosition.x (available via transmission_pars_fragment)
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
{
    // Flute normal computation (direct port from original)
    float u = getFluteU(vWorldPosition.x);
    vec2 squircleNormalXZ = getSquircleNormalXZ(u, fluteExponent);
    vec3 fluteNormalModel = vec3(squircleNormalXZ.x, 0.0, squircleNormalXZ.y);
    vec3 blendedNormalModel = normalize(mix(vec3(0.0, 0.0, 1.0), fluteNormalModel, fluteDepth));
    normal = normalize(mat3(viewMatrix) * mat3(modelMatrix) * blendedNormalModel);
}`
    );

    // Store shader reference for runtime uniform updates
    mat.userData.shader = shader;
  };

  mat.needsUpdate = true;
  return mat;
}
