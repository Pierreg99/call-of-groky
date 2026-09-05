# CryoCritic — Loop 7 visual self-critique

**Verdict: FAIL vs modern Call of Duty.** Expected. Browser Three.js greybox with minimap, wave spawns, damage/streak juice, and SMG muzzle/SFX identity; still not IW/Treyarch production.

Artifact-Gate (screenshots + green build + Pages) is the deliverable bar. **Do not claim CoD PASS.**

User skipped Ship-Gate S5 → **continue looping**. See [`RELEASE.md`](./RELEASE.md): **Ship-Perf unverified** (SwiftShader-only on agent box).

## Preset matrix (PR / Shadow / PostFX)

| Preset | PR cap | Shadow map | PostFX stack |
|--------|--------|------------|--------------|
| low | 1.0 | **512** | Render → FXAA → Vignette → Output |
| medium | 1.5 | 1536 | Render → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |
| high | 2.0 | 2048 | Render → SSAO → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |

`prefers-reduced-motion` cuts chromatic to 0, vignette ~35%, recoil/bob x0.25.

### Perf note (best-effort, Low preset)

**No `/dev/dri` on the agent box** — captures use Chrome headless + **SwiftShader** (`--use-angle=swiftshader`). Not a discrete-GPU frame-time capture. **Ship-Perf: unverified.**

| Context | Approx FPS | Approx 1% low | Notes |
|---------|------------|---------------|-------|
| Desktop Low (1440×900, `quality=low`) | **~17–22** (headless noise) | mid-teens | **SwiftShader only** — no `/dev/dri` |
| Mobile Low (390×844, `quality=low`) | **~15–20** | ~15–18 | SwiftShader; minimap canvas cost small |

Expect materially higher numbers on a real discrete GPU. Low preset keeps ShadowMap **≤512**, no bloom/SSAO.

## What improved (Loop 6 → Loop 7)

- **Minimap radar:** CSS/canvas top-down — player chevron, enemy blips, tower objective marker; camera-yaw oriented.
- **Wave spawn:** +3 hostiles at 5 kills, +4 at 10 kills (objective progress reinforcements).
- **Juice:** floating damage numbers; kill-streak toasts (double / triple / spree).
- **SMG identity:** orange muzzle flash + point light; layered higher-pitch `gunshotSmg` synth vs rifle.
- **Combat framing:** capture poses snap enemies facing camera (readable silhouettes in `02-combat.png`).
- **Shadows:** Low still **512**; Med 1536; High 2048.

## What still fails vs modern CoD (harsh)

1. Not true GPU skinning / authored anim clips / LODs — hierarchical procedural body + GLB rifle, not MetaHuman.
2. HDRI reflections only; no lightmaps, probes, or volumetrics; fog still Exp2.
3. Materials mostly procedural noise / simple PBR; no AAA trim sheets.
4. Post: not TAAU / weapon DOF / local exposure.
5. Viewmodel hybrid procedural; no inspect / attachment swap / shared ammo pool UX polish.
6. AI: static cover anchors; no navmesh / suppression / flanking; waves are spawn bumps only.
7. World denser (tower) but still greybox vs CoD multiplayer art.
8. Audio: richer synth + SMG layer, still not recorded Foley packs.
9. Perf: SSAO costly on high; no occlusion culling / GPU particles; agent FPS is SwiftShader-only.
10. Juice: killcam-lite + ragdoll-lite ≠ full killcam / PhysX ragdoll; objective is kill-count only (no extract / defend timer).
11. Minimap is a simple radar splat — no fog-of-war / teammate pings / ping wheel.

## Gate artifacts

- Screenshots: `docs/shots/01-mid-greybox.png`, `02-combat.png`, `03-hud-closeup.png`, `04-hud-mobile.png`
- Credits: `docs/credits/ATTRIBUTION.md`
- Release: `RELEASE.md` (Ship-Perf unverified)
- Pages: https://pierreg99.github.io/call-of-groky/
- Production `tsc` + Vite build must stay green

## Next loops

- Real skinned GLB with aim/walk clips; navgrid; light probes / AO bake; streamed CC0 Foley if size budget allows; weapon inspect; extract/defend objective mode
