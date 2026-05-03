# Fireworks Shader

Burst particles with gravity arc and color-spread per burst.

## Visual Description

Multiple independent firework bursts appear at random positions across the upper canvas. Each burst emits radially symmetric particles that arc downward under gravity. Bursts cycle with randomized timing so the screen always has active explosions. Colors are HSV-based with configurable hue spread.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uBurstCount` | float | 5.0 | Number of simultaneous burst emitters (1.0-8.0) |
| `uGravity` | float | 1.0 | Downward acceleration applied to particles (0.0-3.0) |
| `uTrailLength` | float | 2.0 | Time in seconds before burst fades out (0.5-4.0) |
| `uColorSpread` | float | 1.0 | Hue variation range across bursts (0.0-1.0) |
| `uTime` | float | - | Elapsed time in seconds |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- Burst count hard-caps at 8 and particles per burst at 12 due to GLSL loop constraints
- Each burst repeats on a 5-second cycle; `uTrailLength` controls visible window within that
- `uGravity` of 0.0 makes particles travel in straight lines (space or underwater effect)
- `uColorSpread` of 0.0 makes all bursts the same hue; 1.0 = full rainbow spread
- Use additive blending for best result against dark backgrounds
- Burst origin Y is limited to upper 60% of canvas (`hash * 0.6 + 0.2`)
