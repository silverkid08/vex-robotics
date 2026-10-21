# 06 — Starting, stopping and debugging programs

## In VEXcode GO (codego.vex.com)

| Control | What happens |
|---|---|
| **BRAIN** button | Opens the Web Bluetooth chooser filtered to service 0x0677; connects; checks firmware against `content.vexrobotics.com/vexos/public/Go/catalog.txt` and offers an update (OAD) if older; then sends the robot configuration. Devices are auto-detected from the port status once connected. |
| **START** | `runGOCode()` → generate Python (with highlight calls) → `VMControls.setVMCode` → worker `StartInterpreter`. Before the first command `prepareGOForProject` resets velocity/turn rate/heading/timeout and eye settings. |
| **STEP** | Runs one statement at a time (Pyodide VM step mode; `highlight_block` ids drive the yellow glow). |
| **STOP** | Aborts the VM, then `goController.stopGo()`: `01` stop engine, clear queue, `DRIVE_STOP 2`/`STOP_MOTOR`, `END`. |
| Block highlighting | `Blockly.Python.STATEMENT_PREFIX = "highlight_block(%1)"` so every statement reports its block id to the main thread. |
| Monitor panel (gauge icon) | Sensors list, Variables list (via `monitor_sensor()/monitor_variable()`), Console output (`console.print`). |
| Errors bar (bottom-left) | Python syntax/runtime errors from the worker (`PythonError` messages, processed by `GOPythonErrorProcessor`). Orphan blocks or an empty program produce "Only orphan blocks in program" / "Error_No_Program". |
| `<>` code view | Shows the generated Python (read-only in Blocks mode). |

Nothing is compiled; a "download" never happens for GO. If the brain disconnects mid-run the VM stops and the firmware times out the active command.

### Connection troubleshooting (from VEX's KB + observed behaviour)

* Chrome or Edge ≥ 100 on Windows 10+, macOS, ChromeOS or Android; **not** Firefox/Safari (no Web Bluetooth). iOS uses the native VEXcode GO app.
* Page must be `https://` or `http://localhost`.
* Brain within ~30 ft, powered on, not connected to another app/tablet, and not in update mode (model string contains `Bootload`).
* If the chooser shows nothing: toggle Bluetooth, power-cycle the brain, make sure Windows Bluetooth is 4.1+ (BLE). In Chrome, `chrome://bluetooth-internals` lists adapters/devices.
* Writes can fail with GATT errors on some Chromebooks; VEX retries after 200–500 ms.
* "Controller Config Timeout" alert = the brain did not ack the 10+ configuration writes within 20 s (usually a stale connection; reconnect).

## In the puzzle app

| Control | What happens |
|---|---|
| Bluetooth button (top right) | Real-robot mode: chooser → connect → `GoRobot.prepare()` (stop, preset 1, defaults). Face turns happy when connected. |
| Toy button (grown-up panel) | Switch between the pretend robot (simulator) and the real brain. |
| ▶ Play | `Runner.run(program)`: prepare, then each piece in order; the active piece wiggles and glows; a blip sounds per piece. |
| ■ Stop | Aborts the runner (`AbortController`), cancels waits, sends stop/coast/END. |
| Gear | Grown-up panel: mode switch, clear program, **log** of every script line sent (`TX DRIVE_FOR 338 25` …) and connection events. |
| Stickers ⭐ ❤️ 🚀 | tap = load, hold 0.8 s = save (localStorage). The current program autosaves. |

### Debugging tips

* Open the grown-up panel: every command string and ack problem is logged with a timestamp.
* In Chrome DevTools, `localStorage['vexgo.program.autosave']` is the current program as JSON.
* `npm test` runs the encoder against VEX's golden vectors and exercises the runner on the simulator.
* To watch raw BLE traffic, use `chrome://bluetooth-internals` or add `ble.addEventListener('ack', …)` in the console (`window` has no globals by design; import the modules in DevTools with `await import('/js/ble.js')`).
* If the robot ignores commands after switching tabs or apps, press Stop (re-sends `01` + config) or reconnect.
* A piece that never finishes (e.g. wait-for-bump) is interruptible with Stop; motion waits time out after 20 s.
