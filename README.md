# Low Poly Studio

A browser-based **low poly 3D scene maker** for little films and visual novels — character creator,
environment presets, prop library, procedural **and imported** textures, a scene graph editor,
VN dialogue with auto-framing cameras, a keyframed cinematic camera, and a **first-person POV game
mode** you can walk around with an on-screen gamepad. Hit **Clean UI** and screen-record a pure 3D
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
three.js is vendored in `src/vendor/`. Open the printed URL and start creating.

> ES modules + import maps need `http://` (or the APK). Opening `index.html` via `file://` will not
> work in Chrome. `npm run dev` starts a tiny zero-dependency static server.

### Build the Android APK

```bash
npm run apk        # dist/lowpoly-studio-debug.apk (needs JDK 21 + Android SDK)
```

Or let GitHub do it: **Actions → Build Android APK → Run workflow**, then download the
`lowpoly-studio-debug-apk` artifact. Full instructions, signing, icons and troubleshooting:
**[docs/BUILD_APK.md](docs/BUILD_APK.md)**.

---

## The new interface

Everything lives on a **left tool rail** and the **Home** screen explains the five-step flow:

```
┌───────────────────────────────────────────────────────────────────────┐
│ brand  project        [▶ Play story] [🎬 Camera] [🕹 POV]   🎥  ⋯  ⛶ │
├──────┬──────────────────────────────────────────┬─────────────────────┤
│ 🏠   │                                          │                     │
│ 🧑‍🎤 │            three.js viewport             │   active tool       │
│ 🌤   │     (gizmo, selection box, guides)       │   panel             │
│ 📦   │                                          │                     │
│ 🎨   │                                          │                     │
│ 🗂   │                                          │                     │
│ 💬   │                                          │                     │
│ 🎬   │                                          │                     │
│ 🕹   │                                          │                     │
│ ❔   │                                          │                     │
├──────┴──────────────────────────────────────────┴─────────────────────┤
│  camera timeline: play · loop · keyframe diamonds · quick moves        │
└───────────────────────────────────────────────────────────────────────┘
```

**Home · Actors · World · Props · Textures · Arrange · Story · Camera · Play** — Story, Camera and POV
are also permanent buttons in the top bar, so they are never buried. On phones the rail turns into a
bottom bar.

### What each tool does

| Tool | What it does |
| --- | --- |
| **Home** | Five-step tour, project statistics and one-tap shortcuts to every tool. |
| **Actors** | Parametric low-poly characters: skin, **eye colour**, **11 hair styles**, hair colours, **7 outfits** (tee, hoodie, jacket, dress, suit, overalls, coat), **9 accessories** (hat, cap, glasses, crown, headphones, beanie, cat ears, scarf…), height/build/head-size sliders, 5 expressions and 8 poses. Randomise, duplicate, frame, face-camera, or **Play as** directly. |
| **World** | Seven visual preset cards, **time-of-day chips** (dawn, noon, golden hour, dusk, night), a **draggable sun compass**, sky colours, fog, particles, ground/water, one-click actor/prop adding and prop scattering. |
| **Props** | 20 low-poly props with colour, roughness, metalness, glow, flat shading, textures and full transforms. |
| **Textures** | 16 procedural canvas patterns **plus image import**: drag & drop anywhere, paste with <kbd>Ctrl</kbd>+<kbd>V</kbd>, or pick several files at once. Imports auto-apply to the selected prop. |
| **Arrange** | Scene graph of every actor and prop: visibility, lock, rename, duplicate, ground-snap, inspect and transform. |
| **Story** | Visual-novel script: speaker, text, expression and camera shot per line, plus themes and preview. |
| **Camera** | **Quick moves** (orbit, push in, crane up, pan) that generate keyframes, plus manual keyframes storing **position, rotation (yaw/pitch/roll), FOV and easing**. Timeline with scrubbing, draggable markers, capture-from-view and loop playback. |
| **Play** | **POV / game mode**: pick any actor, walk the set, jump, switch first/third person and **pick props up**. Includes an on-screen joystick, look pad and buttons for phones. |
| **Clean UI** | One button (<kbd>H</kbd>) hides every panel, HUD and guide for a clean screen recording. Hold anywhere to bring the UI back. |

