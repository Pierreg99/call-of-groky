# Progress

Status as of **2026-09-05** (Europe/Berlin). SHAs on main.

## Gates

| Gate | Status | Notes |
|------|--------|-------|
| Artifact-Gate (shots + green build + Pages) | **PASS** | Loops 1-8 on main |
| CoD visual PASS | **FAIL / No** | Expected; not IW-engine parity |
| Ship-Perf | **Accepted unverified (SwiftShader-only)** | User Accept; no /dev/dri on agent box |
| Browser-AAA Ship-Gate | **GO** | User Accept S5 — c3b32c5 |
| PostFX user approve | **Done** | All presets shaders ON — 3e5d72b |
| Touch / mobile overlay | **Done** | d06287a |

## Loops

| Loop | SHA | Summary | Status |
|------|-----|---------|--------|
| Phase 1 | 1960cfb | Three.js FPS greybox scaffold | Done |
| Loop 2 | 9cca795 | PostFX, PBR/PMREM, ADS, AI, audio, AABB | Done |
| Loop 3 | 45e9534 | Soldier/rifle silhouettes, lighting, cover AI | Done |
| Loop 4 | ad5c0de | Poly Haven HDRI, CC0 soldier GLB, killcam-lite, FPS | Done |
| Loop 5 | 5c846be | Hierarchical poses, viewmodel hands/ADS, density, juice | Done |
| Loop 6 | 4045b53 | Dual weapons, compass, control tower, ammo | Done |
| Loop 7 | 6532fff | Minimap, waves, damage/streak juice, SMG layers | Done |
| Loop 8 | 5216135 | Settings, defend 30s WIN, inspect, scout | Done |
| Ship accept | c3b32c5 | Browser-AAA GO (SwiftShader-only perf) | Done |
| PostFX | 3e5d72b | Full PostFX on all quality presets | Done |
| Touch | d06287a | Virtual stick, look pad, action buttons | Done |

## Play

https://pierreg99.github.io/call-of-groky/

Build gate: tsc + Vite production build must stay green.
