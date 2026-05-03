# Art Style FX - Reference

Five painterly and drawn art-style effects: Kuwahara, Crosshatch, Line Art, Engraving, and Stipple.

## Style 1: Kuwahara Filter (Oil Paint)

Produces a painterly, brush-stroked look by selecting the lowest-variance quadrant for each pixel.

**Algorithm:**
1. For each pixel, sample four overlapping square regions (NW, NE, SW, SE quadrants)
2. Compute mean and variance of luminance in each region
3. Output the mean color of the region with the lowest variance

This preserves edges (low variance at sharp boundaries) while smoothing interiors (large homogeneous regions have low variance too).

**Generalized Kuwahara:** Use N sectors arranged in a circle (not just 4 quadrants). Sectors with a weighting kernel (Gaussian) produce smoother, more circular brush strokes.

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `radius` | int | 5 | Sample region half-size in pixels (2-15) |
| `sectors` | int | 4 | Sectors (4 = classic, 8 = anisotropic) |
| `sharpness` | float | 8.0 | Variance weight exponent (higher = harder edges) |
| `iterations` | int | 1 | Apply filter N times for stronger effect |

## Style 2: Crosshatch

Replaces luminance values with overlapping sets of parallel lines at increasing angles.

**Algorithm:**
1. Divide luminance into N thresholds
2. At each threshold, draw a set of parallel lines at a specific angle
3. Darker regions accumulate more line sets

**Line sets by luminance band:**
| Band | Luminance range | Angle |
|---|---|---|
| 1 (lightest) | 0.75-1.0 | 45 degrees |
| 2 | 0.5-0.75 | 135 degrees |
| 3 | 0.25-0.5 | 0 degrees |
| 4 (darkest) | 0.0-0.25 | 90 degrees |

**Fragment core:** For each band, check `fract(dot(uv, lineDir) * freq) < lineWidth`. OR the bands together for accumulated darkness.

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `lineFrequency` | float | 40.0 | Lines per UV unit |
| `lineWidth` | float | 0.3 | Line fill fraction (0.0-0.5) |
| `bands` | int | 4 | Number of luminance bands |
| `inkColor` | vec3 | `(0,0,0)` | Line color |
| `paperColor` | vec3 | `(1,1,1)` | Background color |

## Style 3: Line Art (Edge Detection)

Produces clean ink outlines from a rendered scene via edge detection.

**Algorithm:**
1. Convert source to luminance
2. Apply Sobel or Prewitt operator to detect gradients
3. Threshold gradient magnitude to binary edge mask
4. Optionally dilate edges by 1px for thicker lines
5. Composite edge color over source or over white

**Sobel kernels:**
```
Gx: [-1  0  1]    Gy: [-1 -2 -1]
    [-2  0  2]         [ 0  0  0]
    [-1  0  1]         [ 1  2  1]
```
`gradient = sqrt(Gx^2 + Gy^2)`

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `threshold` | float | 0.1 | Gradient magnitude for edge detection |
| `lineColor` | vec3 | `(0,0,0)` | Detected edge color |
| `bgColor` | vec3 | `(1,1,1)` | Background (non-edge) color |
| `sourceBlend` | float | 0.0 | Blend source color into background (0=white bg) |
| `thickness` | int | 1 | Edge dilation passes |

## Style 4: Engraving

Simulates steel engraving: directional lines whose thickness varies with luminance.

**Algorithm:**
1. Sample source luminance at each pixel
2. Compute horizontal (or directional) line pattern: `fract(uv.y * freq)`
3. Map luminance to line width: darker pixels get thicker lines
4. Apply along-direction noise for organic variation

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `lineFrequency` | float | 60.0 | Engraving lines per UV unit |
| `angle` | float | 0.0 | Line direction in degrees |
| `noiseAmount` | float | 0.1 | Organic waviness of lines |
| `inkColor` | vec3 | `(0.05, 0.05, 0.1)` | Ink color |
| `paperColor` | vec3 | `(0.97, 0.95, 0.88)` | Paper/background color |

## Style 5: Stipple

Simulates pen stippling: sparse dots whose density encodes luminance.

**Algorithm:**
1. For each pixel, determine its luminance
2. Use a pseudo-random threshold per pixel: `threshold = fract(sin(dot(pixelCoord, seed)) * large)`
3. If `luminance < threshold`, place a dot; else leave blank
4. Dot radius can be fixed or luminance-proportional

**Ordered stipple variant:** Use a Bayer dither matrix as the threshold field for a structured pattern instead of random noise.

**Key parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `density` | float | 1.0 | Overall dot density multiplier |
| `dotRadius` | float | 1.5 | Dot size in pixels |
| `ordered` | bool | false | Use Bayer matrix instead of noise |
| `inkColor` | vec3 | `(0,0,0)` | Dot color |
| `paperColor` | vec3 | `(1,1,1)` | Background color |

## Compositing Notes

- All art styles output opaque results and expect a source FBO as input texture
- Stack Kuwahara + Line Art for a classic comic book look (paint fill + ink outlines)
- Stack Engraving + Crosshatch for 19th-century etching simulation
- Stipple composited over Kuwahara produces a textured pointillist painting effect
