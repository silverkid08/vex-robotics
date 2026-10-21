# 07 — Picture-only puzzle GUI: design

Goal: a four-year-old who cannot read builds and runs robot programs alone, and drives the robot with pictures for feedback. Grown-ups get a small hidden panel for connection, saving and logs.

## Rules (keep these when iterating)

1. **No required reading.** Every control is a picture. Words are optional: a grown-up can switch on **helper words** (gear panel or the *Abc* palette button) which caption every piece and button, and open the **parent guide** (book button) that explains each picture. Tooltips exist on everything but are never needed.
2. **Pieces are jigsaw pieces.** Each has a round *hole* on the leading edge and a mushroom-shaped *knob* on the trailing edge; the knob of one piece sits inside the next piece's hole so the eye sees order. The first piece has no hole; the last (also the last inside a repeat) has no knob. A **repeat is one big green piece**: its frame wraps the pieces placed inside (they click onto a knob inside the frame, in a darker well) and the frame's own knob connects to the next piece. Repeats cannot be nested. Program pieces are 124 px and the strip can be **zoomed** (0.5×–1.75×) with the magnifier buttons.
2b. **Rows wrap and the path is shown.** In left-to-right order pieces wrap to new rows inside the editor (vertical scroll only). A grey dotted snaking arrow leads from the end of one row down and back to the start of the next so a child can follow the order.
3. **One idea per piece, one colour per family.** Blue = move, purple = turn, yellow = light, pink = magnet, orange = wait/sense, green = repeat. A family's colour never changes.
4. **Reading direction is a choice.** A toggle flips the strip between left-to-right (tab on the right) and top-to-bottom (tab on the bottom) — the shapes re-render so pieces still interlock.
5. **Parameters are pictures too.** Tapping a piece cycles its picture-parameter: dots (1–5 steps or seconds), the size of a turn arc (90°, 45°, 135°, 180°), the colour the eye waits for, the repeat count (2, 3, 5, 10 dots, or a wave for forever). Holding a piece for half a second opens a − / + stepper (or a picture picker for colours) for children who find cycling confusing.
6. **Touch first.** Pointer events, big targets (≥ 74 px, pieces 104 px), no hover-only affordances, no scroll fights (`touch-action: none` on the strip and palette), drags start after 8 px so taps still work.
7. **Immediate feedback.** Tap = blip, piece runs = wiggle + glow + tick, finish = three-note chime, "no" = low buzz, drop on trash = trash grows and reddens.
8. **Forgiving and predictable.** A piece must be dropped next to the program (within about 50 px of a piece or the start flag) to join it; dropping it on empty editor space throws it away (same buzz as the trash) so a child can "shake off" a piece anywhere. Tapping a palette piece appends it; everything autosaves; Stop always works.
9. **Safe defaults.** 50 % speed, 150 mm steps, 90° turns, 1.1 s magnet pulses, 20 s per-move timeout.

10. **The palette adapts to the child.** Four small tools above it (and the same options in the gear panel): piece size (small / medium / large), layout (one column, two columns, or a tray across the top), sort order (by colour family, A–Z, most-used first), and helper words on/off. Choices are remembered.

## Screen map

```
┌────────┬────────────────────────────────────────────────┐
│ 🧩 🎮  │                               🙂  (BT)  ⚙     │  top bar: Build / Drive tabs, face = connected?, Bluetooth, grown-ups
├────────┼────────────────────────────────────────────────┤
│palette │  🚩 [⬆]›[↱]›[🟢]›[🔁 ⟨ [⬆]›[⬇] ⟩ ]             │  program strip (LTR shown; TTB stacks downward)
│ ⬆ ⬇    │                                       ┌──────┐ │
│ ↱ ↰    │                                       │ toy  │ │  pretend-robot window (simulator mode only)
│ ↻ ↻    │                                       │ view │ │
│ 🔴🟢⚪  │                                       └──────┘ │
│ 🧲 🧲  │                                                │
│ ⏳ 👆  │                                                │
│ 👁 👁  │                                                │
│ 🔁     ├────────────────────────────────────────────────┤
│        │  ▶   ■   ⇄        ⭐ ❤️ 🚀                  🗑  │  play, stop, direction toggle, stickers (save/load), trash
└────────┴────────────────────────────────────────────────┘
```

