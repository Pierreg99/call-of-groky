# Plan

Architecture and optional next work for Call of Groky after Loop 8 / Ship GO.

## Architecture

| Area | Location | Role |
|------|----------|------|
| Boot / loop | src/main.ts | Quality boot, input, mission flow, capture hooks |
| Renderer | src/engine/renderer.ts | WebGLRenderer + EffectComposer PostFX stack |
| Quality | src/engine/quality.ts | low/medium/high presets (shadows + PostFX flags) |
| Player | src/player/ | Movement, look, pointer-lock / touch bridge |
| Combat | src/combat/ | Weapons, effects, inspect |
| Enemies | src/enemies/ | Rigs, GLTF assets, archetypes (scout) |
| World | src/world/ | Arena, HDRI env, tower zone |
| Audio | src/audio/ | Synth SFX layers |
| UI | src/ui/ | HUD, settings, minimap, touch overlay |
| Assets | public/hdri public/models | CC0 HDRI + soldier GLB |

Vite base path: /call-of-groky/. GitHub Pages deploys dist/ only (see .github/workflows/deploy.yml).

## Ship vs content

- Ship track: green build, Pages, Artifact-Gate shots, RELEASE/CRITIC honesty, User Accept for SwiftShader-only perf.
- Content track: loops, juice, touch, settings — inside Three.js limits.
- CoD parity: out of scope.

## Optional next work

1. Discrete-GPU perf capture (external machine) — document in RELEASE if accepted.
2. Touch: handedness + layout presets.
3. Settings: FOV, audio mix, keybind remapper.
4. Contested defend / extract variant.
5. Skinned GLB aim/walk clips (CC0).
6. Light navgrid / cover graph.
7. CI screenshot gate on GPU runners if available.

Do not block Ship GO on optional items. Prefer green build + honest docs.
