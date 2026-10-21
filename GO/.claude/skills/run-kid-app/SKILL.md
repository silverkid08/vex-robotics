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
4. `read_console_messages` with pattern `rror` must be empty.

## Debugging
* Gear panel = grown-up log (every script line sent, connection events, errors).
* `localStorage['vexgo.program.autosave']` holds the current program JSON.
* Node tests print the sim's TX lines when a `log` listener is attached (see runner.test.mjs).
* Web Bluetooth errors: "User cancelled" (chooser closed), `NetworkError` (brain off/out of range), `NotSupportedError: GATT` (retry; VEX retries after 200–500 ms too).

## Deploying for a tablet
Web Bluetooth needs HTTPS off-localhost. Copy `app/` to any static HTTPS host (GitHub Pages works) or run a local HTTPS server with a self-signed cert.
