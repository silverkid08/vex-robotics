---
name: new-gui-function
description: How to design and build a new child-facing GUI function for the VEX GO puzzle app (a new piece, a new button or gesture, a new picture) so it matches the decisions already made - piece anatomy, icon rules, gesture rules, the mock-and-choose workflow, verification clicks. Use when the owner asks for "a piece for X", "a button that does Y", "change the picture for Z", or asks what else could be added.
---

# New GUI function

Read `kid-ui-guidelines` first (the design rules) and `add-puzzle-piece` (the file-by-file checklist).
This skill is the layer above both: it records the decisions the owner has already made while
iterating on the app, so a new function lands looking like it was always there.

## 1. Decide what kind of function it is

| Kind | Where it lives | Pattern to copy |
|---|---|---|
| Action piece (robot does something) | `pieces.js` + `icons.js` (+ `robot.js`, `sim.js`) | `forward`, `turnRight90`, `magnetOn` |
| Wait / sense piece | `pieces.js` + `icons.js` | `waitBump`, `waitSee` |
| Container piece (holds other pieces) | `pieces.js` + `editor.js` frame code | `repeat` (the only one; never nested) |
| Button / gesture on the editor chrome | `index.html` + `app.js` + `editor.js` | trash triple-tap, slot tap/hold, direction toggle |
| Picture change only | `icons.js` + docs | turn arrows, magnet bulb, bump arrow |

Ask the owner only when two readings lead to materially different work (e.g. "a speed piece":
one piece that cycles turtle/rabbit, or three pieces?). Otherwise pick the simplest reading, build it, and say what you assumed.

## 2. Piece anatomy (fixed; do not fight it)

Every piece body is `SIZE` = 124 px with a hole on the leading edge and a knob on the trailing edge
(`framePath` in editor.js). Inside, `pieceInner()` lays out **three fixed rows**:

```
┌──────────────┐
│   ● ● ●      │  .piece-dots   16 px  - count parameter, drawn by Icons.dots(n) from def.dots(p)
│   [picture]  │  .piece-icon   64 px square, centred, never touches the hole on the left
│  helper words│  .piece-words  rest   - .piece-label only when body.labels; the row keeps its size
└──────────────┘
```

Consequences for a new piece:
* The picture is a 100 x 100 SVG that must read at 64 px. Do not draw counts inside it; give the
  piece `dots: (p) => p` and the strip draws them.
* The rows do not change when helper words are toggled, so the picture is always the same size and
  position. Never add per-piece layout CSS.
* Top-to-bottom pieces are taller by `HOLE_DEPTH`; the inner area starts below the hole. Nothing to do.
* Repeat head is `--piece + 6px` wide (ltr) / `--piece + 10px` tall (ttb) so the words row ends
  before the pocket. A new container must reuse `.container-head` and `_drawFrames()`.

## 3. Picture rules the owner has settled

Beyond `kid-ui-guidelines`:

* **Robot's point of view, facing up.** Turn arrows use `turnArrow(sweep, cw)`: a short stub at
  the bottom (not a long stem - it must not look like "drive then turn"), an arc, and a head that
  points where the robot faces afterwards (90 = sideways, 180 = down, 360 = a full circle starting on
  the left, no stub). Any new motion picture follows the same convention: the robot is at the bottom
  centre, "forward" is up.
* **No hands, fingers or people.** The owner removed a hand (it read as a rude gesture at small
  size). Show the *thing that happens* instead: an arrow pressing the bumper, a ball dropping, a wall.
* **On/off is a small lightbulb**, lit (`#fff6b0` + yellow rays) or grey (`#c9ced3`), below the
  object (see `magnet(on)`). Reuse it for any other on/off device (eye light, future motors).
* **Counts are dots, never digits**; infinity is a wave. Both live in the dot strip.
* **Colour families are fixed** (`Groups`). A new family needs a new colour and a docs/07 entry.
* Standard strokes: 4 px `#1a1a1a` outline, white or saturated fills, `#ffb800` for glow/rays,
  `#4a4a4a` for the bumper base, `#cfcfcf` for an unlit bumper cap.

## 4. Gesture rules the owner has settled

