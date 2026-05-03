# Halftone Post-Processing FX - Reference

Three halftone rendering modes: Mono, CMYK (four-channel screen separation), and Custom.

## Mode 1: Mono Halftone

Single-channel halftone. Luminance of the source image maps to dot size within a regular grid.

**Algorithm:**
1. Sample source pixel luminance
2. Establish a grid with cell size `dotSpacing`
3. Within each cell, compute distance from cell center
4. Dot radius = `luminance * dotSpacing * 0.5 * dotScale`
5. If `dist < dotRadius`, output dot color; else output background

**Screen angle:** Rotate the UV grid before cell computation to angle the dot rows.

**Fragment shader core:**
```glsl
vec2 rotateUV(vec2 uv, float angle) {
    float c = cos(angle); float s = sin(angle);
    return vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
}
// In main:
vec2 rotated = rotateUV(uv * uSpacing, uAngle);
vec2 cell = fract(rotated) - 0.5;
float dotR = lum * 0.5 * uDotScale;
float mask = smoothstep(dotR, dotR - 0.01, length(cell));
```

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `dotSpacing` | float | 20.0 | Grid frequency (dots per UV unit) |
| `dotScale` | float | 1.0 | Dot size multiplier at max luminance |
| `angle` | float | 45.0 | Screen rotation in degrees |
| `dotColor` | vec3 | `(0,0,0)` | Dot fill color |
| `bgColor` | vec3 | `(1,1,1)` | Background color |

## Mode 2: CMYK Halftone

Four-channel separation: Cyan, Magenta, Yellow, Black. Each channel rendered at its standard screen angle.

**Standard screen angles:**
| Channel | Angle | Rationale |
|---|---|---|
| Cyan (C) | 15 degrees | |
| Magenta (M) | 75 degrees | 60-degree separation from C |
| Yellow (Y) | 0 degrees | Low visibility, zero angle |
| Black (K) | 45 degrees | Primary channel, strongest optical angle |

**Color separation:**
```
K = 1 - max(R, G, B)
C = (1 - R - K) / (1 - K)
M = (1 - G - K) / (1 - K)
Y = (1 - B - K) / (1 - K)
```

**Rendering:** Render each channel independently as Mono halftone at its screen angle. Composite in subtractive mode: start from white, subtract each ink.

**Rosette pattern:** At correct angles, the four dot grids intersect to form a rosette pattern. Misaligned angles produce moire. The standard angles above are designed to minimize moire.

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `dotSpacing` | float | 20.0 | Base grid frequency (same for all channels) |
| `dotScale` | float | 1.0 | Dot size multiplier |
| `angleC` | float | 15.0 | Cyan screen angle in degrees |
| `angleM` | float | 75.0 | Magenta screen angle in degrees |
| `angleY` | float | 0.0 | Yellow screen angle in degrees |
| `angleK` | float | 45.0 | Black screen angle in degrees |
| `overprint` | bool | false | Additive rather than subtractive composite |

## Mode 3: Custom Halftone

Replaces dots with arbitrary shapes or allows shape-per-channel customization.

**Supported shapes:**
| Shape | Implementation |
|---|---|
| Circle | `length(cell) < radius` |
| Square | `max(abs(cell.x), abs(cell.y)) < radius` |
| Diamond | `abs(cell.x) + abs(cell.y) < radius` |
| Line | `abs(cell.y) < radius` (horizontal bars) |
| Cross | `abs(cell.x) < radius || abs(cell.y) < radius` |
| Custom SDF | User-provided signed distance function |

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `shape` | enum | `circle` | Dot shape |
| `dotSpacing` | float | 20.0 | Grid frequency |
| `angle` | float | 45.0 | Screen angle |
| `channelMode` | enum | `mono` | `mono` or `cmyk` |
| `shapePerChannel` | bool | false | Different shape per CMYK channel |

## Implementation Notes

- All three modes are single-pass fragment shaders over a fullscreen quad reading the source FBO
- CMYK can be computed in one pass by running all four channel loops and compositing in-shader
- `smoothstep` on dot edge avoids hard aliasing at the cost of slight dot size inaccuracy
- For print simulation: apply paper texture over the composited result
- Anti-aliasing: sample dot edge over a 1-pixel-wide ramp (`smoothstep(r - 0.5/res, r + 0.5/res, d)`)
