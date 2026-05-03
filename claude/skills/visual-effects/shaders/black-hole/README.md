# Black Hole Shader

Gravitational lensing distortion with accretion disk and procedural star field background.

## Visual Description

A black circular event horizon surrounded by an orange-to-yellow accretion disk. The surrounding star field warps toward the singularity. The disk slowly rotates and the lensing strength bends space proportionally to `uStrength`.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uStrength` | float | 0.3 | Gravitational lensing intensity (0.0-1.0) |
| `uRadius` | float | 0.2 | Event horizon radius in UV space (0.05-0.5) |
| `uRotationSpeed` | float | 0.5 | Accretion disk and field rotation speed |
| `uTime` | float | - | Elapsed time in seconds |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- `uStrength` above 0.6 creates extreme warping that may alias without anti-aliasing
- Event horizon (full black) is hard-clamped at `dist < uRadius` - no detail inside
- Star field is procedural (hash-based); no texture sampler needed
- Accretion disk sits at `0.7 * uRadius` distance and uses orange-yellow gradient
- Disk rotation direction is linked to `uRotationSpeed`; negative values reverse it
- Composite with `premultiplied alpha` for clean edge against dark backgrounds