* **Tap** = do the obvious thing (palette: append; strip piece: cycle parameter; slot: load).
* **Hold 0.5 s** = the grown-up variant (strip piece: - / + stepper; slot 0.8 s: save).
* **Triple tap** = destructive-but-recoverable action on a chrome button (trash clears the program).
  One or two taps give visible feedback (shake) and do nothing. Window: `TRASH_TAP_WINDOW_MS` = 1.2 s.
* **Drag** = move. A drop joins the program only near a piece or the start flag; elsewhere the piece is
  thrown away - except on an **empty program**, where the whole editor accepts the first piece.
* Every gesture has a sound (`sound.js`: pop, tick, start, finish, stop, nope) and a motion
  (CSS keyframes: pulse, flash, wiggle, trash-shake, trash-tip). Add both for a new gesture.
* Gestures must work with `pointerType` touch and mouse, and must be ignored while
  `editor.locked` (a program is running).

## 5. Workflow: mock, choose, build

When the picture is a matter of taste (most are), do not guess once:

1. Write a throwaway page `app/_mock-<name>.html` that renders **up to 10 variants** on the real
   piece colour at palette size (124 px with 4 px border), numbered 1-10 with a 3-word caption.
   Copy the current `bumper()`/`magnet()`/`arrowUp()` helpers inline so the mocks match.
2. Serve it from the running app (`http://localhost:8080/_mock-<name>.html`), zoom-screenshot the
   grid with `save_to_disk`, give the owner the numbered list plus your pick and why.
3. On the owner's number: move that SVG into `icons.js` as a named helper, delete the mock page,
   update docs/07's piece table, reload, zoom on the piece in the palette and the strip.

For a behaviour (gesture, button) build it directly; the owner iterates on the running app.

## 6. Candidate functions not yet built (from the VEXcode GO block list, docs/03)

Ranked by fit for a four year old; the first two are the suggested next steps.
(Done: **speed piece** `speed` - five levels 17/33/50/75/100 %, half-circle speedometer picture (`speedGauge(lv)`, level 3 straight up, needle never leaves the arc) + dots,
`robot.setSpeed(pct)` sends both velocity lines; Play resets to level 3 via `prepare()`.)

1. **Drive until crash** - `DRIVE_UNTIL 1 25`; picture: up arrow into a wall with a bump star.
2. **Drive until the eye sees something** - `DRIVE_UNTIL 2 25`; picture: up arrow + eye + box.
3. **Eye light on/off** - `SET_SENSOR_LED 100/0`; picture: the eye with the lightbulb from §3.
4. **Spin (no angle) + Stop pieces** - `TURN 25` / `DRIVE_STOP 2`; stop picture: red stop sign.
5. **Repeat until bump / until eye sees** - repeat frame whose head shows a sensor instead of dots.
6. **"When bumper pressed" start** - a second start flag; program re-runs on each press.
7. **If / else fork** - Y-shaped two-pocket container; hardest concept, do last.
8. **Robot Arm preset** - motor spin pieces, only if the owner has the arm kit.
9. **Record a drive** (not VEXcode) - Drive tab writes pieces; strong teaching bridge.

Skip: turn-to-heading, timers, broadcasts, variables, operators, console, brightness/range/torque/
timeout/brake settings - they are text or number concepts with nothing to picture.

## 7. Verify before saying done (the owner expects all of these)

Run `npm test`, then in Chrome on the pretend robot (`run-kid-app` has the clicks):

* palette and strip, **left-to-right and top-to-bottom** (`#btn-order`);
* **helper words on and off** (`#pal-labels`): pictures must not move or resize;
* inside a **repeat** pocket and as the repeat head if it is a container;
* the **hold popover** preview (`.pop-preview`) and the **parent guide** (`#btn-guide`) pictures;
* zoom at min and max (`#btn-zoom-out` / `#btn-zoom-in`) if the change touches layout;
* `read_console_messages` pattern `rror` is empty.

Zoom-screenshot the piece itself; a full-page screenshot hides 64 px pictures. Report what you saw,
not what you expect, and leave the app tab open on the Build tab, left-to-right, labels as you found
them.

## 8. Keep in sync

New piece → docs/03 table + docs/07 catalogue + `add-puzzle-piece` helper list.
New gesture or layout rule → docs/07 rules + `kid-ui-guidelines`. New settled picture convention → §3 here.
