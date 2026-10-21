---
name: add-puzzle-piece
description: Step-by-step checklist for adding or changing a picture piece in the kid puzzle app (icon, piece definition, robot method, simulator behaviour, tests, docs). Use when the user asks for a new block/piece/action/sensor picture in the app.
---

# Add a puzzle piece

Files: `app/js/icons.js`, `app/js/pieces.js`, `app/js/robot.js`, `app/js/sim.js`, `tests/runner.test.mjs`, `docs/03-block-reference.md`, `docs/07-kid-gui-design.md`.

## 1. Picture (`icons.js`)
* Add `Icons.<name> = (param) => svg(...)` in a 100×100 viewBox. Rules: no text, 4 px `#1a1a1a` outlines, white or saturated fills, readable at 60 px (pieces draw it 64 px square). Parameters are shown as colour or shape, never digits. Counts are NOT drawn in the picture: give the piece a `dots(p)` and the piece renders `Icons.dots(n)` in its own row above the picture (Infinity = wave).
* Reuse the helpers (`arrowUp`, `arcArrow(sweep, cw)`, `turnArrow(sweep, cw)`, `bumper(led, pressed)`, `magnet(on)`, `eye(color, object)`, `hourglass()`, `loop()`).

## 2. Definition (`pieces.js`)
```js
{ id: 'spinDance', group: 'turn', params: [1, 2, 3], defaultParam: 1,
  icon: () => Icons.spinDance(), dots: (p) => p,
  run: async ({ robot, piece, signal }) => { for (let i = 0; i < piece.param; i++) await robot.turnFor(360); } }
```
* `group` picks the colour family (`Groups`): move, turn, light, magnet, wait, loop. Add a new family only with a new colour and a docs/07 entry.
* `run` must be cancellable: long waits use `sleep(ms, signal)` / `waitUntil(robot, pred, signal)`; robot motions already time out and are cancelled by `Runner.stop()`.
* Containers: set `container: true` and let `Runner._runList` handle children (see `repeat`).
* Always provide `label: (p) => 'Short words'` (shown when helper words are on, used for A–Z sorting) and `help: 'One sentence for the parent guide.'`.
* Numeric `params` automatically get the hold-to-open − / + stepper; string params get a picture picker.
* `id` is stored in saved programs — never rename an existing id; add a new one.

## 3. Robot capability (`robot.js`) — only if needed
Add a method that builds a script line (see the `vex-go-ble-protocol` skill), e.g. `motorSpinFor(port, deg)`. Use `this.send(line, Port.Drivetrain)` when the brain should finish before the next piece, `this.send(line)` for fire-and-forget.

## 4. Pretend robot (`sim.js`)
Teach `SimBrain._execute` the script line so offline play and tests behave (set `w.target` for timed motions; update `w.bumper/w.magnet/w.eye` for devices). Keep the active-command/`0xFF` convention so completion detection works.

## 5. Test (`tests/runner.test.mjs`)
Build a program with `makePiece('<id>', param)`, run it on `SimBrain` (`sim.tickMs = 20; sim.speed = 8;`), assert on `sim.world` or on logged script lines. Run `npm test`.

## 6. Docs
* `docs/03-block-reference.md`: add a row to the puzzle-piece table (piece → equivalent VEXcode block → script line).
* `docs/07-kid-gui-design.md`: add to the piece catalogue; if it changes an interaction rule, update the rules list.

## 7. Check in the browser
`npm start`, open http://localhost:8080, drag the piece in, tap to cycle its parameter, play on the pretend robot, toggle reading direction. Verify the palette still fits on a tablet (scroll is fine).
