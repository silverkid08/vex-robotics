# VEX GO Kid Coder — Documentation

This folder documents (1) how VEXcode GO (https://codego.vex.com) really works under the hood, and (2) the picture-only puzzle app in `../app` that lets a pre-reader program and drive a VEX GO robot.

Everything in the "how VEXcode GO works" documents was derived from the publicly served JavaScript of codego.vex.com v4.67.0-4 (October 2026) and verified where possible by executing VEX's own code in Node (see `tests/fixtures/vex-command-golden.json`).

| # | Document | What it answers |
|---|----------|-----------------|
| 01 | [How VEXcode GO works](01-how-vexcode-go-works.md) | Architecture: blocks → Python → in-browser interpreter → Bluetooth. Why there is **no compiler** and nothing is downloaded to the brain. |
| 02 | [Bluetooth protocol](02-bluetooth-protocol.md) | GATT services/characteristics, how to connect, every command opcode and its byte layout, sensor/port status packets, robot configuration, controller (Drive) mode, firmware update. |
| 03 | [Block reference](03-block-reference.md) | Every VEXcode GO block → generated Python → robot command bytes. |
| 04 | [Python API](04-python-api.md) | The `go` Python module VEXcode ships (classes, methods, units, defaults, scaling quirks). |
| 05 | [Drive tab and sensors](05-drive-tab-and-sensors.md) | What VEXcode's Drive tab shows and sends; how every sensor value is derived (hue→colour thresholds, object detection, battery, crash...). |
| 06 | [Running and debugging](06-running-and-debugging.md) | Start/Step/Stop, block highlighting, the Monitor and Console, errors, connection troubleshooting. |
| 07 | [Kid GUI design](07-kid-gui-design.md) | Design rules and piece catalogue of the picture-only puzzle app, reading-direction toggle, feedback, roadmap. |
| 08 | [Xbox controller](08-xbox-controller.md) | Gamepad API mapping used by the app. |
| 09 | [Developer setup](09-dev-setup.md) | Running the app, tests, simulator, browser requirements, project layout, adding pieces. |

Quick start for grown-ups:

```
npm start            # serves ./app at http://localhost:8080
npm test             # unit tests (encoder golden vectors, parsers, simulator runs)
```

Open http://localhost:8080 in Chrome or Edge, tap the Bluetooth button, pick the GO brain, and press play.
