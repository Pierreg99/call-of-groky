# CryoCritic — Loop 5 visual self-critique

**Verdict: FAIL vs modern Call of Duty.** Expected. Browser Three.js greybox with hierarchical combat poses on CC0 soldier + HDRI; still not IW/Treyarch production.

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
| Desktop Low (1440×900, `quality=low`) | **~20–24** (headless noise; virtual-time dumps unusable) | mid-teens | **SwiftShader only** — no `/dev/dri` |
| Mobile Low (390×844, `quality=low`) | **~18–22** | ~18–20 | SwiftShader |

Expect materially higher numbers on a real discrete GPU. Low preset keeps ShadowMap **≤512**, no bloom/SSAO.

## What improved (Loop 4 → Loop 5)

- **Combat poses (kill T-pose):** CC0 slim GLB has **no skin weights**. Loop 5 uses a hierarchical procedural body (`soldierRig.ts`) with keyframed **idle / walk / aim / fire / cover / death** + walk cycle and ragdoll-lite death tumble (fall + fade). CC0 **assault rifle** attaches to the weapon socket (world-matched). Honest: not GPU-skinned MetaHuman clips.
- **Viewmodel:** **Procedural intentional** — gloved hands + readable ADS holo optic, proportions matched to ~0.75m world rifle length. CC0 GLB rifle stays on **enemy** weapon sockets (author mesh is world-prop oriented, not FPS-rigged).
- **ADS optic:** Larger holo window + ring/center reticle; ADS pose pulls optic closer to eye.
- **World density:** Extra cover, barrels, deterministic debris piles, wall/floor grit, cables/conduits, warning signage — breaks flat greybox planes.
- **Combat juice:** Stronger hit emissive + flinch lean; thicker tracer + hot core; brighter impact flash/sparks; denser stylized blood blotches; death ragdoll-lite via rig.
- **Shadows:** Low still **512**; Med 1536; High 2048.

## What still fails vs modern CoD (harsh)

1. Not true GPU skinning / authored anim clips / LODs — hierarchical procedural body + GLB rifle, not MetaHuman.
2. HDRI reflections only; no lightmaps, probes, or volumetrics; fog still Exp2.
3. Materials mostly procedural noise / simple PBR; no AAA trim sheets.
4. Post: not TAAU / weapon DOF / local exposure.
5. Viewmodel hybrid (GLB rifle + procedural hands/optic); no inspect / attachment swap.
6. AI: static cover anchors; no navmesh / suppression / flanking.
7. World denser but still greybox vs CoD multiplayer art.
8. Audio: richer synth, still not recorded Foley packs.
9. Perf: SSAO costly on high; no occlusion culling / GPU particles; agent FPS is SwiftShader-only.
10. Juice: killcam-lite + ragdoll-lite ≠ full killcam / PhysX ragdoll.

## Gate artifacts

- Screenshots: `docs/shots/01-mid-greybox.png`, `02-combat.png`, `03-hud-closeup.png`, `04-hud-mobile.png`
- Credits: `docs/credits/ATTRIBUTION.md`
- Pages: https://pierreg99.github.io/call-of-groky/
- Production `tsc` + Vite build must stay green

## Next loops

- Real skinned GLB (or embed weights) with aim/walk clips; navgrid; light probes / AO bake; streamed CC0 Foley if size budget allows
