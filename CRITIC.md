# CryoCritic — Loop 8 visual self-critique

**Verdict: FAIL vs modern Call of Duty.** Expected. Browser Three.js greybox with settings, defend objective, weapon inspect, and scout archetype; still not IW/Treyarch production.

Artifact-Gate (screenshots + green build + Pages) is the deliverable bar. **Do not claim CoD PASS.**

## improve/compare-boty (2026-09-05) — critic-honest

This branch ports Boty systems into Groky. It does **not** reopen Ship-Gate or CoD.

| Claim | Verdict |
|-------|---------|
| cannon-es capsule | Incremental physics. Not a Havok/IW character controller. |
| Modular pieces | Greybox extraction (`hangar`/`bunker`/`cover`/…). Not a new art pass. |
| Film grain + crit HP | HUD/feel only. Does not change lighting/materials vs CoD. |
| Search FSM / haptics / procedural-only | **Not ported.** Do not claim feature-complete vs Boty. |
| CoD PASS | **Still No.** |
| Browser-AAA Ship-Gate | **GO** unchanged (User Accept / SwiftShader-only). |

See [`docs/COMPARE_BOTY.md`](./docs/COMPARE_BOTY.md) and [`IMPROVE_NOTES.md`](./IMPROVE_NOTES.md).


**User override content loops** — Critic recommended stop; user instructed continue.

### Ship-Gate / S5 (User Accept)

- **Ship-Perf:** **Accepted unverified (SwiftShader-only)** — User Accept 2026-09-05 (Europe/Berlin). See [`RELEASE.md`](./RELEASE.md).
- **Browser-AAA Ship-Gate:** **GO** via User Accept (S5 documentation path) — 2026-09-05 (Europe/Berlin).
- **Artifact-Gate:** **PASS** (Loops 1–8 on main).
- **CoD PASS:** still **No**.

## Preset matrix (PR / Shadow / PostFX)

| Preset | PR cap | Shadow map | PostFX stack |
|--------|--------|------------|--------------|
| low | 1.0 | **512** | Render → SSAO → Bloom → Chromatic → Vignette → SMAA → Output |
| medium | 1.5 | 1536 | Render → SSAO → Bloom (hi thresh) → Chromatic → Vignette → SMAA → Output |
| high | 2.0 | 2048 | Render → SSAO → Bloom (punchy) → Chromatic → Vignette → SMAA → Output |

**User 2026-09-05 "All shader allowed / Approved all"** — Low keeps **Shadow ≤512** but **Bloom / SSAO / Chromatic / SMAA** now User-approved on **all** presets. Perf remains **Accepted unverified**. `prefers-reduced-motion` still dampens chromatic / vignette / recoil (chromatic→0, vignette ~35%, recoil/bob ×0.25). Ship **GO** / CoD **FAIL** unchanged. Runtime settings (Esc / gear) switch presets live.

### Perf note (best-effort, Low preset)

**No `/dev/dri` on the agent box** — captures use Chrome headless + **SwiftShader** (`--use-angle=swiftshader`). Not a discrete-GPU frame-time capture. **Ship-Perf: Accepted unverified (SwiftShader-only)** — User Accept 2026-09-05 (Europe/Berlin).

| Context | Approx FPS | Approx 1% low | Notes |
|---------|------------|---------------|-------|
| Desktop Low (1440×900, `quality=low`) | **~17–22** (headless noise) | mid-teens | **SwiftShader only** — no `/dev/dri` |
| Mobile Low (390×844, `quality=low`) | **~15–20** | ~15–18 | SwiftShader; minimap + settings UI overhead small |

Expect materially higher numbers on a real discrete GPU. Low preset keeps ShadowMap **≤512**; bloom/SSAO/chromatic **ON** (user approve 2026-09-05).

## What improved (Loop 7 → Loop 8)

- **In-game settings:** Esc or gear — look sensitivity slider + quality Low/Med/High (persisted); runtime post/shadow retune.
- **Defend objective:** after 10 kills → **30s hold tower zone** → **WIN / MISSION COMPLETE** banner.
- **Weapon polish:** switch raise/roll; **inspect** (F tap or long-press) with sway; HUD shows INSPECT.
- **Scout archetype:** cyan-tint faster lower-HP hostiles mixed into spawns/waves.
- **Shadows:** Low still **512**; Med 1536; High 2048.

## What still fails vs modern CoD (harsh)

1. Not true GPU skinning / authored anim clips / LODs — hierarchical procedural body + GLB rifle, not MetaHuman.
2. HDRI reflections only; no lightmaps, probes, or volumetrics; fog still Exp2.
3. Materials mostly procedural noise / simple PBR; no AAA trim sheets.
4. Post: not TAAU / weapon DOF / local exposure.
5. Viewmodel inspect is procedural flip — not authored inspect clips / attachment swap.
6. AI: static cover anchors; no navmesh / suppression / flanking; scout is tint+stat variant only.
7. World denser (tower) but still greybox vs CoD multiplayer art.
8. Audio: richer synth + SMG layer, still not recorded Foley packs.
9. Perf: SSAO costly on high; no occlusion culling / GPU particles; agent FPS is SwiftShader-only.
10. Defend is a simple radius timer — no ticket bleed / contested multi-team UX / extract.
11. Minimap is a simple radar splat — no fog-of-war / teammate pings / ping wheel.
12. Settings are basic (sens + quality) — no FOV / audio mix / keybind remapper.

13. **Touch:** virtual stick + look-pad + action cluster land for coarse pointers, but no haptic cues, no left/right-handedness toggle, no customizable button layout — still a greybox mobile layer vs CoD mobile UX.

## Gate artifacts

- Screenshots: `docs/shots/01-mid-greybox.png`, `02-combat.png`, `03-hud-closeup.png`, `04-hud-mobile.png`
- Credits: `docs/credits/ATTRIBUTION.md`
- Release: `RELEASE.md` (Ship-Perf Accepted unverified; Browser-AAA Ship-Gate GO via User Accept S5)
- Pages: https://pierreg99.github.io/call-of-groky/
- Production `tsc` + Vite build must stay green

## Next loops (if override continues)

- Real skinned GLB with aim/walk clips; navgrid; light probes / AO bake; streamed CC0 Foley if size budget allows; contested defend / extract variants; polish touch layout / handedness
