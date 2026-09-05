# Call of Groky

Cinematic **Three.js** FPS greybox scaffold — Phase 1 playable slice.

Not a Call of Duty clone. A premium-feeling WebGL arena shooter prototype built with Vite, TypeScript, and Three.js r170+.

## Play

**GitHub Pages:** https://pierreg99.github.io/call-of-groky/

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173/call-of-groky/`).

```bash
npm run build    # production bundle → dist/
npm run preview  # preview production build
```

## Controls

| Input | Action |
|-------|--------|
| Click / Deploy | Pointer lock |
| WASD | Move |
| Mouse | Look |
| Shift | Sprint |
| Ctrl | Crouch |
| Space | Jump |
| LMB | Fire |
| R | Reload |
| Esc | Unlock pointer |

## Phase 1 features

- WebGLRenderer with ACES Filmic tone mapping, shadows, color management, DPR clamp, quality presets
- Custom PointerLock FPS controller (sprint / jump / crouch, weapon bob & sway)
- Multi-room urban/military greybox with procedural concrete/metal PBR materials, fog, directional + hemisphere + point lights
- GROKY-16 rifle: muzzle flash, recoil, reload, hitscan, tracers, impact decals & sparks
- 4 damageable enemy targets with death pose
- HUD: crosshair, hitmarker, ammo, health, kill feed, deploy overlay

## Stack

- Vite 5 + TypeScript
- Three.js ≥ 0.170 (addons: `PointerLockControls`)

## Project layout

```
src/
  main.ts
  engine/     renderer + quality presets
  player/     FPS controller
  world/      arena + materials
  combat/     rifle + VFX
  enemies/    simple targets
  ui/         HUD bindings
```

## Known gaps (next loops)

- No AI pathfinding / shooting back (proximity chip damage only)
- Flat-floor collision (ramps/platforms are visual cover, not full walkables)
- Single weapon, no ADS, no sound
- No post-processing stack yet (bloom/SSAO optional later)
- No networked multiplayer

## License

MIT — see [LICENSE](./LICENSE).
