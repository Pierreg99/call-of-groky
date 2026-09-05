# Improve notes — Groky vs Boty systems

Branch: improve/compare-boty · Date: 2026-09-05 (Europe/Berlin)

COMPARE_GROKY.md lives in Boty (read-only reference); Groky documents the port here.
Do **not** touch `call-of-boty` or `castle-landscape` from this branch.

## Kept (honesty)

| Claim | Status |
|-------|--------|
| Touch overlay + desktop PointerLock | **Intact** — no regressions intended |
| Ship Browser-AAA **GO** | **Unchanged** (User Accept / SwiftShader-only) |
| CoD visual parity | **FAIL** — still honest, not claimed PASS |
| Loop 8 gameplay | Defend tower / settings / inspect / scout kept |

## Gaps closed on this branch

| Boty advantage (COMPARE) | Groky status |
|--------------------------|--------------|
| cannon-es player + static world | **Done** — `PhysicsWorld` capsule + Box3 / FloorPad statics; kinematic AABB fallback |
| Modular greybox kit | **Done** — helpers, tower, cover, ramp, windowWall, hangar, bunker |
| Feel: bob / roll / sprint FOV | **Done** — stronger bob, land thump, strafe roll, sprint FOV, viewmodel inertia |
| Hit feedback / grain | **Done** — directional chevrons (capped), critical HP pulse, film grain + SMAA |

## Still Boty-ahead (not claimed done)

1. Enemy **Search** FSM after LOS loss
2. Full **procedural-only** asset path (zero network fetches)
3. **Haptics** (gamepad `vibrationActuator` + phone vibrate fallback)
4. **ITERATIONS.md** weakness-log discipline

## Pieces map (`src/world/pieces/`)

| Module | Role |
|--------|------|
| `helpers.ts` | boxMesh, colliders, floor pads, contact blobs, floor decals |
| `tower.ts` | Control tower objective landmark |
| `cover.ts` | Crate clusters, dens cover, barrels, AI cover anchors |
| `ramp.ts` | Raised platform + stepped FloorPads |
| `windowWall.ts` | Mid courtyard panel + window gap + neon |
| `hangar.ts` | East hangar bay walls |
| `bunker.ts` | West bunker room + doorway neon |

## Physics note

Ramp walkability stays on stepped `FloorPad`s (visual ramp mesh is rotated and not a reliable cannon box). Static pad boxes skip degenerate sizes; grounded uses contact events + near-floor heuristic.

Boty work not wiped. Build must stay green. PR stays open (do not merge from agent).
