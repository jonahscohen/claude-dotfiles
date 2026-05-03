# Liquid Metal Shader

Chrome/mercury surface simulation with flowing noise-based normals and specular highlights.

## Visual Description

A shimmering metallic surface that flows like viscous liquid. Bright specular highlights slide across a dark base as the normal map shifts with time. A color tint can push the chrome toward gold, copper, or iridescent hues.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uReflectivity` | float | 1.0 | Specular highlight intensity (0.0-2.0) |
| `uViscosity` | float | 0.5 | Flow speed multiplier - higher = slower (0.0-1.0) |
| `uTurbulence` | float | 1.0 | Surface detail density (0.5-3.0) |
| `uColorTint` | vec3 | `(1.0, 1.0, 1.0)` | RGB tint applied to the chrome surface |
| `uTime` | float | - | Elapsed time in seconds |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- `uViscosity` of 1.0 nearly stops flow; 0.0 is maximum speed
- `uTurbulence` above 2.0 creates fine grain; below 0.5 produces large rolling waves
- Gold tint: `uColorTint = (1.0, 0.75, 0.2)`; copper: `(0.9, 0.5, 0.2)`
- Requires derivative functions (`dFdx`/`dFdy`) - enable `GL_OES_standard_derivatives` in WebGL 1
- In WebGL 2 derivatives are always available
