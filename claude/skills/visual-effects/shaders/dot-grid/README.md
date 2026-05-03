# Dot Grid Shader

Uniform dot matrix with per-dot phase-offset pulse animation.

## Visual Description

A regular grid of circular dots that breathe independently. Each dot has a random phase offset so the pulsing creates a gentle wave-like shimmer across the grid rather than synchronous flashing. Dot size and brightness oscillate together.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uDotSize` | float | 0.3 | Dot radius as fraction of cell size (0.05-0.48) |
| `uSpacing` | float | 20.0 | Grid density (dots per unit of UV space) |
| `uColor` | vec3 | `(1.0, 1.0, 1.0)` | Dot color |
| `uPulseSpeed` | float | 1.5 | Pulse animation speed in cycles/second |
| `uTime` | float | - | Elapsed time in seconds |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- `uDotSize` of 0.48 makes dots nearly touch at grid boundaries; 0.5 = solid fill
- `uSpacing` of 10 gives large dots; 40+ gives fine-grain texture
- Output alpha is dot coverage - composite over any background color
- Phase offset is per-cell hash, not spatial - dots do not form traveling waves
- Set `uPulseSpeed` to 0.0 for static non-animated dots
- Aspect ratio is corrected using `uResolution.x / uResolution.y` for square dots
