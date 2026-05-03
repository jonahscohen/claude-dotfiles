// Fluid simulation reference implementation.
// GPU-accelerated incompressible Navier-Stokes with particle rendering.
// Tech: WebGL 1.0 (raw GL context). No Three.js dependency.
//
// Usage: instantiate a canvas, call the WebGL setup block, run the frame loop.
// The FluidGenerator component pattern is omitted - adapt the frame loop to your
// React/vanilla setup. The quality tier, shader programs, and FBO setup are
// the canonical reference.

const DEFAULT_PARAMS = {
  scene: 0,
  quality: "high",
  solverIterations: 20,
  curl: 0,
  velocityDissipation: 0.999,
  splatRadius: 0.015,
  splatForce: 1,
  particleDrag: 1.0,
  showDye: true,
  dyeAlpha: 1.0,
  dyeDissipation: 0.97,
  colorLow: "#0a0a1a",
  colorHigh: "#3060c0",
  colorGlow: "#8040ff",
  bgColor: "#000000",
};

/* ===================================================================
   SHADERS - faithful port from haxiomic/GPU-Fluid-Experiments
   cellSize = 32, simulation-space coordinates throughout
   =================================================================== */

// --- Vertex shader: texel-space.vert ---
const fluidVS = `
precision highp float;
attribute vec2 aPosition;
uniform float aspectRatio;
varying vec2 texelCoord;
varying vec2 p;
void main() {
  texelCoord = aPosition;
  vec2 clipSpace = 2.0 * texelCoord - 1.0;
  p = vec2(clipSpace.x * aspectRatio, clipSpace.y);
  gl_Position = vec4(clipSpace, 0.0, 1.0);
}
`;

// --- fluid-base.frag helpers (inlined into each shader that needs them) ---
const fluidBaseGLSL = `
vec2 clipToSimSpace(vec2 cs) {
  return vec2(cs.x * aspectRatio, cs.y);
}
vec2 simToTexelSpace(vec2 ss) {
  return vec2(ss.x / aspectRatio + 1.0, ss.y + 1.0) * 0.5;
}
float samplePressure(sampler2D pr, vec2 coord) {
  vec2 off = vec2(0.0);
  if (coord.x < 0.0)      off.x = 1.0;
  else if (coord.x > 1.0)  off.x = -1.0;
  if (coord.y < 0.0)      off.y = 1.0;
  else if (coord.y > 1.0)  off.y = -1.0;
  return texture2D(pr, coord + off * invresolution).x;
}
vec2 sampleVelocity(sampler2D vel, vec2 coord) {
  vec2 off = vec2(0.0);
  vec2 mult = vec2(1.0);
  if (coord.x < 0.0)      { off.x = 1.0;  mult.x = -1.0; }
  else if (coord.x > 1.0)  { off.x = -1.0; mult.x = -1.0; }
  if (coord.y < 0.0)      { off.y = 1.0;  mult.y = -1.0; }
  else if (coord.y > 1.0)  { off.y = -1.0; mult.y = -1.0; }
  return mult * texture2D(vel, coord + off * invresolution).xy;
}
`;

// --- Advection (advect.frag) ---
const advectFS = `
precision highp float;
precision highp sampler2D;
uniform sampler2D velocity;
uniform sampler2D target;
uniform float dt;
uniform float rdx;
uniform float aspectRatio;
uniform vec2 invresolution;
varying vec2 texelCoord;
varying vec2 p;

${fluidBaseGLSL}

void main() {
  vec2 tracedPos = p - dt * rdx * texture2D(velocity, texelCoord).xy;
  vec2 tc = simToTexelSpace(tracedPos) / invresolution;
  vec4 st;
  st.xy = floor(tc - 0.5) + 0.5;
  st.zw = st.xy + 1.0;
  vec2 t = tc - st.xy;
  st *= invresolution.xyxy;
  vec4 tex11 = texture2D(target, st.xy);
  vec4 tex21 = texture2D(target, st.zy);
  vec4 tex12 = texture2D(target, st.xw);
  vec4 tex22 = texture2D(target, st.zw);
  gl_FragColor = mix(mix(tex11, tex21, t.x), mix(tex12, tex22, t.x), t.y);
}
`;

