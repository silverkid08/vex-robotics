# 02 — VEX GO Brain Bluetooth protocol

Everything below was extracted from `@vexcode/vex-ble-device-manager` (the library codego.vex.com uses) and cross-checked by running its encoder in Node. The app's `app/js/encoder.js` and `app/js/ble.js` implement exactly this. Byte values are hex unless noted; multi-byte integers are **little-endian**.

## 1. Discovery and connection

| Step | Detail |
|---|---|
| Radio | BLE 4.1+. Chrome/Edge 100+ with Web Bluetooth. Range ≈ 30 ft. |
| Scan filter | `navigator.bluetooth.requestDevice({ filters: [{ services: [0x0677] }], optionalServices: [Programmer, OAD, Reset, DeviceInfo, Sensor] })`. GO brains advertise the 16-bit UUID **0x0677** (VEX 123 = 0x0675, Coder = 0x0676, AIM = 0x0670, IQ2 = 0x0620, EXP = 0x0660). |
| Connect | `device.gatt.connect()` → `getPrimaryServices()` → cache all characteristics. VEX waits 1 s before and after connecting ("needed to reliably connect on some Chromebooks") and retries up to 5 times. |
| Subscribe | `startNotifications()` on *ProgramCommand*, *ProgramSensorStatus*, *ProgramPortCmdStatus*, *ProgramBotConfig* (and OAD characteristics for firmware updates). |
| Identify | Read Device Information characteristics (see §2). Model string contains `VEX Go`; if it contains `Bootload` the brain is in update mode and cannot run commands. |
| Ready | 200 ms later VEX reports *Connected* and immediately sends the robot configuration (§6). |
| Disconnect | `gattserverdisconnected` event; VEX auto-reconnects to the same device while the page is open. |

The brain must be **powered on and not already connected** to another device/app. Pairing/bonding is not required (no PIN; the lock-code flow exists only for IQ2/EXP/AIM).

## 2. GATT services and characteristics

### Programmer service `6faa5911-9200-49a0-a353-6152c5930ec5`

| Characteristic | UUID | Dir | Purpose |
|---|---|---|---|
| ProgramCommand | `6faa5920-…` | write + notify | All commands (§3–§7). Notifies **acks**. |
| ProgramStatus | `6faa5921-…` | notify | Legacy program state (unused by VEXcode GO). |
| ProgramBotStatus | `6faa5922-…` | notify | Legacy whole-robot status (unused). |
| ProgramBotConfig | `6faa5923-…` | read + notify | Current port configuration, 20 bytes (§6). |
| ProgramSensorStatus | `6faa5924-…` | notify | Brain IMU + eye sensor (§8.1). |
| ProgramPortCmdStatus | `6faa5925-…` | notify | Per-port status, battery, heading (§8.2). |

(all `…` = `9200-49a0-a353-6152c5930ec5`)

### Sensor service `6faa6911-…` (low level, not used by VEXcode GO)

`6faa6920` SensorStatusShort, `6faa6921` SensorGyroDetails, `6faa6922` SensorGyroCMD, `6faa6923` SensorRegWrite, `6faa6925` SensorPortDetails.

### Device Information service `0000180a-0000-1000-8000-00805f9b34fb`

| Char | UUID | Content |
|---|---|---|
| Model Number | `2a24` | e.g. `VEX Go Brain` (contains `Bootload` in update mode) |
| Serial Number | `2a25` | Robot **name** as shown in the VEXcode chooser |
| Firmware Revision | `2a26` | **Bootloader** version as ASCII `M.m.b.bB` (parsed as bytes 0,2,4,7 minus 0x30) |
| Software Revision | `2a28` | **App firmware** version, same format |
| System ID | `2a23` | Device id (bytes 0,1,2,5 used) |
| Hardware Rev | `2a27` | Also notifies when the name changes |
| Manufacturer | `2a29` | `VEX Robotics` |
| `6a50` | DevInfoLog | Debug log stream (optional) |

### OAD (firmware update) service `6faaffc0-…`

