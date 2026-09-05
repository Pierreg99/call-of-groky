# Third-party assets

## HDRI — Empty Warehouse 01

- Source: [Poly Haven](https://polyhaven.com/a/empty_warehouse_01)
- Author: Sergej Majboroda
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- File: `public/hdri/empty_warehouse_01_1k.hdr` (1k equirectangular)
- Use: image-based lighting via Three.js `RGBELoader` + `PMREMGenerator`

## PBR textures (Poly Haven, CC0 1K JPG)

| Set | Source | Author(s) | Files under |
|-----|--------|-----------|-------------|
| Concrete Floor Worn 001 | [polyhaven.com/a/concrete_floor_worn_001](https://polyhaven.com/a/concrete_floor_worn_001) | Dimitrios Savva, Rico Cilliers | `public/textures/concrete_floor/` |
| Concrete Wall 007 | [polyhaven.com/a/concrete_wall_007](https://polyhaven.com/a/concrete_wall_007) | Dario Barresi, Rico Cilliers, Charlotte Baglioni | `public/textures/concrete_wall/` |
| Metal Plate | [polyhaven.com/a/metal_plate](https://polyhaven.com/a/metal_plate) | Rob Tuytel | `public/textures/metal_plate/` |
| Rusty Metal 02 | [polyhaven.com/a/rusty_metal_02](https://polyhaven.com/a/rusty_metal_02) | Rob Tuytel | `public/textures/rusty_metal/` |

- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) for all of the above
- Maps used: diffuse / normal (GL) / roughness / AO (+ metalness for metal plate)
- Use: arena floor, walls, metal props; procedural noise remains as fallback if load fails
- Not claiming Call of Duty parity — greybox with upgraded CC0 PBR only

## Soldier + Assault Rifle — Low Poly Soldier with weapons

- Source: [OpenGameArt — Low Poly Soldier with weapons](https://opengameart.org/content/low-poly-soldier-with-weapons)
- Author: Casti_131
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- File: `public/models/soldier_rifle_cc0.glb` (~56KB slim export: male mesh + assault rifle; converted from provided `.blend`)
- Use: enemy silhouettes + optional viewmodel rifle mesh

All other art, audio, and code in this repo are original procedural / MIT unless noted above.