Drive tab: a row of live sensor pictures (battery, bumper, eye, magnet, compass, speed, crash), a 4-arrow pad, LED red/green buttons, magnet grab/drop buttons, gamepad badge.

## Piece catalogue (v0.1)

| Piece | Picture | Parameter (tap) | Robot action |
|---|---|---|---|
| forward | white up-arrow on blue + dots | 1–5 steps (150 mm each) | `DRIVE_FOR` |
| backward | down-arrow | 1–5 | `DRIVE_FOR −` |
| turn right | arched arrow clockwise; the arc length shows the angle | 90°·45°·135°·180° | `TURN_FOR +deg` |
| turn left | arched arrow counter-clockwise | 90°·45°·135°·180° | `TURN_FOR −deg` |
| turn 180 | half-circle arrow | – | `TURN_FOR 180` |
| turn 360 | full-circle arrow | – | `TURN_FOR 360` |
| light red / green / off | bumper glowing red / green / grey | – | `SET_SWITCH_LED` |
| magnet grab / let go | magnet with sparks / magnet dropping block | – | `MAG_BOOST` / `MAG_DROP` |
| wait | hourglass + dots | 1–5 s | (timer) |
| wait for bump | hand pressing bumper | – | waits for bumper state |
| wait to see colour | eye with red/green/blue iris | red·green·blue | waits for eye colour + object |
| wait to see something | eye with a box | – | waits for proximity ≥ 50 |
| repeat | big green frame with loop arrow + dots | 1…10 (two rows of dots) · ∞ (wave) | runs the pieces inside N times; cannot hold another repeat |

## Interaction details

* **Drag from palette** → ghost follows the finger; a blue bar shows the insertion point (between pieces, or inside a repeat). Release on empty space or on the trash = the piece vanishes.
* **Drag inside the strip** → reorder, or move into/out of a repeat (never a repeat into a repeat). Release on empty space = thrown away.
* **Alignment** → all pieces in a row (or column) are centred on one midline, so a tall repeat piece has its hole and knob at its centre and neighbours still line up.
* **Drag to trash** → delete (trash grows while a drag is active so the target is obvious).
* **Tap piece** → next parameter picture. **Hold piece** → − / + stepper or picker. **Tap palette piece** → append copy.
* **Palette tools** (top of palette): size, layout, sort, helper words. **Book button** (top bar) → parent guide overlay with every piece explained.
* **Direction toggle** → re-renders shapes; order of pieces is unchanged. **Magnifier buttons** → zoom the strip (remembered).
* **Pretend robot window** is a column on the right of the editor (never over the pieces); its toy button collapses it. Magnifier buttons make the window bigger/smaller (four widths, remembered). Turtle/rabbit buttons set the pretend robot's speed (½×, 1×, 2×, 4×, shown as green dots). When Play is pressed the app predicts the route from the pieces (`predictPath` in `simview.js`: steps, turns, repeats up to 20 passes, "forever" as 3) and frames the picture so the whole route is visible, drawing it as a dashed line; the live blue trail follows, and the view grows if the robot goes further than predicted. Grid squares are one step (15 cm).
* **Play** while not connected → the Bluetooth button flashes and buzzes. **Play** while running → stops.
* **Stickers**: tap loads, hold saves (a flash confirms). Three slots; autosave slot is invisible.

## Roadmap ideas (not built yet)

* "if I see 🔴 then … else …" forked container (two pockets).
* "when bumper pressed" hat piece to start a second strip (events).
* Speed piece (turtle/rabbit) and dance piece (random turns).
* Printable picture cards that match the pieces, for planning away from the screen.
* Robot Arm preset pieces (lift/lower, rotate) when the arm is built.
* Record a drive in the Drive tab and turn it into pieces.