`6faaffc1` ImageID, `6faaffc2` ImageBlock, `6faaffc5` ImageCtrl. TI-style over-the-air download: write `01` to Ctrl → brain answers with block size → write image header to ImageID → brain requests blocks via Ctrl (`12 status addr32`) → write blocks to ImageBlock → write `04` to Ctrl to enable the image → status `04 00` = success. Firmware files come from `https://content.vexrobotics.com/vexos/public/Go/catalog.txt`. **Our app never does this; use codego.vex.com.**

### Reset service `0113de02-7a5e-11e8-adc0-fa7ae01bbebc`, characteristic `0113e104-…` (power off / reboot / bootload).

## 3. ProgramCommand packet format

The first byte selects a **program-level command** (`ProgramConst`). The important ones:

| Byte 0 | Name | Payload | Meaning |
|---|---|---|---|
| `01` | PROG_CMD_STOP | – | Stop the on-brain script engine; motors coast. VEXcode sends this before every run and before changing configuration. |
| `02` | PROG_CMD_STEP | – | Step one command of a stored script (unused by GO). |
| `03` | PROG_CMD_PLAY | – | Play stored script (unused by GO). |
| `04` | PROG_CMD_PAUSE | – | Pause. |
| `10`/`11`/`12` | ADD / REMOVE / REMOVE_ALL | cmd… | Stored-script editing (VEX 123/Coder; unused by GO). |
| `20` | **PROG_CMD_EXE_SINGLE** | 4 bytes = uint32 robot command | **Execute one robot command now.** This is how every block runs. Up to 4 can be concatenated in one write (`20 c c c c 20 c c c c …`). |
| `21` | PROG_CMD_CLEAR_PORT_EVENTS | port | Clear latched pressed/released/crash events for a port (4 = drivetrain). |
| `40` | PROG_CMD_SET_BOT_NAME | ASCII | Rename the brain. |
| `50` | PROG_CMD_SET_BOT_CONFIG_PRESET | preset | 1 = Code Base, 2 = Robot Arm, 3 = Control (joystick mode), 250 = auto, 255 = none. |
| `51` | PROG_CMD_SET_PORT_CONFIG | port, devType, flags, iLimitMax(u16), iLimitPct, accel, defaultVel | Configure one port (§6). |
| `70` | PROG_CMD_LOCATE | seconds | "Locate robot" – flashes the brain LED. |
| `90` | PROG_CMD_GET_CONN_INT | – | Request connection interval. |
| `A0` | PROG_CMD_SET_BUTTON_CMD | buttonId, pressed(0/1), uint32 command | Bind a robot command to a controller button edge (§7). |
| `A1` | PROG_CMD_SET_CONTROLL_VALUES | lx, ly, rx, ry, buttons1, buttons2 | Joystick values 0–255 (127 = centre) + 16 button bits (§7). |
| `A2` | PROG_CMD_SAVE_CONTROL_CONFIG_CMD | – | Persist button/stick config in the brain. |
| `A3` | PROG_CMD_SET_STICK_MODE_CMD | stickType, driveSens, turnSens | 1 Tank, 2 Left stick, 3 Right stick, 4 Split-left, 5 Split-right; sensitivities in % (VEX uses 50/25). |

### Acks (notifications on ProgramCommand)

`AA status cmd [data]` — `status` is typically `76`; `cmd` echoes byte 0 of the packet. For `20` (EXE_SINGLE) newer firmware echoes the full uint32 command (`data` = 4 bytes). VEXcode resolves each write when the matching ack arrives (1 s timeout, then it gives up and continues).

## 4. Robot command (uint32) encoding

A robot command is a uint32 `cmd | arg1 << 8 | arg2 << 16 | arg3 << 24` written little-endian, so **byte 1 is the opcode**. Arguments are sign-extended/truncated per the table (`i16` = signed 16-bit placed at bits 8–23 etc.). Ports are **0-based** (Port 1 on the brain = 0). The authoritative encoder is `app/js/encoder.js`; the golden file `tests/fixtures/vex-command-golden.json` has 112 encoded examples produced by VEX's own code.

### Drivetrain (preset ports 1 + 4 as a unit)

