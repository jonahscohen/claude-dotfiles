# ASCII FX - Reference

Converts rendered pixel luminance to ASCII character density, optionally preserving source color.

## Algorithm Overview

1. Divide the canvas into fixed-size character cells (e.g. 8x8 px)
2. Sample luminance at cell center (or average over cell)
3. Map luminance (0.0-1.0) to a character from the density string
4. Render the character at cell position using a monospace font
5. Color each character from the source pixel (color-preserve mode) or use a single tint

## Character Set Variants

| Variant | Character String (dark to bright) | Notes |
|---|---|---|
| Standard | ` .:-=+*#%@` | 10-step classic |
| Dense | `` .'`^",:;Il!i><~+_-?][}{1)(|\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$`` | 70-step Paulhamus set |
| Block | ` ░▒▓█` | Unicode block elements |
| Braille | ` ⠂⠆⠇⠧⠷⠿` | 6-dot patterns |
| Math | ` +-×÷=≠≈∞` | Thematic for data viz |
| Minimal | ` .+X#` | 5-step, coarse grain |
| Inverted | `@%#*+=-:. ` | Light background |
| Custom | Any user-defined string | Sorted by visual weight |

## Density Mapping Algorithm

```
charIndex = floor(luminance * (charSet.length - 1))
charIndex = clamp(charIndex, 0, charSet.length - 1)
```

Luminance from RGB: `lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722))` (Rec. 709)

Optional gamma correction before mapping: `lum = pow(lum, gamma)` where gamma 0.5-2.0 adjusts contrast.

## Color Preservation Modes

| Mode | Description |
|---|---|
| `monochrome` | Single foreground color, transparent or solid background |
| `source-color` | Character color taken from source pixel RGB |
| `source-luminance` | Hue from config, saturation/lightness from source |
| `heat-map` | Luminance mapped to configurable gradient |
| `inverted` | Source color inverted per character |

## Key Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cellSize` | int | 8 | Pixel width/height of each character cell |
| `charSet` | string | `Standard` | Character density set (see variants table) |
| `colorMode` | enum | `source-color` | Color preservation mode |
| `foreground` | hex | `#ffffff` | Tint color when colorMode is monochrome |
| `background` | hex | `transparent` | Fill behind characters |
| `gamma` | float | 1.0 | Luminance gamma before density mapping |
| `fontFamily` | string | `monospace` | CSS font family for rendering |

## Implementation Notes

- Canvas 2D: render scene to offscreen canvas, read pixels with `getImageData`, iterate cells, draw characters with `fillText`
- WebGL: requires a two-pass approach - scene to FBO, then ASCII pass reads the FBO as a texture
- For WebGL ASCII pass: encode character as UV into a font texture atlas; sample atlas in fragment shader
- Cell size must divide evenly into the output dimensions to avoid partial cells at edges
- At `cellSize` 4 or less, character glyphs become unreadable - use block characters instead
