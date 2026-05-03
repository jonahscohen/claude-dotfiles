# Spiral Shader

Logarithmic spiral arms with tri-color gradient and optional secondary harmonic arms.

## Visual Description

A galaxy-like spiral with a configurable number of luminous arms radiating from the center. Arms follow a logarithmic curve (equiangular spiral). Colors graduate across the radial distance using a three-stop gradient. The whole pattern rotates continuously.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uArms` | float | 3.0 | Number of spiral arms (1.0-8.0) |
| `uTightness` | float | 0.4 | Spiral winding rate - lower = tighter (0.1-1.0) |
| `uRotationSpeed` | float | 0.3 | Angular rotation speed in radians/second |
| `uColor1` | vec3 | `(0.1, 0.4, 1.0)` | Inner color stop |
| `uColor2` | vec3 | `(0.8, 0.2, 0.9)` | Mid color stop |
| `uColor3` | vec3 | `(1.0, 0.5, 0.0)` | Outer color stop |
| `uTime` | float | - | Elapsed time in seconds |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- `uArms` of 2.0 gives a classic galaxy look; 5+ produces a daisy-like pattern
- `uTightness` of 0.1 winds arms very tightly near center; 1.0 gives loose open arms
- Output alpha is non-zero along arm paths - composite over a dark background
- Secondary harmonic arms (at 2x frequency, 35% strength) are always rendered
- Use additive blending for a glow effect over dark backgrounds
