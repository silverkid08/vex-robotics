# 10 — Challenge mode and child profiles

Challenge mode (the trophy tab) is a game played on the pretend robot: the child builds a program
with the same pieces as the Build tab, but the robot starts on a small board and wins by collecting
everything on it. It is simulator-only; the real brain is never used (the Bluetooth button is
refused while a challenge is open). Profiles let several children keep their own programs,
stickers and challenge stars on the same tablet.

## Files

| File | Role |
|---|---|
| `app/js/challenges.js` | The catalogue: 23 boards as text grids, in difficulty order, each with a `par` (pieces in the most efficient known solution) and a grown-up `hint`. `countPieces()` and `gradeSolution()`. |
| `app/js/challenge.js` | `parseBoard()`, the `Arena` (walls, gates, pickups, objectives, eye readings, bump handling) and `drawBoard()` for the sim window and the level cards. |
| `app/js/sim.js` | `setArena()`; while an arena is set, moves go through `arena.move()` (walls stop the robot), magnet commands reach `arena.command()`, every tick calls `arena.tick()`, and `prepare()` (via `setConfigPreset`) starts the board fresh. A heading reset no longer turns the robot on a board. |
| `app/js/simview.js` | `setArena()`: frames the board, hides the speed and eye-colour buttons, runs the pretend robot at 2× and draws the carried puck. |
| `app/js/app.js` | Challenge tab, level cards, celebration overlay with the star grade, per-challenge program autosave, profiles. |
| `tests/challenges.test.mjs` + `tests/fixtures/challenge-solutions.mjs` | Every challenge is solved by every listed solution; the first solution has exactly `par` pieces; the robot never leaves a board; bumps, timed gates and the closing door behave. |

## The board

One square = one robot step (150 mm), so "forward 1" lands exactly one square on and a 90° turn
keeps the robot on the grid. Boards are 3–9 columns by 3–7 rows, drawn with the grid origin at
world (0, 0). Legend of the text grid:

| Char | Picture | Rule |
|---|---|---|
| `#` | brown brick | wall; anything outside the grid is wall too |
| `.` | pale square | floor |
| `S` | faint arrow | start square; the arrow shows the start direction (`dir`: N E S W, default N) |
| `*` | big yellow star | objective: reached when the robot's centre enters the square |
| `o` | gold coin | objective: collected by driving over it |
| `R` `G` `B` | coloured outline with grey middle | objective: painted when the robot stands on it while its bumper light is that colour (`B` has no light piece today, so only `R` and `G` are used) |
| `r` `g` `b` | coloured disc | puck: magnet grab picks up the puck straight ahead (or under the robot); it rides in front; magnet let go drops it straight ahead |
| `1` `2` `3` | coloured open square | objective: done when a red / green / blue puck lies in it |
| `=` | striped barrier with a lamp | gate: wall while shut (red lamp), floor when open (green lamp) |

Gate rules (one per board): `{ after: s }` opens after a timer, `{ when: 'bump' }` opens when the
bumper is pressed (toy button or a wall knock), `{ when: 'coins' }` opens when all coins are
collected, `{ closeAfter: s }` starts open and shuts; a robot in the doorway is pushed back.
Gate clocks run only while a program runs and count real seconds, like the wait piece, which is why
the pretend robot's speed is fixed (2×) in Challenge mode.

## Physics

* The robot is a 104 mm disc. Driving into a wall or a shut gate stops it: the move is cancelled
  (the program continues with the next piece), the bumper reads pressed and the crash star shows for
  0.6 s, and the robot settles back onto the centre of its square. Pucks, coins and tiles never stop
  it (the bumper sits above them).
* The eye looks one square ahead: puck → its colour, gate → red/green, wall → "something", floor →
  nothing. The sim's eye-colour buttons are hidden in Challenge mode; the bumper button stays.
* The win is checked every tick; the program is stopped on the win and the celebration shows.
  There is no losing: a program that does not win just ends (a soft buzz) and the child tries again.

## Grade

`par` is the piece count of the best known solution (a repeat counts one plus its children). A win
earns three stars at par or better, two stars within two pieces of par, otherwise one. The level
card keeps the best grade per child.

## Profiles

The animal button in the top bar is the current child. The picker shows every profile and a plus
button that opens an avatar grid (rabbit, turtle, cat, frog, rocket, star, heart, robot). Each
profile owns these keys: `vexgo.<id>.program.autosave|free|star|heart|rocket`,
`vexgo.<id>.program.challenge.<challengeId>`, `vexgo.<id>.order`, `vexgo.<id>.challenge.index`,
`vexgo.<id>.challenge.done` (`{ c01: 3, … }`). `vexgo.profiles` lists the profiles and
`vexgo.profile` is the current one; on first run the existing un-namespaced programs become profile
`p1`. The grown-up panel removes the current profile (two taps) when there is more than one.
Helper words, palette settings, zoom and the robot mode stay shared.

## Adding a challenge

Follow `.claude/skills/challenge-design`: add the grid to the catalogue with a `par` and a `hint`,
add at least one solution to the fixture (two for every third challenge), run `npm test`, then check
the card and the board in Chrome.
