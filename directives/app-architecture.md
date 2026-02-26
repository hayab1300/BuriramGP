# App Architecture — Directive

## Goal
Define the SPA structure, module contracts, and rendering pipeline for the Buriram GP simulator.

## Technology Contracts
- Pure HTML5 + CSS3 + Vanilla JS (ES6)
- No frameworks, no bundler, no external JS libraries
- Google Fonts: Rajdhani (display) + Inter (UI)
- HTML5 Canvas for pseudo-3D engine
- Inline SVG for 2D track map

## Module Map

| File | Layer | Responsibility |
|------|-------|----------------|
| `index.html` | Structure | Shell, mode buttons, canvas, SVG map, panels |
| `style.css` | Style | Design system, tokens, animations |
| `data/corners.json` | Data | Corner metadata |
| `app.js` | Orchestration | Mode router, UI events, data loading |
| `ride3d.js` | Execution | Pseudo-3D rendering engine |

## Mode System
The app has 4 exclusive modes managed by `app.js`:

1. **RIDE** — Full-screen canvas runs `ride3d.js`. ESC returns to MAP.
2. **EXPLORE** — 2D SVG map visible. Click corner → detail panel slides in.
3. **WALKTHROUGH** — 2D map. Auto-advances through 12 corners every 4 seconds.
4. **QUIZ** — 2D map. Shows prompt → user clicks correct corner. 5 rounds.

## Visual Design Tokens

```css
--bg-deep:      #0a0a0f   /* main background */
--bg-panel:     rgba(15,15,25,0.85)  /* glassmorphism panels */
--accent-red:   #e8003d   /* MotoGP red */
--accent-gold:  #f5a623   /* corners / highlights */
--accent-teal:  #00d4aa   /* speed / live indicators */
--text-primary: #f0f0f0
--text-muted:   #8a8a9a
--font-display: 'Rajdhani', sans-serif
--font-ui:      'Inter', sans-serif
```

## 3D Engine Contracts (`ride3d.js`)
- Export: `RideEngine` class with `init(canvas, corners)`, `start()`, `stop()`, `reset()` methods
- Input: `corners.json` array for corner trigger points
- Track encoded as array of segments: `{ curve, length, color, cornerIndex }`
- Corner trigger fires `onCornerEntered(cornerData)` callback → app.js overlays the HUD
- Controls: keyboard events only (ArrowUp/Down/Left/Right + ESC)

## Steps
1. Create `data/corners.json`
2. Build `ride3d.js` engine
3. Build `app.js` orchestrator
4. Build `index.html` + `style.css`
5. Test all 4 modes

## Expected Output
A zero-dependency static SPA openable by double-clicking `index.html`.
