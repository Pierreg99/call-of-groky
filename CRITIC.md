# CryoCritic — Loop 4 visual self-critique

**Verdict: FAIL vs modern Call of Duty.** Expected. Browser Three.js greybox with real HDRI + CC0 glTF soldier; still not IW/Treyarch production.

Artifact-Gate (screenshots + green build + Pages) is the deliverable bar. **Do not claim CoD PASS.**

## Preset matrix (PR / Shadow / PostFX)

| Preset | PR cap | Shadow map | PostFX stack |
|--------|--------|------------|--------------|
| low | 1.0 | **512** | Render → FXAA → Vignette → Output |
| medium | 1.5 | 1536 | Render → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |
| high | 2.0 | 2048 | Render → SSAO → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |

`prefers-reduced-motion` cuts chromatic to 0, vignette ~35%, recoil/bob x0.25.

### Perf note (best-effort, Low preset)

Measured via on-screen FPS counter (`F3` / `?fps=1`) during short headless Chrome + SwiftShader captures on the Linux agent box (software WebGL — **not** a console/desktop GPU frame-time capture):

| Context | Approx FPS | Approx 1% low |
|---------|------------|---------------|
| Desktop Low (1440×900, `quality=low`) | **~22** | noisy / mid-teens (SwiftShader) |
| Mobile Low (390×844, `quality=low`) | **~20** | **~20** |

Expect materially higher numbers on a real discrete GPU. Low preset keeps ShadowMap **≤512**, no bloom/SSAO. Treat as directional only.

## What improved (Loop 3 → Loop 4)

- **Real HDRI:** Poly Haven *Empty Warehouse 01* (CC0, 1k) via `RGBELoader` + `PMREMGenerator`; `environmentIntensity` ~1.15 for stronger indirect. Scene background stays fog-tuned solid (engagement readability), not a full skybox wash. RoomEnvironment remains fallback only.
- **CC0 glTF soldier + rifle:** OpenGameArt *Low Poly Soldier with weapons* (Casti_131, CC0) slim-exported to `public/models/soldier_rifle_cc0.glb` (~43KB: posed male mesh + assault rifle). Enemy instances clone the GLB; procedural soldier retained as load-failure fallback. Viewmodel stays procedural with **gloved hands** (GLB rifle kept world-scale for enemies; FPS viewmodel proportions differ).
- **Killcam-lite:** ELIMINATED banner + brief timescale/FOV punch on kill; stylized crimson impact blotches (not gore-heavy).
- **Audio:** Richer layered procedural synth (bandpass noise + multi-tone gun/kill); no third-party sample pack required.
- **FPS counter:** Toggle with **F3** / backtick; shows FPS + rolling 1% low estimate.
- **Shadows:** Low still **512**; Med 1536; High 2048.

## What still fails vs modern CoD (harsh)

1. Soldier is CC0 low-poly static pose — not MetaHuman / authored LODs / skeletal combat anims.
2. HDRI drives reflections only; no lightmaps, probes, or volumetrics; fog still Exp2.
3. Materials mostly procedural noise / simple PBR; no AAA trim sheets.
4. Post: not TAAU / weapon DOF / local exposure.
5. Viewmodel still procedural (hands polished); no inspect / attachment swap.
6. AI: static cover anchors; no navmesh / suppression / flanking.
7. World: greybox density vs CoD multiplayer lanes.
8. Audio: richer synth, still not recorded Foley packs.
9. Perf: SSAO costly on high; no occlusion culling / GPU particles.
10. Juice: CSS HUD killcam-lite ≠ full killcam / ragdoll.

## Gate artifacts

- Screenshots: `docs/shots/01-mid-greybox.png`, `02-combat.png`, `03-hud-closeup.png`, `04-hud-mobile.png`
- Credits: `docs/credits/ATTRIBUTION.md`
- Pages: https://pierreg99.github.io/call-of-groky/
- Production `tsc` + Vite build must stay green

## Next loops

- Skinned aim/walk clips on the CC0 soldier; optional viewmodel GLB rifle scale pass; light probes / AO bake; navgrid; streamed one-shots if a clean CC0 pack fits size budget
