# Roadmap

Call of Groky remains a **Browser-AAA greybox** ship. **CoD visual / systems parity is explicitly out of scope.**

Two tracks stay separate:

| Track | Goal |
|-------|------|
| **Ship** | Green build, Pages live, Artifact-Gate screenshots, honest RELEASE / CRITIC, User Accept for unverifiable agent-box perf |
| **Content** | Gameplay loops, juice, touch, settings — polish inside Three.js / WebGL limits |

## Near (post-Loop 8)

- Discrete-GPU Ship-Perf capture (optional; agent box stays SwiftShader-only)
- Touch polish: handedness toggle, button layout presets, light haptics where available
- Settings depth: FOV slider, audio mix, basic keybind remapper
- Contested defend / extract variant (still simple radius / timer logic)

## Mid

- Skinned GLB with aim / walk clips (authored or retargeted CC0)
- Light navgrid / cover graph (not full navmesh AAA)
- Light probes / baked AO where budget allows
- Streamed CC0 Foley pack under size budget
- Minimap fog-of-war / simple ping

## Long

- Multiplayer prototype (optional, separate deploy) — not CoD netcode
- Procedural / modular arena kits
- Accessibility: colorblind HUD, full reduced-motion audit
- Tooling: automated screenshot gate in CI on real GPU runners if available

## Explicitly out of scope

- Call of Duty visual or gameplay parity (IW / Treyarch / Sledgehammer)
- Claiming discrete-GPU Ship-Perf from SwiftShader agent captures
- Shipping proprietary CoD assets or trademarks
