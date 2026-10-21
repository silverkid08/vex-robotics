---
name: vex-go-ble-protocol
description: Reference for talking to a VEX GO Brain over Web Bluetooth — service/characteristic UUIDs, the 5-byte command packet, script-line commands (DRIVE_FOR, TURN_FOR, SET_SWITCH_LED, MAG_BOOST…), status notifications and completion detection. Use whenever editing app/js/encoder.js, ble.js, robot.js or sim.js, or when adding a robot capability.
---

# VEX GO BLE protocol — working reference

Full detail: `docs/02-bluetooth-protocol.md`. This card is the 90 % you need while coding.

## Never hand-pack bytes
Always express a robot action as a **script line** and let `scriptLineToCommand()` (app/js/encoder.js) encode it. The encoder is byte-exact with VEX's (112 golden vectors in `tests/fixtures/vex-command-golden.json`; `npm test`).

```js
await ble.sendCommand('DRIVE_FOR 450 25');   // 200 mm forward at 25 %
```
Wire bytes: `20 | uint32 LE` on characteristic `6faa5920-9200-49a0-a353-6152c5930ec5` (Programmer service `6faa5911-…`). Scan filter: `services: [0x0677]`.

## Script lines you will actually use (ports are 0-based; Code Base: bumper=1, magnet=2, drivetrain=virtual port 4)
| Action | Line | Notes |
|---|---|---|
| drive distance | `DRIVE_FOR <wheelDeg> <vel%>` | mm × 360/160 → degrees; negative = reverse; waits on port 4 |
| drive forever / stop | `DRIVE <±vel%>` / `DRIVE_STOP <1 brake,2 coast,3 hold>` | |
| turn relative / absolute | `TURN_FOR <±deg> <vel%>` / `TURN_TO <rot> <vel%>` | + = clockwise; waits on port 4 |
| drive until | `DRIVE_UNTIL <1 crash|2 object> <±vel%>` | |
| defaults | `SET_VELOCITY <%>` `SET_TURNRATE <%>` `SET_TIMEOUT <ms>` `SET_HEADING <deg>` `CAL_GYRO` | VEXcode sends 25 for "50 %" |
| LED bumper | `SET_SWITCH_LED <port> <±power>` | + green, − red, 0 off |
| magnet | `MAG_BOOST <port> <ms>` / `MAG_DROP <port> <ms>` | VEXcode uses 1100 ms |
| motor | `SPIN <port> <±vel>` `SPIN_FOR <port> <deg>` `STOP_MOTOR <port> <mode>` `SET_MOTOR_VEL/POS/BRAKE/TIMEOUT` `SET_I_LIMIT` | motor vel = user% ÷ 3 |
| eye | `SET_SENSOR_LED <0-100>` `SET_SENSOR_PROX <0 near … 4 far>` | |
| end | `END` | stops all motors |

## Program-level packets (first byte)
`01` stop engine · `20` execute single (×≤4 per write) · `21 port` clear port events · `50 preset` (1 Code Base, 2 Arm, 3 Control) · `51 port devType flags iLimitMax16 iLimitPct accel defVel` · `70 s` locate · `A0 btn pressed cmd32` button binding · `A1 lx ly rx ry b1 b2` sticks (127 centre, Y 0 = up) · `A3 stickType driveSens turnSens`.

## Sequences
* **Prepare (before a program):** `01`, `50 01`, `SET_VELOCITY 25`, `SET_TURNRATE 25`, `SET_HEADING 0`, `SET_TIMEOUT 0`, `SET_SENSOR_PROX 0`, `SET_SENSOR_LED 100` → `GoRobot.prepare()`.
* **Stop:** `01`, `DRIVE_STOP 2`, `END` → `GoRobot.stopAll()`.
* **Drive tab:** `01`, `50 03`, `51 01 80 01`, `51 02 10 01`, eight `A0` bindings, `A3 01 32 19`, then `A1` every 100 ms → `GoRobot.startRemoteControl()`.

## Completion ("and wait")
Watch `ports` notifications for the port: done when `activeCommand` returns to `0xFF` after having been active, or after 7 updates if never seen active. Implemented in `GoRobot.send(script, waitPort)`; new command on the same port cancels the old wait. Status arrives ~10 Hz.

## Notifications
* `sensor` (6faa5924): accX/Y/Z i16 (÷8192 g), gyro i16×3, pitch/roll/yaw i8×1.41, hue u8×1.41, brightness u8, proximity u8 (object ≥ 50).
* `ports` (6faa5925): records `hdr activeCmd len payload` with hdr = devType|port; drivetrain record carries battery %, preset, flags (bit1 crash), velocity (×2 %), heading i16.
* `ack` (6faa5920): `AA status cmd data`.
* Hue → colour: ≥340 or <20 red, 75–154 green, 160–254 blue, else none.

## Adding a capability
1. Pick the script line above (or in docs/02 §4). 2. Add a `GoRobot` method that builds it (clamp/convert units there). 3. Teach `SimBrain._execute` the same line so offline play and tests work. 4. Add a golden/parse test if it is a new opcode. 5. Document in docs/02 or docs/03.