// --- Divergence (velocity-divergence.frag) ---
const divergenceFS = `
precision highp float;
precision highp sampler2D;
uniform sampler2D velocity;
uniform float halfrdx;
uniform float aspectRatio;
uniform vec2 invresolution;
varying vec2 texelCoord;
varying vec2 p;

${fluidBaseGLSL}

void main() {
  vec2 L = sampleVelocity(velocity, texelCoord - vec2(invresolution.x, 0.0));
  vec2 R = sampleVelocity(velocity, texelCoord + vec2(invresolution.x, 0.0));
  vec2 B = sampleVelocity(velocity, texelCoord - vec2(0.0, invresolution.y));
  vec2 T = sampleVelocity(velocity, texelCoord + vec2(0.0, invresolution.y));
  gl_FragColor = vec4(halfrdx * ((R.x - L.x) + (T.y - B.y)), 0.0, 0.0, 1.0);
}
`;

// --- Pressure solve (pressure-solve.frag) ---
const pressureFS = `
precision highp float;
precision highp sampler2D;
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform float alpha;
uniform float aspectRatio;
uniform vec2 invresolution;
varying vec2 texelCoord;
varying vec2 p;

${fluidBaseGLSL}

void main() {
  float L = samplePressure(pressure, texelCoord - vec2(invresolution.x, 0.0));
  float R = samplePressure(pressure, texelCoord + vec2(invresolution.x, 0.0));
  float B = samplePressure(pressure, texelCoord - vec2(0.0, invresolution.y));
  float T = samplePressure(pressure, texelCoord + vec2(0.0, invresolution.y));
  float bC = texture2D(divergence, texelCoord).x;
  gl_FragColor = vec4((L + R + B + T + alpha * bC) * 0.25, 0.0, 0.0, 1.0);
}
`;

// --- Gradient subtract (pressure-gradient-subtract.frag) ---
const gradSubFS = `
precision highp float;
precision highp sampler2D;
uniform sampler2D pressure;
uniform sampler2D velocity;
uniform float halfrdx;
uniform float aspectRatio;
uniform vec2 invresolution;
varying vec2 texelCoord;
varying vec2 p;

${fluidBaseGLSL}

void main() {
  float L = samplePressure(pressure, texelCoord - vec2(invresolution.x, 0.0));
  float R = samplePressure(pressure, texelCoord + vec2(invresolution.x, 0.0));
  float B = samplePressure(pressure, texelCoord - vec2(0.0, invresolution.y));
  float T = samplePressure(pressure, texelCoord + vec2(0.0, invresolution.y));
  vec2 v = texture2D(velocity, texelCoord).xy;
  gl_FragColor = vec4(v - halfrdx * vec2(R - L, T - B), 0.0, 1.0);
}
`;

