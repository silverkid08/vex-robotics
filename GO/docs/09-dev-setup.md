# 09 — Developer setup and project layout

## Requirements

* To **use** the app: nothing but Chrome or Edge (Web Bluetooth). Firefox/Safari can run the simulator only. Open `dist/vex-go-kid-coder.html` from disk.
* To **develop** it: Node ≥ 20 (tests use `node --test`, the server and the bundler are dependency-free). No npm packages.
* A VEX GO Brain with current firmware (update once via https://codego.vex.com if the brain is old).

## Run

```
npm start        # http://localhost:8080  (serves ./app; localhost counts as a secure context)
npm run build    # dist/vex-go-kid-coder.html: the whole app in one file that opens from disk
npm test         # node --test tests/**/*.test.mjs  (also fails if dist/ is older than app/)
```

### The single-file build

`app/index.html` loads `js/app.js` as an ES module. Chrome fetches module scripts with CORS, and a `file://` page has a null origin, so double-clicking `index.html` gives *"Access to script … has been blocked by CORS policy"* and an empty page. `tools/build.mjs` fixes that without adding a dependency: it walks the import graph from `app.js`, wraps each module in `const __m_<name> = (() => { … return { exports }; })();` in dependency order, rewrites `import { a } from './x.js'` to `const { a } = __m_x;`, and inlines the resulting classic script plus `style.css` into a copy of `index.html`. The output is deterministic and committed, so the owner never needs Node; `tests/build.test.mjs` compares it against a fresh build and fails with "run `npm run build`" when the sources moved on.

The bundler is intentionally narrow. Only `import { a, b as c } from './x.js'` and `export const|let|var|function|async function|class NAME` are translated; default exports, `export { … }` lists, re-exports, dynamic `import()`, `import.meta` and circular imports make it throw. Exported `let` bindings are copied, not live, so do not export mutable state (nothing does today).

Web Bluetooth from a `file://` page is not something to rely on across Chrome versions; the single file is for the simulator and the challenges, and for carrying the app around. For the real brain use localhost or HTTPS.

For a tablet on the same Wi-Fi you need HTTPS (Web Bluetooth refuses plain http except localhost). Easiest: `npx http-server app -S -C cert.pem -K key.pem` with a self-signed cert, or deploy the `app/` folder to any static HTTPS host (GitHub Pages works).

## Layout

```
app/
  index.html          the page (two screens: build, drive; grown-up panel)
  css/style.css
  js/encoder.js       script line → uint32 → packets (port of VEX ProgramUtil; pure, tested)
  js/ble.js           Web Bluetooth transport + notification parsers
  js/sim.js           pretend brain with the same interface (used by tests and offline play)
  js/robot.js         GoRobot: sensor snapshot, command completion, prepare/stop, remote-control mode
  js/pieces.js        puzzle piece catalogue (icon + run)
  js/editor.js        drag-and-drop puzzle editor (LTR/TTB)
  js/runner.js        executes a program, highlights pieces
  js/drive.js         Drive tab (pictures + arrow pad + gamepad)
  js/gamepad.js       Gamepad API polling
  js/simview.js       canvas view of the pretend robot
  js/icons.js         all SVG pictures
  js/sound.js         WebAudio blips
  js/app.js           wiring, tabs, stickers, grown-up panel, Challenge tab, profiles
  js/challenges.js    challenge catalogue (text grids, par, hints)
  js/challenge.js     Arena: board physics, objectives, drawing
tests/
  encoder.test.mjs    112 golden vectors from VEX's own encoder
  ble-parse.test.mjs  notification parsers
  runner.test.mjs     end-to-end programs on the simulator
  challenges.test.mjs every challenge solved by its known solutions (fixtures/challenge-solutions.mjs)
  fixtures/vex-command-golden.json
tools/serve.mjs       static server
docs/                 this documentation
.claude/skills/       repeatable procedures for Claude Code (see below)
```

## Adding a piece (summary; full checklist in `.claude/skills/add-puzzle-piece`)

1. Draw the picture in `icons.js` (100×100 viewBox, thick black outlines, no text).
2. Add a definition to `Pieces` in `pieces.js`: `id`, `group`, optional `params`, `icon(param)`, optional `dots(param)` for a count shown above the picture, `run({robot, piece, signal})`. The `new-gui-function` skill holds the settled picture and gesture conventions and a mock-and-choose workflow for pictures.
3. If it needs a new robot capability, add a method to `GoRobot` (`robot.js`) using a script line from [02](02-bluetooth-protocol.md), and teach `SimBrain` (`sim.js`) how to pretend it.
4. Add/extend a test in `tests/runner.test.mjs`.
5. Document it in [03](03-block-reference.md) (puzzle table) and [07](07-kid-gui-design.md).

## Browser testing checklist

* Build tab: tap pieces, drag between pieces, into a repeat pocket, to the trash; toggle direction; play on the simulator and watch the toy robot.
* Drive tab: hold arrows (simulator robot should move); press pretend-bumper/eye buttons on the build tab to see sensor pictures change.
* Challenge tab: pick a card, build a program, play; a win shows stars and the next arrow; the Build tab still has the free-play program afterwards. See [10](10-challenge-mode.md).
* Real brain: Bluetooth button → chooser → face turns happy; the grown-up log shows `TX …` lines and acks; a 3-piece program should take ~5 s.

## Conventions

* ES modules, no framework, no third-party bundler (only our ~150-line `tools/build.mjs`, which needs the plain import/export forms listed above). Keep files small and documented at the top.
* Script lines (`"DRIVE_FOR 338 25"`) are the single source of truth for robot actions; never hand-pack bytes elsewhere.
* Firmware ports are 0-based everywhere in code; docs say "Port 2 (firmware 1)" when it matters.
* Anything a child sees must be an SVG from `icons.js`.
