# Call of Groky

Cinematic **Three.js** FPS greybox — Loop 8 settings, defend-tower objective, weapon inspect, scout archetype, desktop + touch controls.

Not a Call of Duty clone. Premium-feeling WebGL arena shooter (Vite + TypeScript + Three.js r170+). Browser Three.js pushed harder; still **not** an IW-engine peer.

**Ship:** Browser-AAA **GO** (User Accept, SwiftShader-only perf) · CoD visual parity **FAIL** — see [RELEASE.md](./RELEASE.md).

## Play

**GitHub Pages:** https://pierreg99.github.io/call-of-groky/

## Run locally

```bash
npm ci
npm run dev
```

Open the printed URL (Vite `base` is `/call-of-groky/`). Production:

```bash
npm run build
npm run preview
```

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
| INS | Inspect |

Buttons are ≥44px with safe-area insets. Desktop PointerLock path is unchanged.

## Objective

1. Eliminate **10** hostiles (waves at 5 and 10).
2. **Defend** the control tower zone for **30 seconds**.
3. **MISSION COMPLETE** win banner.

## Quality presets

Auto-detected from CPU cores / `deviceMemory`, overridable in Settings or `?quality=low|medium|high`. Canvas MSAA off; AA is post.

**User approve 2026-09-05:** Bloom / SSAO / Chromatic / SMAA on **all** presets. Low keeps ShadowMap **512** and pixelRatio cap **1**.

| Preset | Pixel ratio | Shadow map | Post AA | Bloom | SSAO | Chromatic |
|--------|-------------|------------|---------|-------|------|-----------|
| **low** | ≤1 | **512** | SMAA | on (subtle) | on | on |
| **medium** | ≤1.5 | 1536 | SMAA | on | on | on |
| **high** | ≤2 | 2048 | SMAA | on (punchier) | on | on |

Vignette scales with preset. `prefers-reduced-motion: reduce` dampens recoil/bob, chromatic, and CSS vignette.

## Loop 8 features

- **Settings panel:** look sensitivity + quality Low/Med/High (persisted)
- **Defend tower** hold after 10 kills → WIN
- **Weapon inspect** + switch polish
- **Scout** archetype (cyan / faster / fragile)
- Prior loops: minimap, waves, dual weapons, compass, tower, HDRI, killcam-lite, juice, touch overlay

## Stack

- Vite 5 + TypeScript
- Three.js ≥ 0.170 (PointerLockControls, EffectComposer, SMAA, UnrealBloom, SSAO, RGBELoader, GLTFLoader)

## Project layout

```
src/     engine player world combat enemies audio ui
public/  hdri models audio
docs/    shots credits ROADMAP PROGRESS PLAN gallery
```

## Documentation

| Doc | Contents |
|-----|----------|
| [RELEASE.md](./RELEASE.md) | Ship gates (GO / CoD FAIL / SwiftShader perf) |
| [CHANGELOG.md](./CHANGELOG.md) | Phase 1 → Loop 8 + Ship / PostFX / touch |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Near / mid / long; CoD-parity out of scope |
| [docs/PROGRESS.md](./docs/PROGRESS.md) | Loop and gate status table |
| [docs/PLAN.md](./docs/PLAN.md) | Architecture + optional next work |
| [docs/gallery.md](./docs/gallery.md) | Screenshot gallery |
| [CRITIC.md](./CRITIC.md) | Honest visual self-critique |
| [docs/credits/ATTRIBUTION.md](./docs/credits/ATTRIBUTION.md) | Third-party assets |
| [docs/LICENSES.md](./docs/LICENSES.md) | License summary |

## Screenshots

See [`docs/shots/`](./docs/shots/) and [`docs/gallery.md`](./docs/gallery.md).

## Honest gaps

See [`CRITIC.md`](./CRITIC.md). **Does not claim CoD visual parity.** Ship **GO** is Browser-AAA via User Accept (S5), not CoD PASS.

## Deutsch (kurz)

**Call of Groky** — cineastischer Three.js-FPS-Greybox (Vite + TypeScript). Spielen: https://pierreg99.github.io/call-of-groky/

Desktop: WASD / Maus / ADS / Nachladen / Einstellungen (Esc). Touch: virtueller Stick links, Look rechts, FIRE / ADS / JMP / RLD / SPR / WPN.

Ziel: 10 Gegner ausschalten, dann Kontrollturm **30 s** halten → MISSION COMPLETE.

Qualität: Low / Medium / High (Schatten 512 / 1536 / 2048); PostFX (Bloom, SSAO, Chromatik, SMAA) auf allen Presets freigeschaltet. **Ship GO** / **kein** CoD-Paritätsanspruch — Details in `RELEASE.md` und `CRITIC.md`.

## License

MIT — see [LICENSE](./LICENSE). Third-party CC0 assets and library notices: [docs/LICENSES.md](./docs/LICENSES.md), [docs/credits/ATTRIBUTION.md](./docs/credits/ATTRIBUTION.md).
