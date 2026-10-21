# VEX GO Kid Coder

A picture-only, jigsaw-piece coding and driving app for VEX GO robots, built so a four-year-old who cannot read can program a real robot on their own.

## Why

VEX GO robots are great hardware for small children, but VEXcode GO (https://codego.vex.com) is a Scratch-style editor full of words ("drive forward for 200 mm", "set bumper to red"). A pre-reader cannot use it without an adult reading every block. This project replaces the editor with pictures: an up-arrow means forward, an arched arrow means turn, a glowing bumper means "light red", an hourglass means wait. Dots stand in for numbers. The pieces are real jigsaw shapes so the child can see which order they go in.

Along the way we reverse-engineered how VEXcode GO actually talks to the brain and discovered that nothing is ever compiled or downloaded: VEXcode runs the program in the browser and streams small Bluetooth commands to the brain. That is what makes a custom app possible, and it is fully documented in `docs/`.

## What it does

**Build tab**
- Palette of picture pieces: forward/backward (1–5 steps of 15 cm), turns (45/90/135/180°, turn around, spin), bumper light red/green/off, magnet grab/let go, wait (1–5 s), wait for a bump, wait to see red/green/blue, wait to see something, repeat (1–10 or forever).
- Pieces interlock with knobs and holes, left-to-right or top-to-bottom (one tap to flip), with a dotted snake arrow showing where a row wraps.
- Tap a piece to change its dots or arc; hold it for − / + buttons. Drag onto empty space or the trash to throw it away.
- The repeat is one big green piece that holds other pieces; repeats cannot be nested.
- Zoom buttons, three sticker slots to save programs (tap = load, hold = save), autosave.
- Play runs the program with the active piece wiggling; Stop always stops the robot.

**Drive tab**
- Big arrow pad to drive, red/green light buttons, magnet grab/drop.
- Live sensor pictures: battery fill, bumper squashes and glows, eye takes the colour it sees, compass heading, speed lines, crash flash.
- Xbox (or any standard) controller via the browser Gamepad API.

**Pretend robot**
- Without a brain the app runs on a simulator: a top-down robot that follows the predicted route (dashed) and leaves a trail, with turtle/rabbit speed buttons, bigger/smaller window buttons, and buttons to press the pretend bumper or show the pretend eye a colour.

**For grown-ups**
- Helper words toggle (captions under every piece and button), a parent guide (book button) explaining each picture, palette size/layout/sort options, and a log of every command sent to the robot (gear button).

## How to use it

Requirements: Node 20+ for the tiny local server, and Chrome or Edge (Web Bluetooth). A VEX GO Brain with current firmware (update it once through codego.vex.com if it is old).

```
npm start        # serves ./app at http://localhost:8080
npm test         # runs the unit tests
```

1. Open http://localhost:8080 in Chrome. The app starts in pretend-robot mode so you can try everything immediately.
2. To use the real robot: turn on the GO Brain, tap the round Bluetooth button (top right), pick the brain from Chrome's list. The robot face smiles when connected. The Code Base build (drivetrain on ports 1 and 4, LED bumper on 2, electromagnet on 3) is assumed.
3. Build: tap or drag pieces into the row after the green flag, press ▶.
4. Drive: steering-wheel tab, hold the arrows, or plug in a controller.
5. First time with your child: open the parent guide (book button) and switch on helper words in the gear panel until they know the pictures.

For a tablet on the same network you need HTTPS (Web Bluetooth refuses plain HTTP except localhost); copy the `app/` folder to any static HTTPS host or run a local HTTPS server with a self-signed certificate.

## Documentation

`docs/README.md` is the index. Highlights:

- `01-how-vexcode-go-works.md` – blocks → Python → Pyodide in the browser → 5-byte Bluetooth commands; why there is no compiler.
- `02-bluetooth-protocol.md` – every GATT UUID, opcode, byte layout, status packet and the connection/configuration sequences.
- `03-block-reference.md` – every VEXcode GO block with its Python and its robot command, plus the puzzle-piece equivalents.
- `04-python-api.md` – the `go` Python module VEXcode ships.
- `05-drive-tab-and-sensors.md` – how every sensor value is derived (hue thresholds, object detection, battery…).
- `06-running-and-debugging.md` – start/stop/step, logs, connection troubleshooting.
- `07-kid-gui-design.md` – the design rules and piece catalogue of this app.
- `08-xbox-controller.md`, `09-dev-setup.md`.

## Project layout

```
app/          the web app (no build step): index.html, css/, js/
  js/encoder.js   script line → VEX GO command bytes (byte-exact with VEX's encoder)
  js/ble.js       Web Bluetooth transport and notification parsers
  js/sim.js       pretend brain with the same interface
  js/robot.js     high-level robot API, command completion, prepare/stop, remote control
  js/pieces.js    puzzle piece catalogue
  js/editor.js    drag-and-drop puzzle editor
  js/runner.js    program execution
  js/drive.js     Drive tab
  js/simview.js   pretend-robot picture and route prediction
  js/icons.js     every picture (inline SVG)
docs/         documentation
tests/        node --test suites and VEX golden vectors
tools/        static server
.claude/      skills and guidance for Claude Code (see CLAUDE.md)
```

## Status

Working: everything above on the simulator, verified in Chrome. The real-robot path uses exactly the commands and packet layouts extracted from VEXcode GO and verified against VEX's own encoder, but it has not yet been exercised against a physical GO Brain in this project. The grown-up log shows every command sent if something misbehaves.

Ideas for later: "if I see red then…" pieces, "when bumper pressed" event strips, speed piece, Robot Arm preset pieces, printable picture cards, recording a drive into pieces.