| Script line | Opcode | Payload layout | Notes |
|---|---|---|---|
| `DRIVE vel` | `01` CMD_FWD | i16 vel @8 | Drive forever. vel = **percent** (VEXcode sends ±(user% × 0.5)). |
| `DRIVE_FOR dist [vel]` | `02` CMD_FWD_FOR | i16 dist @8, u8 vel @24 | dist in **wheel degrees** (mm × 360/160). vel 0–100 % (0 = use SET_VELOCITY). Negative dist = reverse. |
| `DRIVE_UNTIL event [vel]` | `04` CMD_FWD_UNTIL | u8 event @8, i16 vel @16 | event: 1 crash, 2 object seen, 3–6 button on port 1–4. |
| `TURN vel` | `11` CMD_TURN | i16 vel @8 | Turn forever, + = clockwise/right. |
| `TURN_FOR deg [vel]` | `12` CMD_TURN_FOR | i16 deg @8, u8 vel @24 | Relative turn, + = right. |
| `TURN_TO deg [vel]` | `13` CMD_TURN_TO | i16 deg @8, u8 vel @24 | Absolute rotation target (VEXcode computes shortest path to a heading itself). |
| `TURN_UNTIL event [rate]` | `14` CMD_TURN_UNTIL | u8 event @8, i16 rate @16 | |
| `TURN_RANDOM [vel]` | `15` CMD_TURN_RAND | i16 vel @8 | Random −360…360°. |
| `DRIVE_STOP [mode]` | `1F` CMD_STOP_DRIVE | u8 mode @8 | mode: 1 brake, 2 coast, 3 hold. |
| `RESET_POS [pos]` | `21` CMD_RESET_POS | i16 @8 | Reported position. |
| `RESET_HEADING [deg]` / `SET_HEADING [deg]` | `22` CMD_RESET_HEADING / `31` CMD_SET_HEADING | i16 @8 | VEXcode's `setHeading` actually sends `RESET_HEADING`. |
| `CAL_GYRO` | `23` CMD_CAL_GYRO | – | Blocks ~2 s, heading → 0. |
| `SET_VELOCITY v` | `32` CMD_SET_VELOCITY | i16 @8 | Default drive velocity %. |
| `SET_TURNRATE v` | `33` CMD_SET_TURNRATE | i16 @8 | Default turn velocity %. |
| `SET_TIMEOUT ms` | `34` CMD_SET_TIMEOUT | u32 @8 (24 bits usable) | 0 = default. |
| `SET_STOPPING mode` | `35` CMD_SET_STOPPING | i16 @8 | Brake mode for drivetrain. |
| `SET_ACC n` | `36` | i8 @8 | Acceleration profile 1 (fast) – 4 (slow). |
| `SET_SENS pct` | `37` | i8 @8 | Joystick drive sensitivity. |

### Control flow (brain-side script engine; VEXcode GO doesn't use these but they are valid)

`WAIT ms`/`DELAY ms` = `61` (u24 ms @8) · `WAIT_UNTIL event` = `60` · `IF_PROX op val` = `62` (op −1/0/1 @8, u8 val @16) · `IF_COLOR c` = `63` · `IF_CRASH` = `64` · `IF_BUTTON port state` = `65` (state 1 pressed, −1 released, 0 either) · `IF_LIGHT` = `66` · `ELSE` = `6E` · `END_IF` = `6F` · `GOTO line` = `90` · `END` = `91` (stop all motors, program state Stop) · `PAUSE` = `92`.

### Port devices (`port` = 0–3)

