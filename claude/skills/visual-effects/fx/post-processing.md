# Post-Processing FX Stack - Reference

17 stackable effects with parameter specs, GPU cost ratings, and compositing order constraints.

## Effect Catalog

### 1. Bloom

Bright regions bleed glow into surrounding pixels.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `threshold` | float | 0.8 | Luminance cutoff for bloom extraction |
| `radius` | int | 8 | Blur radius in pixels |
| `strength` | float | 1.0 | Bloom additive intensity |
| `iterations` | int | 3 | Gaussian passes (each doubles radius) |

GPU cost: Medium. Requires two-pass blur (horizontal + vertical separable Gaussian) per iteration.

### 2. Lens Flare

Simulated optical flare artifacts from bright point sources.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `sources` | vec2[] | auto-detect | Bright-point positions in UV |
| `ghosts` | int | 5 | Number of lens ghost elements |
| `haloRadius` | float | 0.3 | Primary halo ring radius |
| `chromaticSpread` | float | 0.02 | RGB fringe on ghost elements |

GPU cost: Low-Medium (procedural, no multi-pass needed).

### 3. Depth of Field

Blur pixels based on a depth map (near/far defocus).

| Parameter | Type | Default | Description |
|---|---|---|---|
| `focusDistance` | float | 0.5 | Depth value in focus (0.0-1.0) |
| `focusRange` | float | 0.1 | Half-width of sharp zone |
| `maxBlur` | float | 8.0 | Maximum blur radius in pixels |
| `depthTexture` | sampler2D | - | Grayscale depth map |

GPU cost: High. Bokeh-accurate DoF requires gather-based circle-of-confusion sampling.

Compositing: Must run before Bloom (blur-first, then glow extraction on blurred result).

### 4. Motion Blur

Samples scene along a velocity vector per pixel.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `samples` | int | 8 | Number of samples along velocity vector |
| `velocityTexture` | sampler2D | - | Per-pixel screen-space velocity |
| `strength` | float | 1.0 | Velocity multiplier |

GPU cost: Medium (proportional to `samples`).

Compositing: Apply before tone mapping, after all geometry passes.

### 5. Tone Mapping

Maps HDR linear values to LDR display range.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `operator` | enum | `aces` | `aces`, `reinhard`, `filmic`, `linear` |
| `exposure` | float | 1.0 | Pre-tonemap EV adjustment |
| `whitePoint` | float | 4.0 | Reinhard white point |

GPU cost: Negligible (single math op per pixel).

Compositing: Must run after all additive effects (Bloom, Lens Flare). Must run before LUT.

### 6. LUT (Color Grading)

3D lookup table color transformation.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `lutTexture` | sampler3D | - | 32x32x32 or 64x64x64 3D LUT |
| `intensity` | float | 1.0 | Blend between original and graded (0.0-1.0) |
| `lutSize` | int | 32 | LUT cube dimension |

GPU cost: Negligible (single texture lookup).

Compositing: Must run after Tone Mapping. Must run before Film Grain and Vignette.

### 7. Vignette

Darkens image edges with a smooth radial falloff.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `strength` | float | 0.5 | Darkening amount at corners (0.0-1.0) |
| `radius` | float | 0.8 | Inner edge of vignette (0.0-1.0) |
| `softness` | float | 0.4 | Gradient width |
| `color` | vec3 | `(0,0,0)` | Vignette color (default black) |

GPU cost: Negligible.

### 8. Film Grain

Additive noise simulating film silver-halide texture.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `strength` | float | 0.05 | Noise amplitude (0.0-0.2) |
| `size` | float | 1.0 | Grain clump size in pixels |
| `animated` | bool | true | New random grain each frame |
| `luminanceOnly` | bool | true | Add noise only to luminance channel |

GPU cost: Negligible.

Compositing: Must run last (after LUT, Vignette).

### 9. Chromatic Aberration

See glitch.md for full algorithm. Post-processing variant parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `strength` | float | 0.003 | Channel separation (subtle values for non-glitch use) |
| `mode` | enum | `radial` | `radial` or `directional` |

GPU cost: Low (3 texture samples per pixel).

Compositing: Apply before Bloom for correct glow on aberrated colors.

### 10. FXAA (Anti-Aliasing)

