# Particles Shader

Floating particle field with proximity-based connection lines.

## Visual Description

Small bright dots drift slowly across the canvas. When two particles are within `uConnectionDistance` of each other, a translucent line connects them. Lines fade based on separation distance. Particles wrap toroidally at canvas edges.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uCount` | float | 40.0 | Number of particles (max 64 in this implementation) |
| `uDrift` | float | 0.05 | Particle travel speed (UV units/second) |
| `uConnectionDistance` | float | 0.25 | Maximum distance for drawing connection lines (0.0-0.5) |
| `uMouseRepulsion` | vec2 | `(0.5, 0.5)` | Mouse UV position (repulsion not applied in base shader) |
| `uTime` | float | - | Elapsed time in seconds |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- Particle count is hard-capped at 64 due to the double-loop GLSL constraint
- Performance scales as O(n^2) per fragment - keep `uCount` below 50 for 60fps
- `uDrift` of 0.0 freezes particles in their initial positions (useful for static layouts)
- `uConnectionDistance` of 0.0 disables all connection lines
- Mouse repulsion uniform is passed but not applied in this base version - add a repulsion force in `particlePos` if needed
- Particles use fractional position wrapping so they re-enter on the opposite edge