| Script line | Opcode | Layout | Notes |
|---|---|---|---|
| `SPIN port vel` | `71` CMD_P_SPIN | u8 port @8, i16 vel @16 | Motor velocity (VEXcode sends user% ÷ 3). |
| `SPIN_FOR port deg` | `72` CMD_P_SPIN_FOR | u8 @8, i16 @16 | Relative degrees. |
| `SPIN_TO port pos` | `73` CMD_P_SPIN_TO | u8 @8, i16 @16 | Absolute position. |
| `SPIN_TO_A port angle` | `74` CMD_P_SPIN_TO_A | u8 @8, i16 @16 | 0–360 shortest. |
| `STOP_MOTOR port [mode]` | `79` CMD_P_STOP | u8 @8, u8 mode @16 | |
| `SET_MOTOR_POS port [pos]` | `7A` CMD_P_SET_POS | u8 @8, i32 @16 (16 bits usable) | |
| `SET_MOTOR_VEL port vel` | `7B` CMD_P_SET_VEL | u8 @8, i16 @16 | |
| `SET_I_LIMIT port pct` | `7C` CMD_P_SET_I_LIMIT | u8 @8, u16 @16 | Current (torque) limit %. VEXcode init uses 200. |
| `SET_MOTOR_BRAKE port mode` | `7D` CMD_P_SET_BRAKE | u8 @8, i16 @16 | 1 brake, 2 coast, 3 hold. |
| `SET_MOTOR_TIMEOUT port ms` | `7E` | u8 @8, u16 @16 | 0 = none (default 5000). |
| `SET_MOTOR_STALL_TIMEOUT port ms` | `7F` | u8 @8, u16 @16 | |
| `MAG_SET_POWER port pct` | `81` | u8 @8, u8 @16 | Power used by boost/drop. |
| `MAG_DROP port ms` | `82` CMD_P_DROP | u8 @8, u16 ms @16 | Reverse polarity pulse (release). VEXcode: 1100 ms (Drive tab: 1000). |
| `MAG_BOOST port ms` | `83` CMD_P_BOOST | u8 @8, u16 ms @16 | Energise pulse (grab). VEXcode: 1100 ms (Drive tab: 500). |
| `MAG_HOLD port power` | `84` CMD_P_HOLD | u8 @8, i8 @16 | Continuous, −100…100; 0 stops. |
| `SET_SWITCH_LED port power` | `85` CMD_P_SET_LED | u8 @8, i16 @16 | LED bumper colour: **+ = green, − = red, 0 = off**, magnitude = brightness %. |

### Eye sensor (built into the brain)

| Script line | Opcode | Layout |
|---|---|---|
| `SET_SENSOR_LED pct` | `B0` CMD_SET_SENS_LED | u8 @8 — eye light brightness (VEXcode: on = 100, off = 0) |
| `SET_SENSOR_PROX preset` | `B1` CMD_SET_SENS_PROX | u8 @8 — proximity sensitivity 0 (near) … 4 (far); VEXcode uses 0 = NEAR, 2 = FAR |

### Robot Arm preset helpers

`SET_ARM_ROTATION`, `SET_ARM_ROTATE_VEL`, `ARM_STOP_ROTATE`, `ARM_ROTATE_TO/FOR`, `ARM_ROTATE`, `ARM_ROTATE_TO_A` are the motor commands above with port fixed to 0; `SET_ARM_TILT*`, `ARM_TILT*` use port 3.

### Sound / lights (VEX 123 & Coder only — the GO brain ignores them)

`PLAY_SOUND id` (`41`, type 3), `PLAY_MIDI id` (`41`, type 2), `PLAY_TONE`, `SET_VOLUME` (`42`), `SET_RGB r g b` (`51`), `GLOW colorId` (`52`), `SET_FLOOR_THRESH` (`5A`), `SET_FLOOR_LED` (`5B`), `ACT id` (`B4`).

### Worked examples (from the golden file)

| Script | uint32 | Bytes on the wire (after `20`) |
|---|---|---|
| `DRIVE_FOR 200 50` | `0x3200C802` | `02 C8 00 32` |
| `DRIVE -50` | `0xFFFFCE01` | `01 CE FF FF` |
| `TURN_FOR -90 50` | `0x32FFA612` | `12 A6 FF 32` |
| `SET_SWITCH_LED 1 -100` | `0xFF9C0185` | `85 01 9C FF` |
| `MAG_BOOST 2 1100` | `0x044C0283` | `83 02 4C 04` |
| `SET_SENSOR_PROX 2` | `0x000002B1` | `B1 02 00 00` |

## 5. Command completion ("and wait")

