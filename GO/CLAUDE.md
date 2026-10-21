# VEX GO Kid Coder — notes for Claude Code

## What this is and why

A picture-only, jigsaw-piece programming and driving app for VEX GO robots, made for the owner's four-year-old who cannot read. VEXcode GO (codego.vex.com) is text-heavy; this app replaces it with pictures (arrows, arcs, glowing bumper, hourglass, dots for numbers) and talks to the GO Brain directly over Web Bluetooth. The owner iterates on it with you: expect requests like "pieces must look more like puzzle pieces", "add a piece for X", "the robot window is in the way".

Key technical fact (docs/01, docs/02): VEXcode GO never compiles or downloads anything. Blocks become Python, run in Pyodide in the browser, and each action is a 5-byte BLE write (`0x20` + uint32 command) to characteristic `6faa5920-…`. Our `app/js/encoder.js` is byte-exact with VEX's encoder (112 golden vectors). Nothing here needs VEX tooling.

## Run / test

```
npm start   # node tools/serve.mjs → http://localhost:8080 (run in background)
npm test    # node --test tests/**/*.test.mjs  (~4 s)
```
No dependencies, no bundler, ES modules. Default mode is the pretend robot (SimBrain); the Bluetooth button switches to a real brain (Chrome/Edge, localhost or HTTPS).

## Layout

- `app/index.html`, `app/css/style.css` — one page: Build tab, Drive tab, grown-up panel, parent guide overlay, parameter popover.
- `app/js/encoder.js` — script line (`DRIVE_FOR 450 25`) → uint32 → packets. Never hand-pack bytes elsewhere.
- `app/js/ble.js` — `VexGoBle` transport + parsers (`parseSensorStatus`, `parsePortStatus`, `parseAcks`).
- `app/js/sim.js` — `SimBrain`, same interface as `VexGoBle`, used offline and by tests (`sim.speed`, `sim.tickMs`).
- `app/js/robot.js` — `GoRobot`: sensor snapshot, "wait until the port reports done", `prepare()`, `stopAll()`, remote-control mode.
- `app/js/pieces.js` — piece catalogue (`id`, `group`, `params`, `icon`, `label`, `help`, `run`), serialisation.
- `app/js/editor.js` — palette + strip, jigsaw rendering (`framePath`, `pieceSvg`), repeat frames, wrap arrows, zoom, drag/drop, tap/hold parameters, palette settings.
- `app/js/runner.js` — executes a program, emits `piece` events for highlighting.
- `app/js/drive.js`, `gamepad.js` — Drive tab and controller.
- `app/js/simview.js` — pretend-robot canvas, `predictPath()`, speed and size controls.
- `app/js/icons.js` — every SVG picture; `app/js/sound.js` — blips.
- `docs/` — 00–09 numbered documentation (index in docs/README.md). `tests/` — encoder golden vectors, parsers, simulator runs, path prediction.
- `.claude/skills/` — `vex-go-ble-protocol`, `add-puzzle-piece`, `run-kid-app`, `refresh-vexcode-analysis`, `kid-ui-guidelines`, `new-gui-function` (the owner's settled design decisions, the mock-and-choose workflow and the list of candidate functions). Load the relevant one before touching protocol code, pieces, or anything the child sees.

## Conventions

- Child-facing UI is pictures only; words appear only via the helper-words toggle (`body.labels`, `data-label`/`title`), the parent guide and the gear panel. Every piece needs `label(p)` and `help`.
- Pieces are jigsaw shapes with a hole on the leading edge and a mushroom knob on the trailing edge; rows are centred on one midline; repeats are one big frame and are never nested. Both reading directions (`program.order` = `ltr`/`ttb`) must keep working.
- Firmware ports are 0-based in code (Code Base: bumper 1, magnet 2, drivetrain = virtual port 4).
- Colour families are fixed (see `Groups` in pieces.js). Piece ids are stored in saved programs: never rename, only add.
- `_afterLayout()` in editor.js redraws repeat frames and wrap arrows after any DOM change; call it if you add layout-affecting features.
- Run `npm test` after changes to encoder/ble/robot/sim/runner/pieces/simview. Verify UI changes in Chrome in both reading directions and at min/max zoom (the `run-kid-app` skill lists the clicks).
- Keep docs in sync: new piece → docs/03 + docs/07; protocol change → docs/02 + the protocol skill; design rule change → docs/07 + `kid-ui-guidelines`.
- Write code files with the Write/Edit tools; the Bash tool collapses `\\` in heredocs.

## Current state (2026-10-21)

Done and verified on the simulator: full piece set (incl. a five-level speed piece), interlocking pieces in both directions, repeat frames with inner knob, wrap arrows, zoom, drop-to-delete on empty space (an empty program accepts a drop anywhere), triple-tap trash to clear, hold-for-stepper, helper words, three fixed rows inside every piece (dots / picture / words), parent guide, palette size/layout/sort, docked collapsible pretend-robot window with route prediction, speed and size buttons, Drive tab with picture sensors and gamepad. Not yet tried against a physical GO Brain from this app.

Open ideas (ranked in the `new-gui-function` skill): drive-until-crash and drive-until-see pieces, eye light, spin/stop, repeat-until, event ("when bumper pressed") start, if/else, Robot Arm preset, record-a-drive, printable cards.
