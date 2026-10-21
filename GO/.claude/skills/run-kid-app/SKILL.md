---
name: run-kid-app
description: How to run, test and verify the VEX GO kid coder app (local server, simulator mode, Chrome Web Bluetooth requirements, test suite, browser smoke test with Claude in Chrome). Use when asked to run/start/try/screenshot the app or confirm a change works.
---

# Run and verify the kid app

## Commands
```
npm start      # node tools/serve.mjs → http://localhost:8080 (run in background)
npm test       # node --test "tests/**/*.test.mjs"  (≈4 s; simulator tests use sim.speed = 8)
```
No install step; no bundler. If port 8080 is busy: `PORT=8090 node tools/serve.mjs`.

## Modes
* **Pretend robot (default):** `SimBrain` auto-connects; a toy-robot column on the right of the build tab shows the predicted route (dashed) and the live trail, with bigger/smaller window buttons, turtle/rabbit speed buttons (`sim.speed`), and buttons to press the bumper / show colours to the eye. Everything works offline. `predictPath()` (simview.js) is unit-tested in `tests/simview.test.mjs`.
* **Real brain:** tap the Bluetooth button (or the toy/robot button in the gear panel). Requires Chrome/Edge ≥ 100, `http://localhost` or `https://`, brain on and not connected elsewhere. Mode is remembered in `localStorage['vexgo.mode']`.

## Smoke test with Claude in Chrome (what to click)
1. `tabs_context_mcp` → `navigate` to `http://localhost:8080/`, screenshot.
2. Build tab: tap a palette piece (appends), tap it in the strip (cycles dots), drag a piece to the trash, press the ⇄ button (TTB/LTR), press ▶ and wait 4 s — the toy robot should move and the active piece wiggle. Check the gear panel log for `TX …` lines.
3. Drive tab (steering-wheel tab): sensor pictures visible; arrow pad present. Holding arrows needs a real pointer hold; the log shows nothing for the simulator's `A1` packets (they are not logged) — use `sim.world` in DevTools if needed:
   `const m = await import('/js/app.js')` is not exposed; instead test driving through `npm test` (`robot.sendRemoteControl` is covered by runner tests).
4. Challenge tab (trophy): the level cards appear, the board fills the pretend-robot window with brick walls; tap a card, tap "forward" in the palette, press ▶: the robot moves one square per step; a win shows the star card and the next arrow. Challenge boards always use the pretend robot at 2×. Seeding a program for a board from DevTools: `localStorage['vexgo.<profile>.program.challenge.c12'] = JSON.stringify({order:'ltr', pieces:[{uid:'a', id:'forward', param:1}]})` then tap the card again.
5. Profiles: the animal button opens the picker; plus → avatar grid; switching child empties/refills the strip and the card stars.
6. `read_console_messages` with pattern `rror` must be empty.

## Debugging
* Gear panel = grown-up log (every script line sent, connection events, errors).
* `localStorage['vexgo.<profileId>.program.autosave']` holds the current child's program JSON (`vexgo.profile` is the current id; `…program.challenge.<id>` per board; `…challenge.done` the stars).
* Node tests print the sim's TX lines when a `log` listener is attached (see runner.test.mjs).
* Web Bluetooth errors: "User cancelled" (chooser closed), `NetworkError` (brain off/out of range), `NotSupportedError: GATT` (retry; VEX retries after 200–500 ms too).

## Deploying for a tablet
Web Bluetooth needs HTTPS off-localhost. Copy `app/` to any static HTTPS host (GitHub Pages works) or run a local HTTPS server with a self-signed cert.
