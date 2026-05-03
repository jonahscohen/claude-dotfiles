# Mesh Gradient

Animated 3D mesh gradient using simplex noise vertex displacement with per-vertex color mixing.

## Tech Stack
- Three.js (WebGLRenderer, ShaderMaterial, PlaneGeometry)
- GLSL vertex + fragment shaders

## How It Works
1. A subdivided plane (200x200 segments) is rendered with a custom ShaderMaterial
2. The vertex shader displaces vertices using simplex 3D noise, creating flowing waves
3. Colors are computed per-vertex via layered noise thresholding: each color gets its own noise field with unique frequency, flow, and speed parameters
4. GPU interpolates colors across triangles for smooth blending
5. Fragment shader adds optional Bayer 4x4 ordered dithering and film grain

## Key Parameters

| Uniform | Type | Default | Description |
|---|---|---|---|
| uColor | vec3[5] | - | Up to 5 gradient colors (linear RGB) |
| uColorCount | int | 5 | Number of active colors |
| uFrequency | vec2 | (3.0, 6.0) | Noise frequency (x, y) |
| uAmount | float | 0.2 | Vertex displacement strength |
| uSpeed | float | 0.02 | Animation speed |
| uGrainIntensity | float | 0.02 | Film grain amount (0 = off) |
| uDitherEnabled | bool | false | Enable Bayer dithering |
| uDitherStrength | float | 0.3 | Dither intensity |

## Setup
- Camera: PerspectiveCamera at (0, 0.5, 0.4) looking at origin, FOV 35
- Geometry: PlaneGeometry(1.5, 1.5, 200, 200), rotated -90deg on X
- Material: ShaderMaterial with DoubleSide rendering
- Colors: convert hex to linear RGB before passing to shader

## Adapting to a Project
- Replace the 5 default colors with DESIGN.md color tokens
- Adjust uFrequency and uAmount for the desired visual density
- Enable dithering for a textured/print aesthetic
- Use grain sparingly (0.01-0.03) for subtle film quality