// --- MouseForce: BLEND toward target velocity (from Main.hx) ---
const mouseForceFS = `
precision highp float;
precision highp sampler2D;
uniform sampler2D velocity;
uniform float dt;
uniform float dx;
uniform float aspectRatio;
uniform vec2 invresolution;
uniform bool isMouseDown;
uniform vec2 mouseClipSpace;
uniform vec2 lastMouseClipSpace;
varying vec2 texelCoord;
varying vec2 p;

${fluidBaseGLSL}

float distToSegment(vec2 a, vec2 b, vec2 pt, out float fp) {
  vec2 d = pt - a;
  vec2 x = b - a;
  fp = 0.0;
  float lx = length(x);
  if (lx <= 0.0001) return length(d);
  float proj = dot(d, x / lx);
  fp = proj / lx;
  if (proj < 0.0) return length(d);
  else if (proj > lx) return length(pt - b);
  return sqrt(abs(dot(d, d) - proj * proj));
}

void main() {
  vec2 v = texture2D(velocity, texelCoord).xy;
  v *= 0.999; // velocity dissipation (from original)

  if (isMouseDown) {
    vec2 mouse = clipToSimSpace(mouseClipSpace);
    vec2 lastMouse = clipToSimSpace(lastMouseClipSpace);
    vec2 mouseVelocity = -(lastMouse - mouse) / dt;

    float fp;
    float l = distToSegment(mouse, lastMouse, p, fp);
    float taperFactor = 0.6;
    float projectedFraction = 1.0 - clamp(fp, 0.0, 1.0) * taperFactor;

    float R = 0.015;
    float m = exp(-l / R);
    m *= projectedFraction * projectedFraction;

    vec2 targetVelocity = mouseVelocity * dx;
    v += (targetVelocity - v) * m;
  }

  gl_FragColor = vec4(v, 0.0, 1.0);
}
`;

// --- MouseDye (from Main.hx) ---
const mouseDyeFS = `
precision highp float;
precision highp sampler2D;
uniform sampler2D dye;
uniform float dt;
uniform float dx;
uniform float aspectRatio;
uniform vec2 invresolution;
uniform bool isMouseDown;
uniform vec2 mouseClipSpace;
uniform vec2 lastMouseClipSpace;
varying vec2 texelCoord;
varying vec2 p;

${fluidBaseGLSL}

float distToSegment(vec2 a, vec2 b, vec2 pt, out float fp) {
  vec2 d = pt - a;
  vec2 x = b - a;
  fp = 0.0;
  float lx = length(x);
  if (lx <= 0.0001) return length(d);
  float proj = dot(d, x / lx);
  fp = proj / lx;
  if (proj < 0.0) return length(d);
  else if (proj > lx) return length(pt - b);
  return sqrt(abs(dot(d, d) - proj * proj));
}

void main() {
  vec4 color = texture2D(dye, texelCoord);
  color.r *= 0.9797;
  color.g *= 0.9494;
  color.b *= 0.9696;

  if (isMouseDown) {
    vec2 mouse = clipToSimSpace(mouseClipSpace);
    vec2 lastMouse = clipToSimSpace(lastMouseClipSpace);
    vec2 mouseVelocity = -(lastMouse - mouse) / dt;

    float fp;
    float l = distToSegment(mouse, lastMouse, p, fp);
    float taperFactor = 0.6;
    float projectedFraction = 1.0 - clamp(fp, 0.0, 1.0) * taperFactor;

    float R = 0.025;
    float m = exp(-l / R);

    float speed = length(mouseVelocity);
    float x = clamp((speed * speed * 0.02 - l * 5.0) * projectedFraction, 0.0, 1.0);
    color.rgb += m * (
      mix(vec3(2.4, 0.0, 5.9) / 60.0, vec3(0.2, 51.8, 100.0) / 30.0, x)
      + vec3(1.0) * pow(x, 9.0)
    );
  }

  gl_FragColor = vec4(color.rgb, 1.0);
}
`;

// --- Display texture ---
const displayFS = `
precision highp float;
precision highp sampler2D;
uniform float aspectRatio;
uniform vec2 invresolution;
varying vec2 texelCoord;
varying vec2 p;
uniform sampler2D uTexture;
void main() {
  gl_FragColor = abs(texture2D(uTexture, texelCoord));
}
`;

// --- Particle init (GPUParticles.hx InitialConditions) ---
const particleVS = `
precision highp float;
attribute vec2 aPosition;
varying vec2 texelCoord;
void main() {
  texelCoord = aPosition;
  gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
}
`;

const particleInitFS = `
precision highp float;
varying vec2 texelCoord;
void main() {
  vec2 ip = texelCoord * 2.0 - 1.0;
  gl_FragColor = vec4(ip, 0.0, 0.0);
}
`;

