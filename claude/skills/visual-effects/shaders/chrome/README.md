# Chrome Shader

Reflective chrome surface with environment map simulation and roughness-controlled specular.

## Visual Description

A pure chrome/mirror-like surface that reflects a procedurally generated environment. At low roughness the reflections are sharp and high-contrast. High roughness blurs the environment into a diffuse metallic sheen. The environment slowly shifts with time via `uWarpSpeed`.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uRoughness` | float | 0.1 | Surface roughness: 0.0 = mirror, 1.0 = matte (0.0-1.0) |
| `uEnvironmentIntensity` | float | 1.0 | Brightness of the reflected environment (0.0-2.0) |
| `uWarpSpeed` | float | 0.4 | Speed at which the environment drifts (0.0-2.0) |
| `uTime` | float | - | Elapsed time in seconds |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- `uRoughness` of 0.0 gives a perfect mirror with sharp noise-based reflections
- `uRoughness` of 1.0 flattens specular to a broad matte highlight
- `uEnvironmentIntensity` above 1.0 allows HDR-style overbright reflections
- `uWarpSpeed` of 0.0 freezes the environment (static chrome texture)
- Specular exponent scales from 2 (rough) to 64 (mirror) via `mix` based on roughness
- No texture samplers required - environment is fully procedural via layered noise
