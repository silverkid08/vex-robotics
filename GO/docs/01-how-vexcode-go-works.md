# 01 — How VEXcode GO works

## The one-paragraph version

VEXcode GO is a single-page web app (React + Google Blockly + a 51 MB webpack bundle). When you press **Start**, the blocks are turned into **Python**, the Python is executed by **Pyodide** (CPython compiled to WebAssembly) inside a **Web Worker in your browser**, and every robot action in that Python turns into a tiny **5-byte Bluetooth Low Energy write** to the GO Brain. The brain executes primitive motions (drive 200 mm, turn 90°, set LED) and streams sensor data back as BLE notifications. **Nothing is compiled, flashed or stored on the brain.** The brain is a tethered peripheral; the "program" lives in the browser tab and dies when you close it.

This is different from VEX IQ / V5 / EXP, where VEXcode compiles C++ (cloud compiler) or packages Python and *downloads* the binary into a program slot on the brain. The GO code paths for those (`compiler.*`, `cppCloudCompiler.*`, `downloadProgram`) exist in the bundle but are never used for GO.

## Layers

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Browser tab (codego.vex.com)                                              │
│                                                                           │
│  Blockly workspace ──Blockly.Python.workspaceToCode──▶ Python source      │
│        │                                                     │            │
│        │ (block highlight ids)                               ▼            │
│        │                               PyodideVMWebWorker (Web Worker)    │
│        │                               ┌────────────────────────────────┐ │
│        │                               │ Pyodide 0.17 (CPython 3.8)     │ │
│        │                               │  `go` package (devices.py ...) │ │
│        │                               │  vexcode_api.goInterface.*  ───┼─┼─▶ postMessage
│        │                               └────────────────────────────────┘ │
│        ▼                                                     │            │
│  VEXGOController (main thread)  ◀────── PyodideVMController ◀┘            │
│   - command queue, "wait for done" via port status                        │
│   - script lines: "DRIVE_FOR 450 25", "SET_SWITCH_LED 1 100", ...         │
│        │                                                                  │
│        ▼                                                                  │
│  @vexcode/vex-ble-device-manager  (GOWebBLE / VEXBLEDeviceManager)        │
│   - scriptLineToCommand() → uint32  → [0x20, b0, b1, b2, b3]              │
│   - navigator.bluetooth / GATT writes + notifications                     │
└───────────────────────────────────────────────────────────────────────────┘
                                   │  BLE 4.1  (~30 ft)
                                   ▼
                      ┌──────────────────────────┐
                      │ VEX GO Brain (firmware)   │
                      │  "Programmer" service     │
                      │  executes one command at  │
                      │  a time per port, streams │
                      │  sensor + port status      │
                      └──────────────────────────┘
