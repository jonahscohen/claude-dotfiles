# Glitch FX - Reference

Four categories of glitch simulation: VHS tape artifacts, digital compression errors, chromatic aberration, and data moshing.

## Glitch Type 1: VHS

Simulates magnetic tape degradation and analog signal noise.

**Techniques:**
- Horizontal scanline displacement: randomly shift rows of pixels left/right by varying offsets
- Tracking noise: periodic horizontal bands with increased displacement
- Color bleeding: red channel offset +N pixels, blue channel -N pixels horizontally
- Snow: random white pixels added at low probability
- Luminance rolloff: reduce brightness in horizontal bands (tracking loss)
- Interlacing: blend odd/even rows from slightly offset time frames

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `trackingError` | float | 0.3 | Severity of horizontal band displacement (0.0-1.0) |
| `colorBleed` | float | 0.02 | RGB channel horizontal offset in UV units |
| `noiseAmount` | float | 0.05 | White snow pixel density |
| `scanlineCount` | int | 240 | Number of interlace scanlines |
| `rollFrequency` | float | 0.5 | Tracking roll events per second |

## Glitch Type 2: Digital

Simulates codec/compression artifacts and bit errors.

**Techniques:**
- Block corruption: replace rectangular macro-blocks with shifted/colored variants
- DCT artifact simulation: overlay 8x8 ringing halos at high-contrast edges
- Bit-depth reduction: posterize to N-bit depth with per-channel randomization
- Pixel sorting: sort pixels by luminance within randomly chosen horizontal bands
- Color channel dropout: zero out one channel in corrupted regions

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `blockSize` | int | 16 | Macro-block size in pixels (8, 16, 32) |
| `corruptionRate` | float | 0.1 | Fraction of blocks that are corrupted (0.0-1.0) |
| `bitDepth` | int | 4 | Posterization depth per channel (1-8) |
| `sortBands` | int | 10 | Number of horizontal pixel-sort bands |

## Glitch Type 3: Chromatic Aberration

Simulates lens fringing from refractive index dispersion across wavelengths.

**Techniques:**
- Channel-split radial: R/G/B sampled from slightly different UV offsets radiating from center
- Channel-split directional: constant horizontal or vertical offset per channel
- Fringe intensity falloff: aberration strongest at edges, zero at center
- Spectral dispersion: more than 3 channels simulated with lerp between R and B

**Algorithm (radial):**
```
vec2 dir = uv - 0.5;
float dist = length(dir);
vec2 aberration = dir * dist * uStrength;
r = texture(src, uv - aberration * 0.5).r;
g = texture(src, uv).g;
b = texture(src, uv + aberration * 0.5).b;
```

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `strength` | float | 0.01 | Max UV offset for outermost channel (0.0-0.05) |
| `mode` | enum | `radial` | `radial`, `horizontal`, `vertical` |
| `falloff` | float | 2.0 | Exponent for edge-weighted intensity |

## Glitch Type 4: Data Moshing

Simulates inter-frame video codec artifacts (P-frame corruption).

**Techniques:**
- Motion vector reuse: apply motion vectors from one frame to different content
- I-frame deletion: skip keyframes, carry P-frame deltas indefinitely
- Smear: blend current frame with N previous frames at reduced opacity
- Block repeat: tile a source region across a destination region with offset

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `smearStrength` | float | 0.9 | Previous-frame carry-over weight (0.0-1.0) |
| `blockRepeat` | bool | false | Enable block region tiling |
| `motionScale` | float | 1.0 | Motion vector magnitude multiplier |
| `iFrameInterval` | int | 0 | Frames between keyframes (0 = never reset) |

## Compositing and Trigger Patterns

- **Always-on**: apply at fixed strength continuously
- **Triggered**: spike to max strength on an event (beat, click), decay exponentially
- **Random bursts**: Poisson process with configurable mean interval and duration
- **Rhythmic**: sync glitch frequency to an external BPM value

Glitch types compose additively. Common stack: Chromatic Aberration (always-on, low strength) + VHS (triggered, high strength on beats).
