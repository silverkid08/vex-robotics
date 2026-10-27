---
name: challenge-design
description: How to create, define, test and present a challenge (maze / goals level) for the VEX GO puzzle app's simulator-only Challenge mode - the text grid legend, the objective types the pieces and sensors can satisfy, the physics rules (one step = one square, bump = wall only), the difficulty ladder, the required solution test, and the browser check. Use when the owner asks for a new challenge, a change to a challenge, a new objective or obstacle type, or anything about Challenge mode.
---

# Challenge design

Challenge mode lives in `app/js/challenges.js` (the catalogue), `app/js/challenge.js` (the arena:
parsing, physics hooks, objectives, board drawing), `app/js/simview.js` (arena rendering),
`app/js/app.js` (the Challenge tab, level picker, celebration, per-child storage) and
`tests/challenges.test.mjs` (one solved run per challenge). Read `kid-ui-guidelines` first: the
board is seen by a pre-reader. Reference doc: `docs/10-challenge-mode.md`.

## 1. What a challenge is

A challenge is a small board of squares. **One square is one robot step (150 mm)**, so a
"forward 1" piece moves the robot exactly one square and a 90° turn keeps it on the grid. The robot
starts on the `S` square facing the `dir` given (default `N` = up). The child wins when every
objective on the board is done; the program does not have to finish, and there is no way to lose -
a program that does not win simply ends and the child tries again.

Challenge mode is simulator-only: entering the Challenge tab switches the transport to the pretend
brain. The free-play program is saved and restored when the child goes back to the Build tab; each
challenge keeps its own autosaved program (`vexgo.program.challenge.<id>`).

## 2. Grid legend (`grid` is an array of equal-length strings, row 0 at the top)

| Char | Meaning | Objective? |
|---|---|---|
| `#` | wall block (brick). Anything outside the grid is also wall. | - |
| `.` | floor | - |
| `S` | start square (floor). Exactly one. | - |
| `*` | star: reached when the robot's centre enters the square | yes |
| `o` | coin: collected when the robot drives over it | yes (all coins) |
| `R` `G` `B` | paint tile: painted when the robot is on it **while its bumper light is that colour** | yes (all tiles) |
| `r` `g` `b` | puck of that colour (flat; the robot can drive over it) | - |
| `1` `2` `3` | box for a red / green / blue puck: done when a matching puck lies in it | yes (all boxes) |
| `=` | gate: a wall until it opens (rule in `gate`), with a lamp that is red while closed and green when open | - |

`gate` (one rule for every `=` on the board): `{ after: seconds }` opens after a timer from Play;
`{ when: 'bump' }` opens when the bumper is pressed (the child taps the toy's bumper button, or the
robot bumps anything - "knock and the door opens"); `{ when: 'coins' }` opens once every coin is
collected; `{ closeAfter: seconds }` starts open and closes - the robot must be quick (speed piece).
Gate clocks start at Play (`arena.start()`, called from the sim's `setConfigPreset`, i.e. from
`robot.prepare()`) and freeze at the end (`arena.stop()` on `END`/`stopProgram`), so a board sitting
on screen never opens its doors by itself.

`par` (required): the piece count of the most efficient known solution; a repeat counts one plus its
children. Three stars at par or better, two within two pieces, else one (`gradeSolution`). Put the par
solution first in the fixture: the test checks its count. `B` paint tiles exist in the parser but
there is no blue light piece yet - do not use them until there is.

Keep boards small: 5-9 columns, 4-7 rows, so squares stay big in the window and on the thumbnail.

## 3. Physics the pieces can rely on

* **Walls and closed gates stop the robot.** The robot is a 104 mm disc; on contact it stops, the
  current move is cancelled (the program carries on with the next piece), the bumper reads pressed
  and the crash star shows for ~0.6 s, and the robot settles back onto the centre of the square it
  is in. So a "forward 5" into a wall 2 squares away leaves the robot 2 squares on, facing the wall.
