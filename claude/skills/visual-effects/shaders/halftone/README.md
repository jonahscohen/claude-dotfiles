# Halftone Field

CMYK halftone dot-screen effect over a fluid-simulated color field.

## Tech Stack
- Three.js (WebGLRenderer, ShaderMaterial for halftone pass)
- Fluid simulation generates the color source (same Navier-Stokes solver)

## How It Works
1. Fluid simulation creates a moving, interactive color field (same as fractal-glass)
2. The halftone shader reads the fluid color field as its source
3. For each pixel: rotate into grid space, find the cell center, sample source color at cell center
4. Per-channel luminance lifting: brightens dark areas WITHOUT desaturating (preserves color ratios)
5. Dot radius is proportional to lifted luminance
6. Smooth edges via configurable softness parameter

## Key Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| dotSize | float | 12 | Pixel size of halftone grid cells |
| gridAngle | float | 15 | Grid rotation in degrees |
| contrast | float | 1.0 | Contrast curve (higher = more punch) |
| softness | float | 0.4 | Dot edge softness in pixels |
| invert | bool | false | Invert: large dots on dark, small on bright |

## Luminance Lifting Technique
The shader's key innovation: instead of `pow(luminance, 0.5)` on each channel (which desaturates), it computes a lifted luminance and scales all channels by the same ratio. Then pushes saturation further with `mix(vec3(avg), lifted, 1.5)`. This preserves vivid colors even in dark areas.

## Adapting to a Project
- Map the 4 base colors to DESIGN.md palette
- dotSize 8-16 for web, 20+ for large-format/print aesthetic
- gridAngle 0 for clean grid, 15-45 for classic halftone rotation
- Invert mode creates a dark-field effect (dots are bright on dark background)
