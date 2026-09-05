# Changelog

All notable changes to **Call of Groky** are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates are Europe/Berlin calendar days (project ship day **2026-09-05**).

## [Unreleased]

## [0.1.1] - 2026-09-05

### Changed — Icon action buttons, ADS zoom, PBR assets

- Touch/on-screen actions: circular SVG icon buttons (fire flash, ADS crosshair, jump chevron, reload arrows, sprint, weapon switch, inspect) — no letter labels; ≥44px + safe-area
- ADS: proper FOV lerp, look sensitivity scale while ADS, stabler optic/holo; touch ADS tap-toggle + hold; desktop RMB unchanged
- Poly Haven CC0 1K PBR (floor / wall / metal / rust) for arena materials; viewmodel + enemy material polish; ATTRIBUTION updated
- Desktop PointerLock unchanged; prefers-reduced-motion respected

## [0.1.0] - 2026-09-05

### Added — Mobile touch (`d06287a`)

- Virtual joystick (left), look pad (right-half drag), touch action cluster
- FIRE / ADS / JMP / RLD / SPR / WPN / INS; ≥44px targets + safe-area insets
- Coarse-pointer path without PointerLock; desktop PointerLock unchanged

### Changed — PostFX all presets (`3e5d72b`)

- User approve: Bloom / SSAO / Chromatic / SMAA enabled on **low / medium / high**
- Low still ShadowMap **512** and pixelRatio ≤1; Ship GO / CoD FAIL unchanged

### Ship — Browser-AAA GO (`c3b32c5`)

- User Accept: Ship-Perf **Accepted unverified (SwiftShader-only)** (no `/dev/dri` on agent box)
- Browser-AAA Ship-Gate **GO** via User Accept (S5 documentation path)
- CoD visual PASS remains **No**

### Added — Loop 8 (`5216135`)

- Settings panel (Esc / gear): look sensitivity + quality Low/Med/High (localStorage)
- Defend control tower **30s** after 10 eliminations → WIN / MISSION COMPLETE
- Weapon inspect (F / long-press) + switch raise/roll polish
- Scout enemy archetype (cyan tint, faster, lower HP)

### Added — Loop 7 (`6532fff`)

- Minimap radar
- Wave spawns at kill thresholds
- Damage / streak juice
- SMG audio / feedback layers

### Added — Loop 6 (`4045b53`)

- Dual weapons (rifle / SMG), ammo pickups
- Compass objective marker
- Control tower world prop / zone

### Added — Loop 5 (`5c846be`)

- Hierarchical combat poses
- Viewmodel hands / ADS polish
- World density + juice pass

### Added — Loop 4 (`ad5c0de`)

- Poly Haven Empty Warehouse 01 HDRI (CC0)
- OGA Casti_131 low-poly soldier + rifle glTF (CC0)
- Killcam-lite + FPS counter

### Added — Loop 3 (`45e9534`)

- Soldier / rifle silhouettes
- Lighting punch
- Cover AI anchors

### Added — Loop 2 (`9cca795`)

- PostFX pipeline (EffectComposer), PBR / PMREM
- ADS, basic AI, synth audio, AABB floors

### Added — Phase 1 (`1960cfb`)

- Three.js FPS greybox arena scaffold (Vite + TypeScript)
- Pointer lock movement, basic fire, HUD shell
