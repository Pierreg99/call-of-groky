# Call of Groky

Cinematic **Three.js** FPS greybox — **Loop 4** HDRI + CC0 glTF soldier polish.

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

## Loop 4 features

- **HDRI:** Poly Haven Empty Warehouse 01 (CC0) via RGBELoader + PMREM; stronger indirect bounce
- **Soldiers:** CC0 glTF male + assault rifle (~43KB); procedural fallback + faction accents
- **Viewmodel:** procedural rifle with gloved hands; breath/walk bob
- **Killcam-lite:** eliminate banner + timescale/FOV punch; stylized blood blotches
- **Audio:** richer procedural WebAudio layers
- **FPS:** on-screen counter toggle (F3)
- **Fog:** engagement-tuned Exp2 (readable mid-fight)

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
