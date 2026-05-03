# Swarm

Interactive particle swarm with spring physics and shape morphing. Canvas 2D (CPU-based, no WebGL).

## Tech Stack
- HTML5 Canvas 2D
- Pure JavaScript physics (no dependencies)

## How It Works
1. Dots are arranged in a grid (configurable spacing)
2. Each dot has: home position, current position, velocity, orbit angle, orbit speed
3. Per frame: compute forces, apply physics, render

Physics per dot:
- If mouse is within attractRadius of the dot's HOME position (not current position):
  - Attract mode: pull toward mouse with orbital jitter (orbiting around cursor, not snapping to it)
  - Repel mode: push toward the attract radius boundary
  - Force uses cubic easing on the distance-to-radius ratio
- Return spring: always pulls dot back toward home (weakened to 15% when attracted)
- Friction: velocity *= friction each frame (default 0.92)

Render per dot:
- Color: interpolates idle->swarm based on displacement from home
- Alpha: interpolates idleAlpha->swarmAlpha based on displacement
- Size: base radius + displacement * 0.8
- Glow: activates when displacement > 40% (extra-size dot at glowAlpha)

## 6 Shape Types
circle, square, diamond, triangle, sparkle, cross - each drawn with Canvas 2D path commands.

## Key Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| gridSpacing | int | 18 | Pixels between dot home positions |
| dotRadius | float | 1 | Base dot radius |
| attractRadius | int | 220 | Mouse influence radius |
| attractStrength | float | 0.035 | Force toward mouse |
| repelMode | bool | false | Push instead of pull |
| orbitRadius | float | 30 | Orbit size around attract point |
| orbitJitter | float | 0.6 | Orbit randomness |
| friction | float | 0.92 | Velocity damping |
| returnStrength | float | 0.008 | Spring back to home |

## Adapting to a Project
- Colors (idleColor, swarmColor, bgColor) should come from DESIGN.md tokens
- gridSpacing 12-24 for most use cases (smaller = more dots = more CPU)
- This is CPU-only. For >5000 dots, consider WebGL particles instead.
- The orbit jitter creates organic movement. Set to 0 for mechanical feel, 0.6+ for organic.
