# Dither FX - Reference

Error diffusion and ordered dithering algorithms for palette reduction with perceptual accuracy.

## Algorithm Categories

### Ordered Dithering (threshold matrix)

A fixed Bayer matrix is tiled across the image. Each pixel's value is compared to the corresponding matrix threshold. Fast, GPU-friendly, produces a regular cross-hatch pattern.

Bayer 2x2 matrix (normalized 0-1):
```
0.00  0.50
0.75  0.25
```

Bayer 4x4 matrix (normalized 0-1):
```
0.000  0.500  0.125  0.625
0.750  0.250  0.875  0.375
0.188  0.688  0.063  0.563
0.938  0.438  0.813  0.313
```

Bayer 8x8: tile the 4x4 with the pattern `[M/4, M/4 + 0.5; M/4 + 0.75, M/4 + 0.25]`.

### Error Diffusion Algorithms

| Algorithm | Kernel | Serpentine | Notes |
|---|---|---|---|
| Floyd-Steinberg | Right: 7/16, Down-Left: 3/16, Down: 5/16, Down-Right: 1/16 | Yes | Classic; balanced diffusion |
| Jarvis-Judkins-Ninke | 3x3 neighborhood, 12 coefficients (total 48) | Yes | Smoother at cost of 3x more ops |
| Stucki | Jarvis variant with modified weights for sharper edges | Yes | Crisper than Jarvis |
| Atkinson | Only diffuses 6/8 of error (3 pixels right, 1 down-right, 2 down, 1 down-left) | No | Retains highlights; halftone look |
| Burkes | Right: 8/32, 2 right: 4/32, down-left: 2/32, down: 4/32, down-right: 8/32, 2 down-right: 4/32 | Yes | Faster Stucki approximation |
| Sierra | 3-row kernel, 10 coefficients (total 32) | Yes | Between Floyd-Steinberg and Stucki |

## Kernel Values

**Floyd-Steinberg (canonical):**
```
         [X]   7/16
3/16   5/16   1/16
```

**Atkinson (Apple Mac original):**
```
         [X]  1/8   1/8
1/8    1/8   1/8
         1/8
```
Note: only 6/8 of error is distributed. 2/8 "lost" - preserves bright highlights.

## Serpentine Scanning

When enabled, even rows scan left-to-right and odd rows scan right-to-left. Error propagates in the scan direction, so right-biased kernels mirror to left-biased on alternate rows. Serpentine reduces directional artifacts (diagonal stripe banding).

Disable for retro 1-bit aesthetics where directional grain is desired.

## Palette Reduction

Before diffusion, quantize each pixel to the nearest palette entry:

```
quantized = argmin over palette: distance(pixel, paletteColor)
```

Common distance metrics:
- Euclidean RGB: `sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)`
- Weighted RGB (perceptual): `sqrt(0.299*(r1-r2)^2 + 0.587*(g1-g2)^2 + 0.114*(b1-b2)^2)`
- Lab Delta-E: highest quality, convert to CIE Lab first

## Key Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `algorithm` | enum | `floyd-steinberg` | Diffusion algorithm |
| `palette` | color[] | `[black, white]` | Target color palette |
| `paletteSize` | int | 2 | Auto-generate palette with this many colors |
| `serpentine` | bool | true | Enable serpentine row scanning |
| `scale` | int | 1 | Downsample before dither, upsample after (pixel art) |
| `gamma` | float | 2.2 | Input gamma correction before quantization |

## Implementation Notes

- Error diffusion is inherently sequential - not GPU-parallelizable per-pixel
- For WebGL: compute on CPU, upload as texture, or use ping-pong FBOs with scanline constraints
- Ordered (Bayer) dithering is fully parallelizable and preferred for real-time use
- `scale` of 2-4 + Bayer produces a chunky pixel-art dither look
- Pre-convert input to linear light before diffusion; re-apply gamma after