The firmware runs one command per port at a time (ports 0–3 and the virtual **port 4 = drivetrain**). Each *ProgramPortCmdStatus* notification carries the port's `activeCommand` opcode (`FF` = idle). VEXcode's rule for a `wait=True` command sent on port *p*:

1. Remember the status `updateCounter` at send time; `maxCount = counter + 7`.
2. When a status for *p* arrives with `activeCommand != FF` → mark *started*.
3. When `activeCommand == FF` and *started* → **done**.
4. If `activeCommand == FF` and the counter reaches `maxCount` without ever seeing it active (very short moves) → **done**.
5. A new command on the same port cancels the previous wait.

Status arrives ~10×/s, so completion is detected within ~100 ms. `GoRobot.send(script, waitPort)` in `app/js/robot.js` implements the same rule.

## 6. Robot configuration

Before any command, the brain must know what is plugged in. Two ways:

* **Preset:** `50 01` (Code Base: ports 1&4 drivetrain, 2 bumper, 3 magnet), `50 02` (Robot Arm), `50 03` (Control — joystick mode). VEXcode sends the preset whenever it connects or the configuration changes, after `01` (stop).
* **Per port:** `51 port devType flags iLimitMax(lo hi) iLimitPct accel defaultVel`.
  * `devType`: `10` magnet, `20` motor, `80` bumper, `A0` drivetrain (virtual), `40` pot, `B0` touch-LED, `C0` sound.
  * `flags`: bit0 enabled, bit1 reverse, bit2 drive-left, bit3 drive-right, bit4 optional.
  * Code Base equivalent: `51 00 20 05 F4 01 64 01 32` (port 1 = left motor), `51 03 20 09 F4 01 64 01 32` (port 4 = right motor), `51 01 80 01 …` (bumper), `51 02 10 01 …` (magnet). A reversed motor adds flag `02`.
  * VEXcode uses iLimitPct 100 and iLimitMax 500 for drive motors, defaults 66 / 750 elsewhere.
* Eye sensor is configured with the sensor commands (`SET_SENSOR_PROX 0`, `SET_SENSOR_LED 100`) and `SetSensorMode(2)` (colour + proximity) via the Sensor service.

The 20-byte *ProgramBotConfig* value is 4 × `[deviceType, flags, s0, s1, s2]`.

After sending configuration VEXcode waits ~3 s before trusting commands (`resolveWhenSafeToSendCommands`).

### "Prepare for project" (what VEXcode does on Start)

```
01                      stop script engine
50 01                   preset (or 51 … per port)
SET_VELOCITY 25         (user default 50 % × 0.5)
SET_TURNRATE 25
SET_HEADING 0
SET_TIMEOUT 0
(for each motor) SET_MOTOR_POS p 0 · SET_MOTOR_VEL p 17 · SET_I_LIMIT p 200 · SET_MOTOR_TIMEOUT p 0
SET_SENSOR_PROX 0 · SET_SENSOR_LED 100
```

On Stop: `01`, `DRIVE_STOP 2` (coast) / `STOP_MOTOR p 2`, `END`.

## 7. Controller ("Drive") mode

VEXcode's Drive tab does **not** stream drive commands; it switches the brain into its built-in joystick mode:

```
01                                   stop
50 03                                GO_CONTROL preset
51 01 80 01 …                        port 2 = bumper (or motor)
51 02 10 01 …                        port 3 = magnet (or motor)
A0 02 01 <SET_SWITCH_LED 1 100>      F_UP pressed  → green LED
A0 00 01 <SET_SWITCH_LED 1 -100>     F_DOWN pressed → red LED
A0 02 00 <SET_SWITCH_LED 1 0>        F_UP released → off
A0 00 00 <SET_SWITCH_LED 1 0>        F_DOWN released → off
A0 03 01 <MAG_BOOST 2 500>           E_UP pressed  → magnet grab
A0 01 01 <MAG_DROP 2 1000>           E_DOWN pressed → magnet release
A0 03 00 <NONE (FF)> / A0 01 00 <NONE>
A3 01 32 19                          stick mode Tank, drive 50 %, turn 25 %
then every 100–185 ms:
A1 lx ly rx ry b1 b2                 sticks 0–255 (127 centre; Y: 0 = full up), button bitmask
```