Fast approximate anti-aliasing pass.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `subpixelQuality` | float | 0.75 | Subpixel AA blend factor (0.0-1.0) |
| `edgeThreshold` | float | 0.125 | Edge detection sensitivity |
| `edgeThresholdMin` | float | 0.0312 | Darkness threshold to skip AA |

GPU cost: Low-Medium (edge detection + blending).

Compositing: Apply after all other effects. Cannot run mid-stack.

### 11. Sharpen

Unsharp mask to restore detail lost in blur-heavy effect chains.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `strength` | float | 0.5 | Sharpening intensity |
| `radius` | int | 1 | Sample offset in pixels |

GPU cost: Negligible (simple kernel convolution).

### 12. Screen-Space Ambient Occlusion (SSAO)

Darkens crevices and contact shadows using depth samples.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `samples` | int | 16 | Hemisphere sample count |
| `radius` | float | 0.5 | AO sample radius in view space |
| `bias` | float | 0.025 | Self-shadow prevention offset |
| `power` | float | 2.0 | AO intensity exponent |

GPU cost: High (requires depth + normal textures; hemisphere sampling).

Compositing: Apply before color grading; multiply into albedo or apply as shadow map.

### 13. God Rays (Volumetric Light)

Screen-space light shaft simulation via radial blur from a light source position.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `lightPos` | vec2 | `(0.5, 0.8)` | Light source UV position |
| `samples` | int | 64 | Ray march steps |
| `density` | float | 0.8 | Ray opacity |
| `weight` | float | 0.01 | Per-sample contribution |
| `decay` | float | 0.97 | Decay per step |

GPU cost: High (proportional to `samples`).

### 14. Pixelate

Reduces image to a mosaic of large pixels.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `blockSize` | int | 8 | Pixel block size |

GPU cost: Negligible.

### 15. Color Aberration (Prismatic)

Spectral dispersion more complex than simple 3-channel split.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `bands` | int | 7 | Number of spectral samples |
| `strength` | float | 0.02 | Dispersion spread |
| `spectrum` | sampler1D | built-in | Wavelength-to-RGB mapping |

GPU cost: Low-Medium.

### 16. Fog / Atmospheric Depth

Blends scene with a fog color based on depth.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `color` | vec3 | `(0.8, 0.85, 0.9)` | Fog color |
| `near` | float | 0.5 | Depth value where fog starts |
| `far` | float | 1.0 | Depth value for full fog |
| `density` | float | 1.0 | Exponential fog density |
| `mode` | enum | `linear` | `linear`, `exponential`, `exponential2` |

GPU cost: Negligible.

### 17. Scanlines

Overlays horizontal dark bands simulating CRT display.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `count` | float | 240.0 | Number of scanlines across canvas height |
| `darkening` | float | 0.3 | Darkness of scanline bands (0.0-1.0) |
| `animated` | bool | false | Slowly rolling scanlines |

GPU cost: Negligible.

## Recommended Compositing Order

Effects must run in this sequence to avoid incorrect interactions:

```
1.  SSAO              (geometry pass output)
2.  Fog               (depth-based)
3.  Chromatic Aberration
4.  Depth of Field
5.  Motion Blur
6.  God Rays
7.  Bloom
8.  Lens Flare
9.  Tone Mapping      (HDR -> LDR boundary)
10. LUT / Color Grade
11. Vignette
12. Sharpen
13. Pixelate
14. Scanlines
15. Film Grain
16. FXAA              (must be last before output)
17. Color Aberration (Prismatic)  (optional; can move before FXAA)
```

## GPU Cost Summary

| Cost | Effects |
|---|---|
| Negligible | Tone Mapping, LUT, Vignette, Film Grain, Sharpen, Pixelate, Scanlines, Fog |
| Low | Chromatic Aberration, Lens Flare, Prismatic Aberration |
| Medium | Bloom, Motion Blur, FXAA |
| High | DoF, SSAO, God Rays |

## Constraint Summary

- Tone Mapping is the hard HDR/LDR boundary - nothing additive after it
- LUT requires SDR input - always after Tone Mapping
- Film Grain must run last (otherwise it gets blurred/graded incorrectly)
- FXAA must run last (blends based on final pixel values)
- SSAO requires geometry pass depth/normals - cannot be applied to a flat source image
