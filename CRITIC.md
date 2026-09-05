# CryoCritic — Loop 3 visual self-critique

**Verdict: FAIL vs modern Call of Duty.** Expected. Browser Three.js greybox polished further; still not IW/Treyarch production.

Artifact-Gate (screenshots + green build + Pages) is the deliverable bar. **Do not claim CoD PASS.**

## Preset matrix (PR / Shadow / PostFX)

| Preset | PR cap | Shadow map | PostFX stack |
|--------|--------|------------|--------------|
| low | 1.0 | **512** | Render → FXAA → Vignette → Output |
| medium | 1.5 | 1536 | Render → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |
| high | 2.0 | 2048 | Render → SSAO → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |

`prefers-reduced-motion` cuts chromatic to 0, vignette ~35%, recoil/bob x0.25.

### Perf note (best-effort)

Headless Chrome capture on the build box is not a reliable 1% low. Rough local preview observation on this Linux agent box (medium-ish GPU passthrough / software-leaning): **~45–70 FPS** mid-arena with 4 soldiers + post stack; expect **1% lows in the mid-30s** when SSAO (high) + muzzle spam coincide. Low preset (512 shadow, no bloom/SSAO) is the target for weaker devices. Treat as directional, not a console frame-time capture.

## What improved (Loop 2 → Loop 3)

- **Soldier silhouettes:** procedural low-poly helmet / armor plate / limbs / pack / held rifle — readable faction crimson accents (not capsules).
- **Rifle viewmodel:** stock + buffer + handguard + optic + muzzle brake silhouette; breath/walk bob polish.
- **Lighting punch:** darker hemi ambient, hotter key, cyan rim, neon-tinted PMREM bounce panels; exposure/bloom threshold anti-milk.
- **Fog:** Exp2 density lowered so mid-engagement (~11m) stays readable; soft falloff past lose range.
- **Grounding:** floor grout/stain/AO-ish maps, caution/oil/scorch decals, contact shadow blobs under props + soldiers.
- **AI cover:** extra crates + cover nav points; `cover` state ducks / peek-fires when chewed up.
- **Low preset:** ShadowMap capped at **512**.

## What still fails vs modern CoD (harsh)

1. Silhouette: blocky procedural vs authored glTF / MetaHuman-class characters.
2. Lighting: no real HDRI / lightmaps / volumetrics / GI probes; PMREM room hack remains.
3. Materials: procedural noise; no parallax, curated trim sheets, or decal layers at AAA density.
4. Post: not TAAU / filmic weapon DOF / local exposure.
5. Weapons: still procedural viewmodel; no inspect anims, attachment swap, or reload LOD mesh.
6. AI: cover points are static anchors; no navmesh, suppression, flanking, or squad.
7. World: greybox rooms; prop density still sparse vs CoD multiplayer lanes.
8. Audio: synth Foley vs recorded packs.
9. Perf: SSAO costly; no GPU particles / occlusion culling.
10. Juice: CSS HUD; no ragdoll / killcam / hit impulsing.

## Gate artifacts

- Screenshots: `docs/shots/01-mid-greybox.png`, `02-combat.png`, `03-hud-closeup.png`, `04-hud-mobile.png`
- Pages: https://pierreg99.github.io/call-of-groky/
- Production `tsc` + Vite build must stay green

## Next loops

- Real soldier/rifle glTF if a clean CC0 pack fits; real HDRI; ribbon tracers; navgrid pathing; streamed samples; kill feedback juice
