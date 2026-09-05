# Screenshots (CryoCritic gate)

| File | Shot |
|------|------|
| `01-mid-greybox.png` | **Control tower** interior — consoles / monitors / deck |
| `02-combat.png` | Combat mid-shot — SMG (G-9) + **enemies facing camera** |
| `03-hud-closeup.png` | HUD + compass / objective / dual slots / **minimap** |
| `04-hud-mobile.png` | HUD at mobile width (~390px) |

Capture via Vite preview + Chrome CDP (`?capture=mid|combat|hud|tower`), waiting on `window.__COG_READY__`.

**Agent box:** no `/dev/dri` — screenshots / FPS notes use **SwiftShader**, not hardware WebGL. Ship-Perf unverified — see `RELEASE.md`.
