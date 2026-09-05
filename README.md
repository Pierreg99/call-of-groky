# Call of Groky

Cinematic **Three.js** FPS greybox — **Loop 6** dual weapons (rifle + SMG), compass objective, control-tower landmark.

Not a Call of Duty clone. Premium-feeling WebGL arena shooter (Vite + TypeScript + Three.js r170+). Browser Three.js pushed harder; still **not** an IW-engine peer.

## Play

**GitHub Pages:** https://pierreg99.github.io/call-of-groky/

## Run locally

Install deps, then start the Vite dev server; open the printed URL (base `/call-of-groky/`).
Production: Vite build to `dist/`, then Vite preview.

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
| RMB | ADS (FOV lerp) |
| R | Reload |
| 1 / 2 | Switch rifle / SMG |
| Mouse wheel | Cycle weapons |
| F3 / ` | Toggle FPS counter |
| Esc | Unlock pointer |

## Quality presets

Auto-detected from CPU cores / `deviceMemory`. Canvas MSAA off; AA is post.

| Preset | Pixel ratio | Shadow map | Post AA | Bloom | SSAO | Chromatic |
|--------|-------------|------------|---------|-------|------|-----------|
| **low** | ≤1 | **512** | FXAA | off | off | off |
| **medium** | ≤1.5 | 1536 | SMAA | subtle (hi thresh) | off | on |
| **high** | ≤2 | 2048 | SMAA | subtle (hi thresh) | on | on |

Vignette scales with preset. `prefers-reduced-motion: reduce` dampens recoil/bob, chromatic, and CSS vignette.

## Loop 6 features

- **Dual weapons:** GROKY-16 rifle + GROKY-9 SMG — distinct RPM/recoil/ADS/spread; switch 1/2 or scroll
- **Ammo pickups** + per-weapon reserve
- **Compass + objective:** needle to control tower; survive/clear **10 eliminations**
- **Control tower landmark:** stairs, deck, consoles, aisle shelves, mast (screenshot composition)
- **Soldier poses / viewmodel / HDRI / killcam-lite** retained from Loops 4–5
- **Fog:** engagement-tuned Exp2

## Stack

- Vite 5 + TypeScript
- Three.js ≥ 0.170 (PointerLockControls, EffectComposer, SMAA/FXAA, UnrealBloom, SSAO, RGBELoader, GLTFLoader)

## Project layout

```
src/  engine player world combat enemies audio ui
public/hdri  public/models
docs/shots/  docs/credits/
```

## Screenshots

See [`docs/shots/`](./docs/shots/). Third-party credits: [`docs/credits/ATTRIBUTION.md`](./docs/credits/ATTRIBUTION.md).

## Honest gaps

See [`CRITIC.md`](./CRITIC.md). **Does not claim CoD visual parity.**

## License

MIT — see [LICENSE](./LICENSE). Third-party CC0 assets attributed in `docs/credits/ATTRIBUTION.md`.
