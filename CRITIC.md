# CryoCritic — Loop 2 visual self-critique

**Verdict: FAIL vs modern Call of Duty.** Expected. Browser Three.js greybox pushed harder, not IW/Treyarch production.

Do **not** treat any Loop 2 checkbox as CoD PASS.

## Preset matrix (PR / Shadow / PostFX)

| Preset | PR cap | Shadow map | PostFX stack |
|--------|--------|------------|--------------|
| low | 1.0 | 1024 | Render → FXAA → Vignette → Output |
| medium | 1.5 | 1536 | Render → Bloom → Chromatic → Vignette → SMAA → Output |
| high | 2.0 | 2048 | Render → SSAO → Bloom → Chromatic → Vignette → SMAA → Output |

`prefers-reduced-motion` cuts chromatic to 0, vignette ~35%, recoil/bob x0.25.

## What improved (Phase 1 to Loop 2)

- Post look: bloom, SMAA, chromatic
- Materials: normal/roughness + env reflections
- ADS FOV, tracers, shell casings
- Enemy chase/shoot AI
- Procedural WebAudio
- AABB + walkable platform

## What still fails vs modern CoD (harsh)

1. Silhouette: capsule mannequins vs authored characters.
2. Lighting: no GI/lightmaps/volumetrics; RoomEnvironment is a studio hack.
3. Materials: procedural noise; missing AO/detail/parallax.
4. Post: not console TAAU filmic pipeline / weapon DOF.
5. Weapons: box viewmodel; cylinder tracers; no attachments.
6. AI: three states; no cover/suppression.
7. World: box rooms; low density.
8. Audio: synth Foley vs recorded packs.
9. Perf: SSAO costly; no culling/GPU particles.
10. Juice: CSS HUD only; no ragdoll/killcam.

## Gate artifacts

- Screenshots: docs/shots/01-mid-greybox.png, 02-combat.png, 03-hud-closeup.png, 04-hud-mobile.png
- Pages: https://pierreg99.github.io/call-of-groky/
- Production `tsc` + Vite build must stay green

## Next loops

- Soldier/rifle glTF, real HDRI, ribbon tracers, navgrid, streamed samples
