# Voronoi Shader

Worley noise cell diagram with animated cell boundaries and dual-color cell interiors.

## Visual Description

A field of organic, polygon-like cells separated by thin glowing edges. Cells shift and drift slowly over time. The interior of each cell blends between two configurable colors based on cell position.

## Uniforms

| Uniform | Type | Default | Description |
|---|---|---|---|
| `uCellCount` | float | 8.0 | Number of cells along each axis |
| `uEdgeWidth` | float | 0.05 | Thickness of cell boundary edges (0.0-0.2) |
| `uColor1` | vec3 | `(0.1, 0.3, 0.8)` | First cell interior color |
| `uColor2` | vec3 | `(0.8, 0.2, 0.5)` | Second cell interior color |
| `uEdgeColor` | vec3 | `(1.0, 1.0, 1.0)` | Edge line color |
| `uTime` | float | - | Elapsed time in seconds (drives animation) |
| `uResolution` | vec2 | - | Viewport dimensions in pixels |

## Usage Notes

- `uCellCount` between 4-20 covers most use cases; above 30 produces micro-noise
- `uEdgeWidth` of 0.0 removes edges entirely, leaving flat color cells only
- Cell animation speed is fixed at 0.5x time; multiply `uTime` before passing to speed up
- Cell color blends by `minPoint.x`, so colors distribute roughly left-to-right across cells
