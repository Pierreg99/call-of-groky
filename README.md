# Call of Groky

Cinematic **Three.js** FPS greybox — **Loop 3** silhouette / lighting polish.

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
| Esc | Unlock pointer |

## Quality presets

Auto-detected from CPU cores / `deviceMemory`. Canvas MSAA off; AA is post.

| Preset | Pixel ratio | Shadow map | Post AA | Bloom | SSAO | Chromatic |
|--------|-------------|------------|---------|-------|------|-----------|
| **low** | ≤1 | **512** | FXAA | off | off | off |
| **medium** | ≤1.5 | 1536 | SMAA | subtle (hi thresh) | off | on |
| **high** | ≤2 | 2048 | SMAA | subtle (hi thresh) | on | on |

Vignette scales with preset. `prefers-reduced-motion: reduce` dampens recoil/bob, chromatic, and CSS vignette.

## Loop 3 features

- **Soldiers:** procedural low-poly helmet/armor/limb silhouettes with faction accents + contact blobs
- **Rifle viewmodel:** stock / handguard / optic / muzzle-brake silhouette; breath + walk bob
- **Lighting:** darker ambient, stronger key + cyan rim, neon-tinted PMREM; anti-milk bloom threshold
- **Fog:** density tied to engagement range (readable mid-fight)
- **Grounding:** floor AO/grout, oil/caution/scorch decals, prop contact shadows
- **AI cover:** crates + nav cover points; duck / peek-fire when damaged
- **Low preset:** ShadowMap ≤512

## Loop 2 carry-forward

Post stack (SSAO/bloom/SMAA), ADS, tracers/shells, patrol/chase/shoot AI, procedural WebAudio, AABB + floor pads, reduced-motion.

## Stack

- Vite 5 + TypeScript
- Three.js ≥ 0.170 (PointerLockControls, EffectComposer, SMAA/FXAA, UnrealBloom, SSAO, RoomEnvironment)

## Project layout

```
src/  engine player world combat enemies audio ui
docs/shots/   Critic gate screenshots
```

## Screenshots

See [`docs/shots/`](./docs/shots/).

## Honest gaps

See [`CRITIC.md`](./CRITIC.md). **Does not claim CoD visual parity.**

## License

MIT — see [LICENSE](./LICENSE).
