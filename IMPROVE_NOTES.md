# Improve notes — Groky vs Boty systems

Branch: improve/compare-boty · Date: 2026-09-05 (Europe/Berlin)

COMPARE_GROKY.md lives in Boty (read-only reference); Groky documents the port here.

## Kept (honesty)

- Touch + Ship honesty unchanged: Browser-AAA **GO** / CoD visual **FAIL**
- Loop 8 gameplay (defend tower, settings, inspect, scout)
- Touch overlay + desktop PointerLock paths intact

## Gaps closed (this branch)

| Boty advantage | Groky status |
|----------------|--------------|
| cannon-es player body | **Done** — capsule + static Box3 colliders; AABB floors as fallback |
| Modular greybox kit | **In progress** — helpers, tower, cover clusters, ramp/platform, window-wall |
| Directional hit / grain | **Done** — damage chevrons + quality-scaled film grain + SMAA |
| Cam bob / sprint FOV | **Done** — bob/roll, land thump, sprint FOV, viewmodel look-inertia |

## Still Boty-ahead (not wiped / not claimed)

- Enemy Search FSM after LOS loss
- Full procedural-only asset path (zero network fetches)
- Haptics (gamepad vibrate + phone fallback)
- ITERATIONS.md weakness log discipline

## Pieces map

- `world/pieces/helpers.ts` — boxMesh, colliders, floor pads, decals
- `world/pieces/tower.ts` — control tower objective
- `world/pieces/cover.ts` — crate clusters, dens cover, barrels, AI anchors
- `world/pieces/ramp.ts` — raised platform + stepped FloorPads
- `world/pieces/windowWall.ts` — mid courtyard panel + window gap + neon

Boty work not wiped. Build must stay green. Do not merge until polish pass complete.
