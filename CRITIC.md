# CryoCritic — Loop 6 visual self-critique

**Verdict: FAIL vs modern Call of Duty.** Expected. Browser Three.js greybox with dual weapons, compass objective, and a denser control-tower landmark; still not IW/Treyarch production.

Artifact-Gate (screenshots + green build + Pages) is the deliverable bar. **Do not claim CoD PASS.**

## Preset matrix (PR / Shadow / PostFX)

| Preset | PR cap | Shadow map | PostFX stack |
|--------|--------|------------|--------------|
| low | 1.0 | **512** | Render → FXAA → Vignette → Output |
| medium | 1.5 | 1536 | Render → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |
| high | 2.0 | 2048 | Render → SSAO → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |

`prefers-reduced-motion` cuts chromatic to 0, vignette ~35%, recoil/bob x0.25.

### Perf note (best-effort, Low preset)

**No `/dev/dri` on the agent box** — captures use Chrome headless + **SwiftShader** (`--use-angle=swiftshader`). Not a discrete-GPU frame-time capture.

| Context | Approx FPS | Approx 1% low | Notes |
|---------|------------|---------------|-------|
| Desktop Low (1440×900, `quality=low`) | **~18–23** (headless noise; virtual-time dumps unusable) | mid-teens | **SwiftShader only** — no `/dev/dri` |
| Mobile Low (390×844, `quality=low`) | **~16–21** | ~16–19 | SwiftShader; extra HUD/compass cost small |

Expect materially higher numbers on a real discrete GPU. Low preset keeps ShadowMap **≤512**, no bloom/SSAO.

## What improved (Loop 5 → Loop 6)

- **Second weapon:** **GROKY-9 SMG** — distinct compact viewmodel, higher RPM (~900), wider hip spread, snappier recoil recovery vs GROKY-16 rifle. Switch via **1/2** or **mouse wheel** with raise-on-switch.
- **Recoil / ADS / fire-rate polish:** Per-weapon `recoilPitch` / `recoilYaw` / `recoilAdsMul` / `kickAmount` / hip+ADS poses; rifle tighter ADS, SMG more lateral chatter.
- **Ammo pickups:** Glowing crates in courtyard + tower; walk-over adds reserve (cap 2× base).
- **Compass + objective:** Top-center compass needle toward control tower; HUD objective **SECURE TOWER · ELIMINATE N/10** with progress bar.
- **Landmark room:** **Control tower** — stairs to upper deck, consoles/monitors, window frames, shelf aisle, mast, dedicated fill lights — denser screenshot composition than flat courtyard.
- **Shadows:** Low still **512**; Med 1536; High 2048.

## What still fails vs modern CoD (harsh)

1. Not true GPU skinning / authored anim clips / LODs — hierarchical procedural body + GLB rifle, not MetaHuman.
2. HDRI reflections only; no lightmaps, probes, or volumetrics; fog still Exp2.
3. Materials mostly procedural noise / simple PBR; no AAA trim sheets.
4. Post: not TAAU / weapon DOF / local exposure.
5. Viewmodel hybrid procedural; no inspect / attachment swap / shared ammo pool UX polish.
6. AI: static cover anchors; no navmesh / suppression / flanking.
7. World denser (tower) but still greybox vs CoD multiplayer art.
8. Audio: richer synth, still not recorded Foley packs; no unique SMG sample.
9. Perf: SSAO costly on high; no occlusion culling / GPU particles; agent FPS is SwiftShader-only.
10. Juice: killcam-lite + ragdoll-lite ≠ full killcam / PhysX ragdoll; objective is kill-count only (no extract / defend timer).
11. Compass is 2D needle, not a true mini-map with fog-of-war / teammate pings.

## Gate artifacts

- Screenshots: `docs/shots/01-mid-greybox.png`, `02-combat.png`, `03-hud-closeup.png`, `04-hud-mobile.png`
- Credits: `docs/credits/ATTRIBUTION.md`
- Pages: https://pierreg99.github.io/call-of-groky/
- Production `tsc` + Vite build must stay green

## Next loops

- Real skinned GLB (or embed weights) with aim/walk clips; navgrid; light probes / AO bake; streamed CC0 Foley if size budget allows; true mini-map splat; weapon inspect
