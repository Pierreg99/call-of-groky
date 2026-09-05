# Call of Groky — Release notes (Loop 8)

## Ship status

| Gate | Status | Notes |
|------|--------|-------|
| Artifact-Gate (screenshots + green build + Pages) | **PASS** (Loops 1–8 on main) | Screenshots + green build + Pages |
| CoD visual PASS | **No** | Browser Three.js greybox — not IW/Treyarch parity |
| Ship-Perf | **Accepted unverified (SwiftShader-only)** | User Accept 2026-09-05 (Europe/Berlin). Agent box has **no `/dev/dri`**; FPS / frame-time notes remain **SwiftShader-only** (`--use-angle=swiftshader`). Not discrete-GPU Ship-Perf evidence. |
| Browser-AAA Ship-Gate | **GO** | via User Accept (S5 documentation path) — 2026-09-05 (Europe/Berlin) |

Low quality preset keeps **ShadowMap 512**. Expect materially higher FPS on a real GPU.

## PostFX / shaders (User approve 2026-09-05)

User 2026-09-05 **"All shader allowed / Approved all"** — **Bloom / SSAO / Chromatic / SMAA** now User-approved on **all** presets. Low keeps **Shadow ≤512** (and pixelRatio cap **1**) but shaders are ON. Perf remains **Accepted unverified (SwiftShader-only)**. `prefers-reduced-motion` still dampens chromatic / vignette / recoil. Ship **GO** / CoD **FAIL** unchanged.

## Loop 8 highlights

- **Settings** (Esc / gear): sensitivity + Low/Med/High quality (localStorage)
- **Defend tower:** after 10 eliminations, hold zone **30s** → WIN banner
- **Inspect** (F / long-press) + weapon switch raise/roll polish
- **Scout** enemy archetype (cyan tint, faster, less HP)
- Loop 7 radar / waves / juice / SMG retained

## Play

https://pierreg99.github.io/call-of-groky/

## Docs

- Changelog: [CHANGELOG.md](./CHANGELOG.md)
- Progress: [docs/PROGRESS.md](./docs/PROGRESS.md)
- Roadmap: [docs/ROADMAP.md](./docs/ROADMAP.md)
- Plan: [docs/PLAN.md](./docs/PLAN.md)
- Gallery: [docs/gallery.md](./docs/gallery.md)
