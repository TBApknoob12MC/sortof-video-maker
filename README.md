# Low Poly Studio

A browser-based **low poly 3D scene maker** for little films and visual novels — character creator,
environment presets, prop library, procedural textures, a scene graph editor, VN dialogue with
auto-framing cameras, and a keyframed cinematic camera. Hit **Clean UI** and screen-record a pure 3D
shot. Also packaged as an **Android APK** workflow.

> DISCLAIMER: AI GENERATED APPLICATION (😭✌️🥀)

![stack](https://img.shields.io/badge/HTML-ES%20Modules-e34f26) ![stack](https://img.shields.io/badge/three.js-r169-000000) ![stack](https://img.shields.io/badge/Android-Capacitor%207-3ddc84)

---

## Quick start

```bash
npm install
npm run dev        # → http://localhost:5173
```

That’s it: no bundler, no framework, no CDN. The app is `index.html` + plain ES modules, and
three.js is vendored in `src/vendor/`. Open the printed URL, drag to orbit, and start creating.

> ES modules + import maps need `http://` (or the APK). Opening `index.html` via `file://` will not
> work in Chrome. `npm run dev` starts a tiny zero-dependency static server.

### Build the Android APK

```bash
npm run apk        # dist/lowpoly-studio-debug.apk (needs JDK 21 + Android SDK)
```

Or let GitHub do it: **Actions → Build Android APK → Run workflow**, then download the APK
artifact. Full instructions, signing, icons and troubleshooting:
**[docs/BUILD_APK.md](docs/BUILD_APK.md)**.

---

## What you can make

| Tool | What it does |
| --- | --- |
| **Characters** | Parametric low poly actors: skin, hair style/colour, outfit styles, accessories, height/build/head size, 5 expressions, 8 poses. Duplicate and place them with a transform gizmo. |
| **Scene** | 7 environment presets (Studio, Beach, Forest, Night city, Room, Space, Void) with sky gradient, ground, sun angle/intensity, ambient light, fog, water, particles (dust/snow/rain/fireflies) and one-click prop scattering. |
| **Props** | 20 low poly props (trees, rocks, crates, furniture, lamps, buildings, crystals, fences, arches, clouds…) with colour, roughness, metalness, glow, flat shading, textures and full transforms. |
| **Textures** | 16 procedural canvas patterns (checker, wood, brick, stone, grass, tiles, halftone, camo…) plus image import. Apply to props, tune repeat per object. |
| **Scene Edit** | Scene graph with every actor and prop: visibility, lock, rename, delete, duplicate, ground-snap, inspect and transform. |
| **Dialogue** | Visual-novel script: speaker, text, expression and camera shot per line. Play it with a typewriter dialogue box, auto-framing camera, speaker highlighting and 3 themes. |
| **Camera** | Free orbit camera plus keyframes storing **position, rotation (yaw/pitch/roll), FOV and easing**. Timeline with scrubbing, draggable markers, capture-from-view, loop playback. |
| **Clean UI** | One button (<kbd>H</kbd>) hides every panel, HUD and guide for a clean screen recording. Hold anywhere to bring the UI back. |

### Recording workflow

1. Stage your characters and props.
2. Write a few dialogue lines (or build a camera sequence).
3. Press **🎥 Clean UI** (<kbd>H</kbd>).
4. Start your screen recorder / Android recorder.
5. Press <kbd>P</kbd> to play the VN or <kbd>C</kbd> to play the camera sequence — or just orbit and record.
   (<kbd>H</kbd> is still active to bring the panels back at any time.)
6. Hold the screen for a second (or tap <kbd>H</kbd>) to restore the editor.

The VN’s exit button and hints fade out automatically after a few seconds so they do not end up in
your recording.

---

## The app at a glance

```
┌─────────────────────────────────────────────────────────────┐
│ brand   project name        ▶ Play VN  🎬 Camera  🎥 Clean UI │
├─────────────────────────────────────────────────────────────┤
│ Characters  Scene  Props  Textures  Scene Edit  Dialogue  Camera │
├───────────────────────────────────────────┬─────────────────┤
│                                           │                 │
│              three.js viewport            │   active tool   │
│        (gizmo, selection box, guides)     │     panel       │
│                                           │                 │
├───────────────────────────────────────────┴─────────────────┤
│  camera timeline: play · loop · keyframe diamonds · capture   │
└─────────────────────────────────────────────────────────────┘
```

### Controls

| Action | Binding |
| --- | --- |
| Orbit / zoom / pan | drag / wheel or pinch / right-drag |
| Move · rotate · scale gizmo | <kbd>W</kbd> · <kbd>E</kbd> · <kbd>R</kbd> |
| Select | click object (including gizmo handles) |
| Frame selection | <kbd>F</kbd> |
| Delete selection | <kbd>Del</kbd> |
| Undo / redo | <kbd>Ctrl/Cmd</kbd>+<kbd>Z</kbd> / <kbd>Shift</kbd>+<kbd>Z</kbd> |
| Clean UI | <kbd>H</kbd> |
| Play VN | <kbd>P</kbd> |
| Play camera sequence | <kbd>C</kbd> |
| Next dialogue line | <kbd>Space</kbd> / click |
| Switch tabs | <kbd>1</kbd>…<kbd>7</kbd> |
| Exit VN / clean / menu | <kbd>Esc</kbd> |

### Saving

Projects **autosave** to `localStorage` on every change. The app opens on a beach demo scene;
the ⋯ menu can start a blank project or reload the demo. Use it to:

- download / load a `.lowpoly.json` project
- save a PNG screenshot of the current frame
- export the dialogue as a readable `.txt` script

---

## Project structure

```
index.html               app shell, import map, VN overlay, timeline
css/app.css              complete editor UI (dark studio theme, responsive)
src/app.js               panels, actions, dialogue player, camera timeline, VN
src/engine.js            three.js renderer, environment presets, picking, gizmo, framing
src/lowpoly.js           procedural characters, props, textures
src/state.js             project schema, defaults, normalisation, persistence
src/vendor/              three.js r169 + OrbitControls + TransformControls (offline, MIT)
scripts/dev-server.mjs   local static server
scripts/prepare-www.mjs  copies the app to www/ for Capacitor
scripts/build-apk.mjs    one-command Android build
scripts/selftest.mjs     headless jsdom UI test suite
scripts/studio-test.mjs  real three.js Studio test with a stub renderer
scripts/boot-test.mjs    full boot smoke test (239 checks in total)
scripts/test-dom.mjs     shared jsdom harness used by all three suites
capacitor.config.json    Android wrapper configuration
.github/workflows/android.yml   CI that builds the APK
docs/BUILD_APK.md        APK build & signing guide
```

## Tests

```bash
npm test
```

Runs three headless suites in jsdom (no GPU needed):

1. builds every character, prop and procedural texture, renders every panel, exercises editor
   actions, camera keyframes, VN playback and normalisation, and verifies every `data-act` has a handler;
2. spins up the real three.js `Studio` with a stub renderer and tests all seven environment presets,
   the scene graph, gizmo attachment, transforms and camera helpers;
3. boots the entire app — real Studio, real panels, real event wiring — and drives it end to end.


## Notes & limits

- All rendering is real-time three.js; on very low-end phones reduce the browser zoom or turn off
  particles/shadows.
- Projects with large imported textures may exceed the `localStorage` quota — download the JSON to
  keep a copy (the autosave failure is reported in the top bar).
- There is no video encoder in the app: use your device’s screen recorder. That’s why Clean UI and
  automatically fading VN chrome exist.
- Characters are stylised primitives (not rigged skeletons); poses are preset limb rotations with
  subtle idle animation.

## License

MIT — see [LICENSE](LICENSE). three.js is MIT too, see [src/vendor/LICENSE](src/vendor/LICENSE).
