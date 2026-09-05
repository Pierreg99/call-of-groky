# COMPARE_BOTY — Groky vs Boty (improve/compare-boty)

Synced 2026-09-05 (Europe/Berlin) from Boty's `COMPARE_GROKY.md` plus this branch.
**CoD PASS: still No.** Ship Browser-AAA **GO** unchanged (User Accept / SwiftShader-only).

## Architectural differences (post this branch)

| Area | Boty (main) | Groky (this branch) |
|------|-------------|---------------------|
| Physics | cannon-es cylinder + static world | **cannon-es capsule + FloorPad/Box3 statics**; kinematic AABB fallback remains |
| Assets | Procedural only | GLTF / HDRI-style + procedural greybox pieces |
| Enemies | Idle/Alert/Attack/**Search** + cover nav | Archetypes (scout) + wave/defend; **Search FSM not ported** |
| Audio | Procedural Web Audio + HRTF + rumble | Mix of asset/SFX; **no haptics bridge yet** |
| Post | SMAA / Bloom / SSAO / chromatic+vignette+grain | Same stack + film grain; more preset polish |
| Scope | Sector clear (8 kills) | Defend-tower, touch, settings, multi-weapon |

## Ported from Boty (this PR)

1. cannon-es player body + static world (AABB fallback kept)
2. Modular pieces kit (`helpers`, `tower`, `cover`, `ramp`, `windowWall`, `hangar`, `bunker`)
3. Feel: bob / land thump / strafe roll / sprint FOV / viewmodel inertia
4. Directional hit chevrons + grain; critical HP pulse

## Still Boty-ahead (honest — not claimed)

1. Enemy **Search** after LOS loss
2. Full procedural-only fallback (zero network fetches)
3. Gamepad `vibrationActuator` + `navigator.vibrate` haptics
4. `ITERATIONS.md` weakness-log discipline

## Still Groky-ahead (Boty should steal)

1. Touch overlay + settings persist
2. Multi-weapon, inspect, compass, defend-objective
3. Scout archetype + killcam-lite
4. Ship docs (`RELEASE.md`, `CRITIC.md`, gallery)

## Critic-honest

Greybox extraction is not a new art pass. cannon-es is incremental physics, not Havok.
Film grain + HUD pulse do not move the CoD verdict.
