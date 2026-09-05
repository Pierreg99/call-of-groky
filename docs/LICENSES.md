# Licenses and attribution

Project code and original procedural content: **MIT** — see [LICENSE](../LICENSE) (Copyright 2026 Pierreg99).

Asset-level detail also lives in [credits/ATTRIBUTION.md](./credits/ATTRIBUTION.md).

## Poly Haven — Empty Warehouse 01 HDRI

- Source: https://polyhaven.com/a/empty_warehouse_01
- Author: Sergej Majboroda
- License: CC0 1.0
- File: public/hdri/empty_warehouse_01_1k.hdr
- Use: IBL via RGBELoader + PMREMGenerator

## OpenGameArt — Low Poly Soldier with weapons

- Source: https://opengameart.org/content/low-poly-soldier-with-weapons
- Author: Casti_131
- License: CC0 1.0
- File: public/models/soldier_rifle_cc0.glb
- Use: enemy silhouettes + optional viewmodel rifle mesh

## Three.js

- Dep: threejs MIT licensed renderer
- Version range: 0.170 and above
- Upstream project: mrdoob three.js
- Controls/loaders: PointerLockControls, RGBELoader, GLTFLoader
- PostFX addons path: three/addons/postprocessing
- Passes listed in src/engine/renderer.ts imports
- Post stack is Three.js addons under postprocessing path (MIT with Three.js).

## Other

All other art, audio, and code in this repo are original procedural / MIT unless noted above.