// --- Particle step (GPUParticles.hx StepParticles) ---
const particleStepFS = `
precision highp float;
precision highp sampler2D;
varying vec2 texelCoord;
uniform float dt;
uniform sampler2D particleData;
uniform float dragCoefficient;
uniform vec2 flowScale;
uniform sampler2D flowVelocityField;
void main() {
  vec2 pos = texture2D(particleData, texelCoord).xy;
  vec2 vel = texture2D(particleData, texelCoord).zw;
  vec2 vf = texture2D(flowVelocityField, (pos + 1.0) * 0.5).xy * flowScale;
  vel += (vf - vel) * dragCoefficient;
  pos += dt * vel;
  gl_FragColor = vec4(pos, vel);
}
`;

// --- Particle render (ColorParticleMotion from Main.hx) ---
const renderParticleVS = `
precision highp float;
precision highp sampler2D;
attribute vec2 particleUV;
uniform sampler2D particleData;
uniform vec3 uColorLow;
uniform vec3 uColorHigh;
uniform vec3 uColorGlow;
varying vec4 color;
void main() {
  vec2 pos = texture2D(particleData, particleUV).xy;
  vec2 vel = texture2D(particleData, particleUV).zw;
  gl_PointSize = 1.0;
  gl_Position = vec4(pos, 0.0, 1.0);
  float speed = length(vel);
  float x = clamp(speed * 4.0, 0.0, 1.0);
  color.rgb = mix(uColorLow, uColorHigh, x)
            + uColorGlow * x * x * x * 0.1;
  color.a = 1.0;
}
`;

const renderParticleFS = `
precision highp float;
varying vec4 color;
void main() {
  gl_FragColor = color;
}
`;

/* ===== HELPERS ===== */

interface Prog {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
}
interface FBO {
  texture: WebGLTexture; fbo: WebGLFramebuffer;
  width: number; height: number;
  attach: (id: number) => number;
}
interface DFBO {
  width: number; height: number;
  read: FBO; write: FBO; swap: () => void;
}

