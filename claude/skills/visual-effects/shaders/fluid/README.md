# Fluid Simulation

GPU-accelerated incompressible fluid dynamics with particle rendering.

## Tech Stack
- WebGL 1.0 (raw GL context, not Three.js)
- GLSL fragment shaders for simulation passes
- Point sprites for particle rendering

## How It Works

The simulation runs as a series of GPU passes each frame:

1. **Advect velocity**: trace particles backward through the velocity field (semi-Lagrangian)
2. **Apply forces**: mouse interaction via segment-distance falloff + velocity dissipation (0.999/frame)
3. **Compute divergence**: measure velocity field divergence
4. **Pressure solve**: Jacobi iteration (configurable, default 20 iterations)
5. **Gradient subtract**: project velocity to be divergence-free
6. **Update dye**: inject color at mouse position with decay per channel (R:0.9797, G:0.9494, B:0.9696)
7. **Advect dye**: transport color through the velocity field
8. **Step particles**: advect particles through velocity field with drag
9. **Render**: composite particles + dye to offscreen target, then blit to screen

## Quality Tiers

| Tier | Particles | Fluid Scale | Solver Iterations |
|---|---|---|---|
| Ultra | 1,048,576 (2^20) | 50% | 30 |
| High | 1,048,576 (2^20) | 25% | 20 |
| Medium | 262,144 (2^18) | 25% | 18 |
| Low | 65,536 (2^16) | 20% | 14 |

## Key Constants
- Cell size: 32 (simulation space units)
- rdx: 1/32 (reciprocal cell size)
- Mouse force radius: 0.015 (simulation space)
- Dye injection radius: 0.025 (simulation space)

## Adapting to a Project
- Particle colors are configurable: `uColorLow`, `uColorHigh`, `uColorGlow`
- Map these to DESIGN.md color tokens
- Quality tier affects performance significantly - default to "high" for desktop, "medium" for mobile
- The dye color decay rates (R/G/B channels) create warm-cool drift - adjust for your palette