```

### 1. Blocks → Python

* Block definitions live in the bundle chunk `src_Blockly_Extensions_GOBlocks_ts` and VEX's fork of Blockly (`lib/@vexcode/blockly/*`). All GO block types are prefixed `go_` (107 of them, list in [03](03-block-reference.md)).
* `codeGen.genGOCode(highlightBlocks, "python")` produces the file you see in the `<>` code view:

```python
#region VEXcode Generated Robot Configuration
import math
import random
from go import *

# Timer initialization
timer = Timer()
# Console initialization
console = Console()
# Inertial initialization
inertial = Inertial()

drivetrain = Drivetrain("Drivetrain", 0, 3, 1)   # left port 1, right port 4 (0-based), gear 1
bumper = LEDBumper("LEDBumper", 1)              # port 2
magnet = Magnet("Magnet", 2)                    # port 3
eye = Eye()
#endregion VEXcode Generated Robot Configuration
myVariable = 0

def when_started1():
    highlight_block('.NsXwU_L.OuU1l7Sho$F')
    global myVariable
    drivetrain.drive_for(FORWARD, 200, MM)
    unhighlight_block('.NsXwU_L.OuU1l7Sho$F')

start_thread(when_started1)
```

* When run from the Blocks tab, `Blockly.Python.STATEMENT_PREFIX = "highlight_block(%1)\n"` wraps every statement so the running block glows. The Python tab (text mode) skips that.
* The constructor lines come from the **robot configuration** (`rconfig` in the saved project). The *Code Base* preset is `Drivetrain(ports 1+4)`, `LEDBumper(port 2)`, `Magnet(port 3)`, `Eye()`. The *Robot Arm* preset uses ports 1, 3, 4. Custom configs list each device with its port.

### 2. Python → messages (Pyodide worker)

The `go` package (`/lib/pyodide-0.17.0/go.data`, source in [04](04-python-api.md)) is a thin layer: every method validates arguments, applies unit/scale conversion and calls a JavaScript bridge object `vexcode_api.goInterface` (class `PyodideGOInterface`). The bridge posts a message to the main thread:

```json
{ "command": "GODrivetrain", "instruction": "drive_for", "uuid": "…",
  "param": { "distance": 450, "velocity": 25, "wait": true } }
```

and returns a Promise that resolves when the main thread answers `CommandResult {uuid, completed}`. Sensor reads do not go over the bridge: the main thread pushes a `StatusUpdate` snapshot into the worker ~10×/s and `get_status()` just returns the last one.

### 3. Messages → script lines (VEXGOController)

The main-thread controller maps each instruction to a **script line**, a tiny text command language (`GoCommands` enum):

| Python | script line |
|---|---|
| `drivetrain.drive_for(FORWARD, 200, MM)` | `DRIVE_FOR 450 25`  (200 mm × 360/160 = 450 wheel-degrees, velocity 25 = 50 % × 0.5) |
| `drivetrain.turn_for(RIGHT, 90)` | `TURN_FOR 90 25` |
| `bumper.set_color(RED)` | `SET_SWITCH_LED 1 -100` |
| `magnet.energize(BOOST)` | `MAG_BOOST 2 1100` |
| `eye.set_range(FAR)` | `SET_SENSOR_PROX 2` |

The controller keeps a FIFO queue, de-duplicates repeated "single send" commands (`DRIVE`, `TURN`, `SPIN`, `SET_SWITCH_LED`), and for `wait=True` commands watches the **port status** notifications: a command is finished when the port's `activeCommand` byte returns to `0xFF` after it was seen active (or within 7 status updates if it finished before being observed).

### 4. Script lines → bytes (vex-ble-device-manager)

`scriptLineToCommand("DRIVE_FOR 450 25")` packs the opcode and arguments into a **uint32** (`0x19 01C2 02` → bytes `02 C2 01 19`), and the device manager writes `[0x20, 02, C2, 01, 19]` to the *ProgramCommand* characteristic. `0x20` = `PROG_CMD_EXE_SINGLE` ("execute this one command now"). Full table in [02](02-bluetooth-protocol.md).

### 5. Brain → browser

The brain notifies on three characteristics (~every 100 ms):

* **ProgramSensorStatus** — accelerometer, gyro, pitch/roll/yaw, eye hue/brightness/proximity.
* **ProgramPortCmdStatus** — per port: device type, active command, velocity/position, bumper pressed, magnet PWM, battery %, drivetrain heading, crash flag.
* **ProgramCommand** — acknowledgements (`0xAA status cmd data`).

The controller folds these into `vex123GoSensors`, which feeds the Monitor panel, the Drive tab and the worker's `StatusUpdate`.

## So, is a compiler necessary?

No. For VEX GO:

* No C++ toolchain, no cloud compile, no firmware image for your program.
* The only "compile" step is Blockly's code generator (JavaScript running in the page) and CPython's bytecode compiler inside Pyodide, both instantaneous.
* The brain firmware must be up to date (VEXcode checks `https://content.vexrobotics.com/vexos/public/Go/catalog.txt` and offers an over-the-air update via the OAD service). Our app does **not** update firmware; use codego.vex.com for that once.

Consequences for this project:

* Any web page in Chrome/Edge (Web Bluetooth) can control a GO brain with the same commands. That is what `app/js/ble.js` + `app/js/encoder.js` do.
* The browser must stay connected while a program runs; closing the tab stops the robot (the firmware times out the last command).
* Latency per command is one BLE write (~30–50 ms) plus the ack; a sequence of ten pieces feels instantaneous to a child.

## Where things are in the codego.vex.com bundle (for future re-analysis)

| Piece | Location |
|---|---|
| Main bundle | `https://codego.vex.com/dist/main.bundle.js?v=4.67.0-4` (51 MB, unminified) |
| Chunk map | search `__webpack_require__.u = (chunkId)` in the main bundle → `{chunkName: hash}`; URL is `dist/<hash>.<chunkName>.bundle.js` |
| BLE protocol | chunk `vendors-node_modules_vexcode_vex-ble-device-manager_dist_lib_src_index_js-…` (modules `ProgramUtil.js`, `VEXBLEDeviceManager.js`, `types/*.js`) |
| GO hardware interface | chunks `src_HardwareInterface_GO123_GO123WebBLE_ts`, `…_GOWebBLE_ts`, `…_GO123Interface_ts` |
| GO controller (script lines, queue, remote control) | main bundle module `./src/HardwareInterface/controllers/VEXGOController.ts` |
| Sensor model | main bundle module `./src/HardwareInterface/controllers/VEX123GOSensors.ts` |
| Python VM | `dist/PyodideVMWebWorker.bundle.js` (contains `PyodideGOInterface`), Python package `lib/pyodide-0.17.0/go.data` (LZ4-packed; read it by loading Pyodide in the page) |
| Blocks | chunk `src_Blockly_Extensions_GOBlocks_ts`, `lib/@vexcode/blockly/python_compressed.js` |
| Python API docs DB | chunk `src_texteditor_db_apidb_go_python_json` |
| Sample projects (with robot configs) | chunk `static_sample_files_sampleFilesDataGO_json` |

The `.claude/skills/refresh-vexcode-analysis` skill has the exact commands.