### POV / game mode

Press <kbd>G</kbd> (or **POV** in the top bar) to become the selected actor.

| Action | Desktop | On-screen gamepad |
| --- | --- | --- |
| Walk | <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows | left **MOVE** stick |
| Look | mouse (click to lock) or drag | right **LOOK** pad / drag the scene |
| Run | <kbd>Shift</kbd> | **Run** |
| Jump | <kbd>Space</kbd> | **Jump** |
| Grab / drop a prop | <kbd>E</kbd> | **Grab** |
| First / third person | <kbd>F</kbd> | **View** |
| Leave POV | <kbd>Esc</kbd> | **Exit** |

Walk close to a small prop and face it; a prompt appears. Buildings and big trees are too heavy to
lift. The editor camera, selection and UI come back exactly as they were when you exit.

### Recording workflow

1. Stage your actors and props.
2. Write a few dialogue lines (or build a camera sequence with **Quick moves**).
3. Press **🎥 Clean UI** (<kbd>H</kbd>) — or stay in POV with the gamepad hidden.
4. Start your screen recorder / Android recorder.
5. Press <kbd>P</kbd> to play the VN or <kbd>C</kbd> to play the camera sequence — or just walk
   around and record.
6. Hold the screen for a second (or tap <kbd>H</kbd>) to restore the editor.

The VN’s exit button and hints fade out automatically after a few seconds so they do not end up in
your recording.

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
| Play story (VN) | <kbd>P</kbd> |
| Play camera sequence | <kbd>C</kbd> |
| POV game mode | <kbd>G</kbd> |
| Switch tools | <kbd>1</kbd>…<kbd>9</kbd> |
| Next dialogue line | <kbd>Space</kbd> / click |
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
index.html               app shell, tool rail, import map, VN overlay, POV gamepad
css/app.css              editor UI: dark studio theme, home screen, rail, game HUD
src/app.js               panels, actions, dialogue player, camera timeline, POV wiring
src/game.js              first/third-person controller: walking, collisions, grab & carry
src/engine.js            three.js renderer, environment presets, picking, gizmo, framing
src/lowpoly.js           procedural characters, props, textures
src/state.js             project schema, defaults, normalisation, persistence
src/vendor/              three.js r169 + OrbitControls + TransformControls (offline, MIT)
scripts/dev-server.mjs   local static server
scripts/prepare-www.mjs  copies the app to www/ for Capacitor
scripts/build-apk.mjs    one-command Android build
scripts/selftest.mjs     headless jsdom UI test suite
scripts/studio-test.mjs  real three.js Studio test with a stub renderer
scripts/boot-test.mjs    full boot + POV + import smoke test (336 checks across all three suites)
scripts/test-dom.mjs     shared jsdom harness used by the suites
capacitor.config.json    Android wrapper configuration
.github/workflows/android.yml   CI that builds the APK
docs/BUILD_APK.md        APK build & signing guide
```

## Tests

```bash
npm test
```

Runs three headless suites in jsdom (no GPU needed):

1. builds every character variant (all hair, outfit and accessory options), every prop and texture,
   renders all nine panels, exercises editor actions, time of day, camera moves, VN playback and
   normalisation, and verifies every `data-act` has a handler;
2. spins up the real three.js `Studio` with a stub renderer and tests all seven environment presets,
   the scene graph, gizmo attachment, transforms and camera helpers;
3. boots the entire app, walks in POV mode, grabs and drops a prop, imports a texture, and checks
   every panel's markup.

## Notes & limits

- All rendering is real-time three.js; on very low-end phones reduce the browser zoom or turn off
  particles/shadows.
- POV mode walks on flat ground with simple circle collisions, a jump and prop pick-up — there is no
  ragdoll physics or climbing.
- Projects with large imported textures may exceed the `localStorage` quota — download the JSON to
  keep a copy (autosave failures are reported in the top bar).
- There is no video encoder in the app: use your device’s screen recorder. That’s why Clean UI and
  the auto-fading VN chrome exist.
- Characters are stylised primitives (not rigged skeletons); poses are preset limb rotations with
  subtle idle animation.

## License

MIT — see [LICENSE](LICENSE). three.js is MIT too, see [src/vendor/LICENSE](src/vendor/LICENSE).
