# Fractal Glass

Physical fluted glass material with fluid-driven distortion and procedural lighting.

## Tech Stack
- Three.js (WebGLRenderer, MeshPhysicalMaterial with onBeforeCompile patches)
- GLSL for flute normals and fluid simulation
- Real-time fluid simulation drives the distortion pattern behind the glass

## How It Works

1. A fluid simulation (Navier-Stokes, same solver as the standalone fluid effect) generates a moving color field
2. The color field is rendered as a background plane behind the glass
3. A glass plane uses MeshPhysicalMaterial with transmission=1.0 (fully transparent glass)
4. The glass has procedural fluted geometry: squircle-based normal computation creates vertical ridges
5. A procedural HDR environment map provides the lighting (softbox + fill + bounce, all tinted to palette)
6. Three.js ray-tracing through the physical material creates realistic refraction

## Key Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| fluteCount | int | 50 | Number of vertical flutes |
| fluteExponent | float | 2.0 | Squircle exponent (higher = sharper ridges) |
| fluteDepth | float | 1.0 | Blend between flat and fluted normals |
| ior | float | 1.3 | Index of refraction |
| thickness | float | 0.1 | Glass thickness for refraction |
| roughness | float | 0 | Surface roughness |
| envIntensity | float | 1.0 | Environment map brightness |
| turbulence | float | 0.1 | Fluid curl noise strength |
| fluidInfluence | float | 0.3 | How much fluid affects glass distortion |

## Color System
Uses a 7-color scheme:
- 4 base colors: background gradient (radial, center-to-edge)
- 3 env colors: procedural HDR environment map tinting

## Adapting to a Project
- The 7-color scheme should map to DESIGN.md tokens (primary, secondary, accent, background families)
- The tonal controls (highlight, midtone, shadow) adjust the gradient distribution
- Reduce fluteCount for more dramatic distortion, increase for subtlety
- On mobile, reduce fluid simulation resolution (FLUID_SIM_TEXTURE_SCALE) for performance
