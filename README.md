# Call of Groky

Cinematic **Three.js** FPS greybox — **Loop 2** quality pass.

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
| **low** | ≤1 | 1024 | FXAA | off | off | off |
| **medium** | ≤1.5 | 1536 | SMAA | subtle | off | on |
| **high** | ≤2 | 2048 | SMAA | subtle+ | on | on |

Vignette scales with preset. `prefers-reduced-motion: reduce` dampens recoil/bob, chromatic, and CSS vignette.

## Loop 2 features

- **Post stack:** EffectComposer → RenderPass → optional SSAO → UnrealBloomPass → chromatic → vignette → SMAA/FXAA → OutputPass
- **Materials:** procedural PBR with normal + roughness maps, metal/concrete contrast, neon emissives, PMREM `RoomEnvironment`
- **Weapon:** RMB ADS FOV lerp, dual-layer muzzle flash, additive cylinder tracers, shell casing eject
- **Enemies:** patrol → chase → shoot state AI with chip damage + hit flash (not proximity-only)
- **Audio:** procedural WebAudio (gunshot, reload, footstep, hit, death, enemy shot) with stereo distance
- **Collision:** AABB walls + walkable floor pads (north platform / ramp steps)
- **A11y:** reduced-motion dampens shake/vignette

## Phase 1 → Loop 2 (diff notes)

| Area | Phase 1 | Loop 2 |
|------|---------|--------|
| Render | Direct `renderer.render` | EffectComposer post stack |
| AA | Optional canvas MSAA | FXAA / SMAA gated by preset |
| Bloom / SSAO | None | Bloom med/high; SSAO high |
| Materials | Flat noise albedo | Normal + roughness maps, neon, PMREM |
| Weapon | Hip only | ADS FOV + shell casings |
| Enemies | Idle bob + proximity chip | Patrol/chase/shoot AI |
| Audio | Silent | Procedural WebAudio |
| Collision | AABB walls, flat floor | + raised floor pads |
| Motion prefs | None | `prefers-reduced-motion` |

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