Button ids (`VEXButtonValues`): 0 F_DOWN, 1 E_DOWN, 2 F_UP, 3 E_UP, 4 L_DOWN, 5 L_UP, 6 R_DOWN, 7 R_UP, 8 L_STICK, 9 R_STICK, 10 POWER. Bits 0–7 go in `buttons1`, 8–15 in `buttons2`.

Stick types: 1 Tank (left Y = left wheels, right Y = right wheels), 2 Left-stick arcade, 3 Right-stick arcade, 4/5 split arcade. Sensor notifications keep flowing in this mode, so the Drive tab's pictures update live. Leaving the tab: `01` then re-send the project configuration.

## 8. Status notifications

### 8.1 ProgramSensorStatus (18 or 20 bytes)

| Offset | Type | Field | Derived |
|---|---|---|---|
| 0 | i16 | accX | g = value / 8192 |
| 2 | i16 | accY | |
| 4 | i16 | accZ | |
| 6 | i16 | gyroX | |
| 8 | i16 | gyroY | |
| 10 | i16 | gyroZ | |
| 12 | i8 | pitch | degrees = value × 1.41 |
| 13 | i8 | roll | degrees = value × 1.41 |
| 14 | i8 | yaw | degrees = value × 1.41 |
| 15 | u8 | hue | degrees = value × 1.41 (0–359) |
| 16 | u8 | brightness | % |
| 17 | u8 | proximity | 0–255, **object found when ≥ 50** |
| 18 | i16 | floor | (VEX 123 line sensor; absent on GO) |

### 8.2 ProgramPortCmdStatus (variable, records until a 0 byte)

Each record: `hdr activeCmd len payload…`, `hdr = deviceType | port` (high nibble device, low nibble port 0–4).

| Device | len | Payload |
|---|---|---|
| Motor `20` | 8 | i8 current, i8 velocity (×3 = %), i32 position (deg), u8 flags, u8 modeBits |
| Magnet `10` | 2 | i8 pwm, u8 flags |
| Bumper `80` | 3 | i8 pwm (LED), u8 state (bit0 = **pressed**), u8 flags (bit1 pressed-event, bit2 released-event) |
| Drivetrain `A0` (port 4) | 10 | u8 **battery %**, u8 configPreset, u8 flags (bit1 = **crash**), i8 velocity (×2 = %), i16 heading (deg), i32 position |
| Drivetrain short | 5 | battery, preset, flags, i16 heading |
| Sound `C0` | 2 | soundType, soundID |

Motor flags: 1 timeout, 2 device error, 4 over-current, 8 over-range, 16 stall, 32 stall timeout, 128 done. Motor mode bits: 1 off, 2 velocity, 4 profile, 0x40 hold, 0x50 coast, 0x60 brake, 0x80 active command.

### 8.3 Derived values VEXcode shows

* heading = `((rotation % 360) + 360) % 360`; rotation = raw drivetrain heading (unbounded).
* drivetrain velocity % = raw × 2; motor velocity % = raw × 3; `isMoving` = velocity ≠ 0, `isDone` = velocity == 0.
* eye `foundObject` = proximity ≥ 50; `brightObject` = brightness > 70; `isNear` = proximity > 200.
* colour from hue: ≥340 red · 255–339 none · 160–254 blue · 155–159 none · 75–154 green · 20–74 none · <20 red.

## 9. Minimal end-to-end example (JavaScript)

```js
import { VexGoBle } from './app/js/ble.js';
const ble = new VexGoBle();
await ble.connect();                       // chooser → GATT → notifications
await ble.stopProgram();                   // 01
await ble.setConfigPreset(1);              // 50 01  (Code Base)
await ble.sendCommand('SET_VELOCITY 25');
await ble.sendCommand('DRIVE_FOR 450 25'); // 200 mm forward
ble.addEventListener('ports', e => console.log(e.detail.ports));
```
