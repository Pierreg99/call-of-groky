# Call of Groky

Cinematic **Three.js** FPS greybox — **Loop 8** settings, defend-tower objective, weapon inspect, scout archetype.

Not a Call of Duty clone. Premium-feeling WebGL arena shooter (Vite + TypeScript + Three.js r170+). Browser Three.js pushed harder; still **not** an IW-engine peer.

## Play

**GitHub Pages:** https://pierreg99.github.io/call-of-groky/

## Run locally

Install deps, then start the Vite dev server; open the printed URL (base `/call-of-groky/`).
Production: Vite build to `dist/`, then Vite preview.

## Controls

| Input | Action |
|-------|--------|
| Click / Deploy | Pointer lock (desktop) |
| Tap Deploy | Start play (touch / coarse pointer — no PointerLock) |
| WASD | Move |
| Mouse | Look |
| Shift | Sprint |
| Ctrl | Crouch |
| Space | Jump |
| LMB | Fire |
| RMB | ADS (FOV lerp) |
| R | Reload |
| F | Inspect weapon (tap or long-press) |
| 1 / 2 | Switch rifle / SMG |
| Mouse wheel | Cycle weapons |
| Esc / gear | Settings (sensitivity + quality) |
| F3 / backtick | Toggle FPS counter |

### Mobile / touch

On touch / coarse-pointer devices an on-screen overlay appears after Deploy:

| Touch | Action |
|-------|--------|
| Left virtual stick | Move (WASD-equivalent) |
| Right-half drag | Look (yaw/pitch, no PointerLock) |
| FIRE (hold) | Fire |
| ADS (hold) | Aim down sights |
| JMP | Jump |
| RLD | Reload |
| SPR (hold) | Sprint |
| WPN | Switch weapon |
| INS | Inspect (optional) |

Buttons are ≥44px with safe-area insets. Desktop PointerLock path is unchanged.

## Objective

1. Eliminate **10** hostiles (waves at 5 and 10).
2. **Defend** the control tower zone for **30 seconds**.
3. **MISSION COMPLETE** win banner.

## Quality presets

Auto-detected from CPU cores / `deviceMemory`, overridable in Settings or `?quality=low|medium|high`. Canvas MSAA off; AA is post.

| Preset | Pixel ratio | Shadow map | Post AA | Bloom | SSAO | Chromatic |
|--------|-------------|------------|---------|-------|------|-----------|
| **low** | ≤1 | **512** | FXAA | off | off | off |
| **medium** | ≤1.5 | 1536 | SMAA | subtle (hi thresh) | off | on |
| **high** | ≤2 | 2048 | SMAA | subtle (hi thresh) | on | on |

Vignette scales with preset. `prefers-reduced-motion: reduce` dampens recoil/bob, chromatic, and CSS vignette.

## Loop 8 features

- **Settings panel:** look sensitivity + quality Low/Med/High (persisted)
- **Defend tower** hold after 10 kills → WIN
- **Weapon inspect** + switch polish
- **Scout** archetype (cyan / faster / fragile)
- Prior loops: minimap, waves, dual weapons, compass, tower, HDRI, killcam-lite, juice

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