* **Pucks, coins and tiles never stop the robot** (the bumper is above them).
* **Magnet grab** picks up a puck in the square straight ahead, or failing that the robot's own
  square; the puck then rides in front of the robot. **Magnet let go** drops it in the square ahead
  (or the robot's own square if ahead is wall). Only one puck is carried at a time.
* **The eye looks one square ahead**: a puck → its colour; a gate → red (closed) or green (open);
  a wall or closed gate → "something there". Floor and tiles are not seen. The sim's colour buttons
  are hidden in Challenge mode because the board drives the eye.
* **Timers are real seconds** (same clock as the wait piece). Challenge mode fixes the pretend
  robot at 2× (`CHALLENGE_SPEED` in simview.js: 1.5 s per square at speed 3, 0.75 s at speed 5), so
  design timed and closing gates against those speeds and leave ~0.5 s margin either side; the
  closing door in c19 is the worked example (2 squares away, shuts at 2.8 s).
* **Heading resets do not turn the robot on a board**: `SET_HEADING 0` from `prepare()` is ignored
  while an arena is set, so `dir: 'E'` starts really face east (this bit us once).
* Turns of 45° / 135° leave the grid; boards are designed for 90°, 180° and 360° turns.

## 4. Writing a challenge

```js
{ id: 'c07', name: 'Zigzag', dir: 'N', gate: null,
  grid: [
    '#######',
    '#...*.#',
    '#.#.#.#',
    '#S....#',
    '#######',
  ],
  // parent-facing only (the log and the guide); the child only sees the board
  hint: 'Up 2, right 1, up... or repeat {forward 1, turn right, forward 1, turn left} 2 times.' }
```

Rules:
* `id` is stored in saved programs and progress (`vexgo.challenge.done`): never rename, only add.
* Order in the catalogue = difficulty order = order of the level cards. Introduce **one new idea per
  challenge** and reuse it in the next one: step → turn → several turns → coins → backward → around a
  block (two routes) → paint → gates (bump, timer, coins) → pucks → repeat patterns → mazes → speed.
* At least every third challenge must be solvable in **two clearly different ways** (two routes,
  or sequence vs. repeat, or wait N vs. wait-to-see-green); write both as solutions in the test.
* Every objective must be reachable with the pieces that exist (`pieces.js`). Do not design a board
  that needs a piece that is not there.
* Exactly one `S`; at least one objective; the start square itself is never an objective.

## 5. The solution test (mandatory)

`tests/challenges.test.mjs` runs **every** challenge in the catalogue with its solutions from
`tests/fixtures/challenge-solutions.mjs` on `SimBrain` + `Arena` (tick 5 ms, speed 20, eight boards
at a time) and asserts `arena.won`, that the first solution has exactly `par` pieces and earns three
stars, that at least a third of the boards have two solutions, that the robot never leaves any
board, that a bump presses the bumper / shows the crash / settles the robot, that gate clocks only
run during a program, and that the closing door really stops a normal-speed robot (run at the app's
2×). A challenge without a solution entry fails the suite. For bump gates the fixture can `press`
the bumper after a delay; keep timed gates at 2 s so the suite stays about a minute.

Write the solution with `makePiece` exactly as a child would build it (no cheats through the robot
API). If the solution needs more than ~12 pieces, the challenge is too hard for this app.

## 6. Presentation rules (the child must read the board with no words)

* Walls = brown brick blocks; floor = pale squares with the grid showing; outside = nothing.
* Star = big yellow star; coin = gold circle; paint tile = coloured outline with a grey middle
  that fills when painted; puck = coloured disc with a highlight; box = coloured open square;
  gate = striped barrier with a lamp (red/green), the barrier slides away when open.
* Start square shows faint footprints/arrow so the child knows where the robot begins; the robot
  is drawn exactly as in free play, carrying its puck in front.
* Progress: done objectives change state in place (coin vanishes with a pop, tile fills, puck in
  box gets a tick, star sparkles) with a sound each time. Winning = star burst overlay + chime +
  the level card gets a gold star. No text, no numbers.
* Level cards are thumbnails of the board (same drawing code, `thumb: true`, plus a blue dot for the
  start), in difficulty order; the current one is outlined; done ones carry one to three gold stars
  (best grade). Nothing is locked.
* Progress and the per-board program are per child (`pk('challenge.done')`, `pk('challenge.index')`,
  `pk('program.challenge.<id>')`); the free-play program is stashed in `pk('program.free')` while a
  challenge is open and restored on the Build tab.

The parent guide's "Challenge pictures" section is generated from `BoardLegend` in challenge.js:
one entry per picture and per visible state (shut/open door, empty/filled box, plain/painted
tile), each a tiny `sample: true` grid drawn by `drawBoard` plus a grown-up sentence on what it is
and what to do. Every new symbol or state gets an entry there in the same change.

## 7. Browser check (after `npm test`)

Open the Challenge tab, pick the new card, confirm the board fits the window with squares equal to
the robot's step (drive forward 1 and watch it land in the next square), bump a wall (crash star,
robot settles back), complete it with each solution (celebration), then press the next-arrow on the
celebration and confirm the next card loads. Check the thumbnail reads at card size.

## 8. Keep in sync

New legend symbol or gate rule → §2/§3 here + `docs/10-challenge-mode.md` + the parser in
`challenge.js` + the thumbnail/board drawing. New challenge → catalogue + solutions fixture.