function hexToNorm(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

const QUALITY_MAP: Record<string, { particleExp: number; fluidScale: number; iterations: number; offScreenScale: number }> = {
  ultra: { particleExp: 20, fluidScale: 0.5,   iterations: 30, offScreenScale: 1 },
  high:  { particleExp: 20, fluidScale: 0.25,  iterations: 20, offScreenScale: 1 },
  medium:{ particleExp: 18, fluidScale: 0.25,  iterations: 18, offScreenScale: 1 },
  low:   { particleExp: 16, fluidScale: 0.2,   iterations: 14, offScreenScale: 1 },
};

/* ===== WEBGL SETUP REFERENCE =====
   The following is the canonical WebGL initialization and frame loop.
   Adapt the canvas creation and event wiring to your framework.
   ===== */

function createFluidSimulation(canvas: HTMLCanvasElement, quality = "high") {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

  const gl = canvas.getContext("webgl", {
    alpha: false, depth: false, stencil: false,
    antialias: false, preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DITHER);

  /* ---- Extensions ---- */
  const hfExt = gl.getExtension("OES_texture_half_float");
  gl.getExtension("OES_texture_half_float_linear");
  gl.getExtension("OES_texture_float");
  gl.getExtension("OES_texture_float_linear");

  function testFormat(type: number, filter: number): boolean {
    const t = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, 4, 4, 0, gl!.RGBA, type, null);
    const f = gl!.createFramebuffer();
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, f);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, t, 0);
    const ok = gl!.checkFramebufferStatus(gl!.FRAMEBUFFER) === gl!.FRAMEBUFFER_COMPLETE;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.deleteTexture(t); gl!.deleteFramebuffer(f);
    return ok;
  }

  const HF = hfExt ? hfExt.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;
  const floatType = testFormat(gl.FLOAT, gl.NEAREST) ? gl.FLOAT : testFormat(HF, gl.NEAREST) ? HF : gl.UNSIGNED_BYTE;
  const floatLinearType = testFormat(gl.FLOAT, gl.LINEAR) ? gl.FLOAT : testFormat(HF, gl.LINEAR) ? HF : gl.UNSIGNED_BYTE;

  /* ---- Geometry: texture quad [0,0]->[1,1] ---- */
  const quadVerts = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
  const quadVBO = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

  /* ---- Shader compilation ---- */
  function compile(type: number, src: string): WebGLShader {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS))
      console.error("Shader:", gl!.getShaderInfoLog(s));
    return s;
  }

  function prog(vs: string, fs: string, attribName = "aPosition"): Prog {
    const p = gl!.createProgram()!;
    gl!.attachShader(p, compile(gl!.VERTEX_SHADER, vs));
    gl!.attachShader(p, compile(gl!.FRAGMENT_SHADER, fs));
    gl!.bindAttribLocation(p, 0, attribName);
    gl!.linkProgram(p);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS))
      console.error("Link:", gl!.getProgramInfoLog(p));
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const n = gl!.getProgramParameter(p, gl!.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl!.getActiveUniform(p, i);
      if (info) { const loc = gl!.getUniformLocation(p, info.name); if (loc) uniforms[info.name] = loc; }
    }
    return { program: p, uniforms };
  }

  /* ---- Programs ---- */
  const advectP = prog(fluidVS, advectFS);
  const divP = prog(fluidVS, divergenceFS);
  const pressP = prog(fluidVS, pressureFS);
  const gradP = prog(fluidVS, gradSubFS);
  const mouseForceP = prog(fluidVS, mouseForceFS);
  const mouseDyeP = prog(fluidVS, mouseDyeFS);
  const displayP = prog(fluidVS, displayFS);
  const pInitP = prog(particleVS, particleInitFS);
  const pStepP = prog(particleVS, particleStepFS);
  const pRenderP = prog(renderParticleVS, renderParticleFS, "particleUV");

  /* ---- Blit ---- */
  function blit(target: FBO | null, w?: number, h?: number) {
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quadVBO);
    gl!.enableVertexAttribArray(0);
    gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);
    if (target) {
      gl!.viewport(0, 0, target.width, target.height);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
    } else {
      gl!.viewport(0, 0, w || gl!.drawingBufferWidth, h || gl!.drawingBufferHeight);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    }
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  /* ---- FBO factories ---- */
  function makeFBO(w: number, h: number, type: number, filter: number): FBO {
    gl!.activeTexture(gl!.TEXTURE0);
    const tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filter);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, w, h, 0, gl!.RGBA, type, null);
    const fb = gl!.createFramebuffer()!;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    return {
      texture: tex, fbo: fb, width: w, height: h,
      attach(id: number) { gl!.activeTexture(gl!.TEXTURE0 + id); gl!.bindTexture(gl!.TEXTURE_2D, tex); return id; },
    };
  }
  function makeDFBO(w: number, h: number, type: number, filter: number): DFBO {
    let a = makeFBO(w, h, type, filter), b = makeFBO(w, h, type, filter);
    return {
      width: w, height: h,
      get read() { return a; }, get write() { return b; },
      swap() { const t = a; a = b; b = t; },
    };
  }

  /* ---- Sim setup ---- */
  const qcfg = QUALITY_MAP[quality] || QUALITY_MAP.high;
  const CELL_SIZE = 32; // from original Main.hx
  const rdx = 1.0 / CELL_SIZE;
  const halfrdx = 0.5 * rdx;
  const alpha = -(CELL_SIZE * CELL_SIZE);

  const simW = Math.max(32, Math.round(gl.drawingBufferWidth * qcfg.fluidScale));
  const simH = Math.max(32, Math.round(gl.drawingBufferHeight * qcfg.fluidScale));
  const simAspect = simW / simH;
  const invRes: [number, number] = [1.0 / simW, 1.0 / simH];

  const velocity = makeDFBO(simW, simH, floatType, gl.NEAREST);
  const pressureFBO = makeDFBO(simW, simH, floatType, gl.NEAREST);
  const divergenceFBO = makeFBO(simW, simH, floatType, gl.NEAREST);
  const dyeFBO = makeDFBO(simW, simH, floatLinearType, floatLinearType === gl.UNSIGNED_BYTE ? gl.NEAREST : gl.LINEAR);

  // Clear dye FBOs to (0,0,0,1) - original uses RGB textures (implicit alpha=1)
  gl.clearColor(0, 0, 0, 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, dyeFBO.read.fbo);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, dyeFBO.write.fbo);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Offscreen render target
  const offW = Math.round(gl.drawingBufferWidth * qcfg.offScreenScale);
  const offH = Math.round(gl.drawingBufferHeight * qcfg.offScreenScale);
  const offscreen = makeFBO(offW, offH, gl.UNSIGNED_BYTE, gl.NEAREST);

  // flowScale: from GPUFluid.simToClipSpace
  const flowScaleX = 1.0 / (CELL_SIZE * simAspect);
  const flowScaleY = 1.0 / CELL_SIZE;

  /* ---- Set core uniforms on fluid shaders ---- */
  function setCoreUniforms(p: Prog) {
    gl!.useProgram(p.program);
    if (p.uniforms["aspectRatio"]) gl!.uniform1f(p.uniforms["aspectRatio"], simAspect);
    if (p.uniforms["invresolution"]) gl!.uniform2f(p.uniforms["invresolution"], invRes[0], invRes[1]);
  }
  [advectP, divP, pressP, gradP, mouseForceP, mouseDyeP].forEach(setCoreUniforms);

  /* ---- Particles ---- */
  const pTexSize = Math.ceil(Math.sqrt(1 << qcfg.particleExp));
  const numParticles = pTexSize * pTexSize;
  const particles = makeDFBO(pTexSize, pTexSize, floatType, gl.NEAREST);

  const pUVs = new Float32Array(numParticles * 2);
  for (let i = 0; i < numParticles; i++) {
    pUVs[i * 2] = (i % pTexSize) / pTexSize;
    pUVs[i * 2 + 1] = Math.floor(i / pTexSize) / pTexSize;
  }
  const particleUVBO = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, particleUVBO);
  gl.bufferData(gl.ARRAY_BUFFER, pUVs, gl.STATIC_DRAW);

  // Init particles
  gl.useProgram(pInitP.program);
  blit(particles.write); particles.swap();
  blit(particles.write); particles.swap();

  /* ---- Pointer state ---- */
  let mouseX = 0, mouseY = 0, lastMouseX = 0, lastMouseY = 0;
  let mouseClipX = 0, mouseClipY = 0, lastMouseClipX = 0, lastMouseClipY = 0;
  let isMouseDown = false;
  let mousePointKnown = false, lastMousePointKnown = false;

  function windowToClipX(x: number) { return (x / canvas.clientWidth) * 2 - 1; }
  function windowToClipY(y: number) { return ((canvas.clientHeight - y) / canvas.clientHeight) * 2 - 1; }

  function updateMouseCoord(x: number, y: number) {
    mouseX = x; mouseY = y;
    mouseClipX = windowToClipX(x);
    mouseClipY = windowToClipY(y);
    mousePointKnown = true;
  }
  function updateLastMouse() {
    lastMouseX = mouseX; lastMouseY = mouseY;
    lastMouseClipX = mouseClipX; lastMouseClipY = mouseClipY;
    lastMousePointKnown = mousePointKnown;
  }

  /* ---- Events ---- */
  function onMouseMove(e: MouseEvent) { const r = canvas.getBoundingClientRect(); updateMouseCoord(e.clientX - r.left, e.clientY - r.top); }
  function onMouseDown(e: MouseEvent) { isMouseDown = true; const r = canvas.getBoundingClientRect(); updateMouseCoord(e.clientX - r.left, e.clientY - r.top); updateLastMouse(); }
  function onMouseUp() { isMouseDown = false; }
  function onTouchStart(e: TouchEvent) { e.preventDefault(); const r = canvas.getBoundingClientRect(); const t = e.touches[0]; isMouseDown = true; updateMouseCoord(t.clientX - r.left, t.clientY - r.top); updateLastMouse(); }
  function onTouchMove(e: TouchEvent) { e.preventDefault(); const r = canvas.getBoundingClientRect(); const t = e.touches[0]; updateMouseCoord(t.clientX - r.left, t.clientY - r.top); }
  function onTouchEnd() { isMouseDown = false; }

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd);

  /* ---- Frame loop ---- */
  let lastTime = performance.now() / 1000;
  let rafId = 0;

  function frame() {
    const now = performance.now() / 1000;
    const dt = Math.min(now - lastTime, 0.02);
    lastTime = now;
    const p = DEFAULT_PARAMS;

    gl!.disable(gl!.BLEND);
    gl!.viewport(0, 0, simW, simH);
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quadVBO);

    // --- Advect velocity ---
    gl!.useProgram(advectP.program);
    gl!.uniform1f(advectP.uniforms["dt"], dt);
    gl!.uniform1f(advectP.uniforms["rdx"], rdx);
    gl!.uniform1i(advectP.uniforms["velocity"], velocity.read.attach(0));
    gl!.uniform1i(advectP.uniforms["target"], velocity.read.attach(0));
    blit(velocity.write); velocity.swap();

    // --- Apply forces (MouseForce - runs EVERY frame for v *= 0.999 dissipation) ---
    gl!.useProgram(mouseForceP.program);
    gl!.uniform1f(mouseForceP.uniforms["dt"], Math.max(dt, 0.001));
    gl!.uniform1f(mouseForceP.uniforms["dx"], CELL_SIZE);
    gl!.uniform1i(mouseForceP.uniforms["isMouseDown"], (lastMousePointKnown && isMouseDown) ? 1 : 0);
    gl!.uniform2f(mouseForceP.uniforms["mouseClipSpace"], mouseClipX, mouseClipY);
    gl!.uniform2f(mouseForceP.uniforms["lastMouseClipSpace"], lastMouseClipX, lastMouseClipY);
    gl!.uniform1i(mouseForceP.uniforms["velocity"], velocity.read.attach(0));
    blit(velocity.write); velocity.swap();

    // --- Divergence ---
    gl!.useProgram(divP.program);
    gl!.uniform1f(divP.uniforms["halfrdx"], halfrdx);
    gl!.uniform1i(divP.uniforms["velocity"], velocity.read.attach(0));
    blit(divergenceFBO);

    // --- Pressure solve ---
    gl!.useProgram(pressP.program);
    gl!.uniform1f(pressP.uniforms["alpha"], alpha);
    gl!.uniform1i(pressP.uniforms["divergence"], divergenceFBO.attach(0));
    for (let i = 0; i < p.solverIterations; i++) {
      gl!.uniform1i(pressP.uniforms["pressure"], pressureFBO.read.attach(1));
      blit(pressureFBO.write); pressureFBO.swap();
    }

    // --- Gradient subtract ---
    gl!.useProgram(gradP.program);
    gl!.uniform1f(gradP.uniforms["halfrdx"], halfrdx);
    gl!.uniform1i(gradP.uniforms["pressure"], pressureFBO.read.attach(0));
    gl!.uniform1i(gradP.uniforms["velocity"], velocity.read.attach(1));
    blit(velocity.write); velocity.swap();

    // --- Update dye (runs EVERY frame for color decay) ---
    gl!.useProgram(mouseDyeP.program);
    gl!.uniform1f(mouseDyeP.uniforms["dt"], Math.max(dt, 0.001));
    gl!.uniform1f(mouseDyeP.uniforms["dx"], CELL_SIZE);
    gl!.uniform1i(mouseDyeP.uniforms["isMouseDown"], (lastMousePointKnown && isMouseDown) ? 1 : 0);
    gl!.uniform2f(mouseDyeP.uniforms["mouseClipSpace"], mouseClipX, mouseClipY);
    gl!.uniform2f(mouseDyeP.uniforms["lastMouseClipSpace"], lastMouseClipX, lastMouseClipY);
    gl!.uniform1i(mouseDyeP.uniforms["dye"], dyeFBO.read.attach(0));
    blit(dyeFBO.write); dyeFBO.swap();

    // --- Advect dye ---
    gl!.useProgram(advectP.program);
    gl!.uniform1f(advectP.uniforms["dt"], dt);
    gl!.uniform1f(advectP.uniforms["rdx"], rdx);
    gl!.uniform1i(advectP.uniforms["velocity"], velocity.read.attach(0));
    gl!.uniform1i(advectP.uniforms["target"], dyeFBO.read.attach(1));
    blit(dyeFBO.write); dyeFBO.swap();

    // --- Step particles ---
    gl!.useProgram(pStepP.program);
    gl!.uniform1f(pStepP.uniforms["dt"], dt);
    gl!.uniform1i(pStepP.uniforms["particleData"], particles.read.attach(0));
    gl!.uniform1f(pStepP.uniforms["dragCoefficient"], p.particleDrag);
    gl!.uniform2f(pStepP.uniforms["flowScale"], flowScaleX, flowScaleY);
    gl!.uniform1i(pStepP.uniforms["flowVelocityField"], velocity.read.attach(1));
    gl!.viewport(0, 0, pTexSize, pTexSize);
    blit(particles.write); particles.swap();

    // --- Render to offscreen ---
    gl!.viewport(0, 0, offW, offH);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, offscreen.fbo);
    gl!.clearColor(0, 0, 0, 1);
    gl!.clear(gl!.COLOR_BUFFER_BIT);

    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.SRC_ALPHA, gl!.SRC_ALPHA);
    gl!.blendEquation(gl!.FUNC_ADD);

    // Render particles
    const colorLow = hexToNorm(p.colorLow);
    const colorHigh = hexToNorm(p.colorHigh);
    const colorGlow = hexToNorm(p.colorGlow);

    gl!.useProgram(pRenderP.program);
    gl!.uniform1i(pRenderP.uniforms["particleData"], particles.read.attach(0));
    gl!.uniform3f(pRenderP.uniforms["uColorLow"], colorLow[0], colorLow[1], colorLow[2]);
    gl!.uniform3f(pRenderP.uniforms["uColorHigh"], colorHigh[0], colorHigh[1], colorHigh[2]);
    gl!.uniform3f(pRenderP.uniforms["uColorGlow"], colorGlow[0], colorGlow[1], colorGlow[2]);

    gl!.bindBuffer(gl!.ARRAY_BUFFER, particleUVBO);
    gl!.enableVertexAttribArray(0);
    gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);
    gl!.drawArrays(gl!.POINTS, 0, numParticles);

    // Render dye (to same offscreen, same blend - matching original)
    if (p.showDye) {
      gl!.useProgram(displayP.program);
      gl!.uniform1i(displayP.uniforms["uTexture"], dyeFBO.read.attach(0));
      gl!.bindBuffer(gl!.ARRAY_BUFFER, quadVBO);
      gl!.enableVertexAttribArray(0);
      gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }

    gl!.disable(gl!.BLEND);

    // --- Blit offscreen to screen ---
    gl!.viewport(0, 0, gl!.drawingBufferWidth, gl!.drawingBufferHeight);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.useProgram(displayP.program);
    gl!.uniform1i(displayP.uniforms["uTexture"], offscreen.attach(0));
    gl!.bindBuffer(gl!.ARRAY_BUFFER, quadVBO);
    gl!.enableVertexAttribArray(0);
    gl!.vertexAttribPointer(0, 2, gl!.FLOAT, false, 0, 0);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

    updateLastMouse();
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return {
    dispose() {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
