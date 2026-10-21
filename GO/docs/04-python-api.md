# 04 — The `go` Python module (what VEXcode GO Python really is)

VEXcode GO's "Python" is **CPython 3.8 running in Pyodide 0.17 inside a Web Worker**, with a small pure-Python package named `go` (`/lib/pyodide-0.17.0/go.data`, files `__init__.py`, `devices.py`, `enums.py`, `events.py`, `threads.py`, `utils.py`, `jspromisewrapper.py`). Every device method forwards to `vexcode_api.goInterface.<jsMethod>()` which posts a message to the VEXcode main thread (see [01](01-how-vexcode-go-works.md)). Nothing runs on the brain.

Key facts that are *not* obvious from VEX's public API docs:

* Motion methods are **`async`** and the generated code awaits them. Each hat block becomes an `asyncio` task (`start_thread`).
* **Velocity scaling:** `Drivetrain.set_drive_velocity(v)` stores `v × 0.5` and sends that; `Motor.set_velocity(v)` stores `v / 3`. Defaults: drivetrain 25 (i.e. "50 %"), motor 17.
* **Distance:** `drive_for` converts mm to wheel degrees with wheel travel 160 mm/rev (`× 360/160`); inches × 25.4 first.
* **Turn direction:** `LEFT` negates the angle; positive = clockwise.
* `set_heading`/`set_rotation` sleep 20 ms after sending so the next status reflects it.
* Sensor getters are synchronous and read the last `StatusUpdate` snapshot (`get_status()`), pushed ~10×/s.
* `LEDBumper.set_color` sends `colour_sign × brightness` (red = −1, green = +1, off = 0) as one `SET_SWITCH_LED` value.
* `Magnet.energize(BOOST|DROP)` → `MAG_BOOST/MAG_DROP port 1100`.
* `Eye.set_range(NEAR|FAR)` → `SET_SENSOR_PROX 0|2`; `set_light(ON|OFF)` → `SET_SENSOR_LED 100|0`.
* `Eye.color()` priority: blue, then green, then red, else NONE (uses the hue thresholds in [02](02-bluetooth-protocol.md) §8.3).
* `Timer` is a Python-side timer (`time.time()`), with a 10 ms event-check loop for `timer.event(cb, ms)`.

## Enums (`go.enums`)

| Enum | Members (value) | Globals exported |
|---|---|---|
| StopMode | BRAKE 1, COAST 2, HOLD 3 | `BRAKE, COAST, HOLD` |
| PercentUnits | PERCENT 0 | `PERCENT` |
| TimeUnits | SECONDS/SEC 0, MSEC 1 | `SECONDS, SEC, MSEC` |
| RotationUnits | DEG 0, TURNS 1 | `DEGREES, TURNS` |
| RPMUnits | RPM 1 | `RPM` |
| DistanceUnits | MM 0, IN 1 | `MM, INCHES` |
| DirectionType | FORWARD 1, REVERSE −1 | `FORWARD, REVERSE` |
| TurnType | LEFT −1, RIGHT 1 | `LEFT, RIGHT` |
| MagnetType | BOOST "boost", DROP "drop" | `BOOST, DROP` |
| ColorType | BLACK 0, NONE 0, RED 1, GREEN 2, BLUE 3 | `BLACK, NONE, RED, GREEN, BLUE` |
| ObstacleType | CRASH 1, OBJECT 2 | `CRASH, OBJECT` |
| LightModeType | ON 1, OFF 0 | `ON, OFF` |
| RangeModeType | NEAR 0, FAR 2 | `NEAR, FAR` |
| PositionType | X, Y, Z | `X, Y, Z` |
| (pen types exist for VR only) | | |

## Classes (`go.devices`)

### `Drivetrain(name, left_motor_port, right_motor_port, gear_ratio)` — Code Base: `Drivetrain("Drivetrain", 0, 3, 1)`

| Method | Bridge call → script line |
|---|---|
| `drive(direction)` | `drivetrainDrive(±vel)` → `DRIVE ±v` |
| `await drive_for(direction, amount, units=MM, wait=True)` | `drivetrainDriveFor(deg, vel, wait)` → `DRIVE_FOR deg v` |
| `await drive_until(obstacle, wait=True)` | `drivetrainDriveUntil(1|2, vel, wait)` → `DRIVE_UNTIL e v` |
| `turn(direction)` | `drivetrainTurn(±turnVel)` → `TURN ±v` |
| `await turn_for(direction, amount, units=DEG, wait=True)` | `drivetrainTurnFor(±deg, vel, wait)` → `TURN_FOR deg v` |
| `await turn_to_heading(heading, units=DEG, wait=True)` | `drivetrainTurnToHeading` → shortest-path `TURN_TO target v` |
| `await turn_to_rotation(rotation, units=DEG, wait=True)` | `drivetrainTurnToRotation` → `TURN_TO rot v` |
| `await stop(mode=None)` | `drivetrainStop(mode)` → `DRIVE_STOP m` |
| `await set_drive_velocity(v, units=PERCENT)` | stores v×0.5 → `SET_VELOCITY` |
| `await set_turn_velocity(v, units=PERCENT)` | stores v×0.5 → `SET_TURNRATE` |
| `await set_stopping(mode=BRAKE)` | `drivetrainSetStopMode(mode, 0, 3)` → `SET_MOTOR_BRAKE 0 m` + `SET_MOTOR_BRAKE 3 m` |
| `await set_heading(h, units=DEG)` / `set_rotation(r)` | `drivetrainSetHeading/Rotation` → `RESET_HEADING h` |
| `await set_timeout(t, units=SECONDS)` | `drivetrainSetTimeout(ms)` → `SET_TIMEOUT ms` |
| `await calibrate()` | `inertialCalibrate()` → `CAL_GYRO` |
| `is_done()`, `is_stopped()`, `is_moving()` | status drivetrain.isDone / isMoving |
| `get_velocity(PERCENT)`, `get_heading(DEGREES)`, `get_rotation(DEGREES)` | status |
| `get_yaw()`, `get_roll()`, `get_pitch()`, `get_crashed()` | status gyro |

### `Motor(name, port)`

`spin(direction)`, `spin_for(direction, amount, units=DEG, wait=True)`, `spin_to_position(position, units, wait)`, `stop()`, `set_position(pos, units)`, `set_velocity(v, PERCENT)` (stores v/3), `set_stopping(mode)`, `set_timeout(t, units)`, `set_max_torque(pct)` → `SET_I_LIMIT`, `is_done()/is_stopped()`, `is_spinning()/is_moving()`, `get_velocity()`, `get_position(units)`, `get_current()`.

### `LEDBumper(name, port)`

`set_color(RED|GREEN|NONE|OFF)`, `set_brightness(0–100)`, `pressed()` / `is_pressed()`.

### `Magnet(name, port)`

`energize(BOOST|DROP)`.

### `Eye()`

`set_light(ON|OFF)`, `set_range(NEAR|FAR)`, `set_light_power(0–100)`, `is_object_detected()`, `color()`/`get_color()`, `is_color_detected(color)`, `get_brightness()`, `get_hue()`.

### `Inertial()`

`calibrate()`, `reset_heading()`, `reset_rotation()`, `set_heading(h)`, `set_rotation(r)`, `get_heading()`, `get_rotation()`, `get_yaw()`, `get_roll()`, `get_pitch()`, `get_crashed()`, `get_acceleration(X|Y|Z)` (g).

### `Console()`

`print(*objects, precision=0)` → `vexcode_api.sendPrintText`, `clear()`, `new_line()`, `set_print_color(color)`.

### `Timer()`

`reset()`, `time(units)`, `get_time(units)`, `event(callback, time_ms)`, `start()`, `stop()`, `is_running()`, `clear_events()`.

### Module functions

`await wait(time, units)` (`asyncio.sleep`), `set_print_color(color)`, `stop_program()` / `stop_project()`, `monitor_variable(*names)`, `monitor_sensor(*names)`, `start_thread(func)` (creates an asyncio task and routes exceptions to VEXcode's error panel), `Event()` with `broadcast()` / `await broadcast_and_wait()`.

## The JS bridge (`PyodideGOInterface`)

Message names the Python calls produce (`command` / `instruction`): `GODrivetrain`: drive, drive_for, turn, turn_for, drive_until, turn_to_heading, turn_to_rotation, stop, set_stop_mode, set_time_out, set_heading, set_rotation, set_drive_velocity, set_turn_velocity · `GOMotor`: spin, spin_for, spin_to_position, stop, set_position, set_velocity, set_stopping, set_timeout, set_max_torque · `GOBumper`: set_color, set_brightness · `GOEye`: set_light, set_range, set_power · `GOMagnet`: mode · `GOInertial`: calibrate, reset_heading, set_heading.

The status snapshot (`get_status()`) looks like:

```json
{ "battery": 87,
  "gyro": { "accX": 0, "accelXG": 0.0, "...": 0, "pitch": 0, "roll": 0, "yaw": 0, "absHeading": 90, "crash": false, "heading": 90, "rotation": 90 },
  "eye": { "distance": 120, "hue": 110, "brightness": 60, "foundObject": true, "brightObject": false, "isNear": false,
           "colorDetected": 2, "detectsNone": false, "detectsRed": false, "detectsGreen": true, "detectsBlue": false },
  "drivetrain": { "absHeading": 90, "rotation": 90, "velocity": 0, "velocityPercent": 0, "heading": 90, "isMoving": false, "isDone": true },
  "ports": [ { "port": 1, "deviceType": 128, "value": 1, "bumperPressed": true, "bumperCurrentlyPressed": true, "...": 0 } ] }
```

## Writing Python for the GO brain outside VEXcode?

Not directly: the `go` package needs `vexcode_api` (a JS object) and Pyodide. If you want text programming later, the practical route is the same one this project takes — talk to the brain over Web Bluetooth with the script lines in [02](02-bluetooth-protocol.md), from JavaScript (or from Python on a PC with `bleak`, using the same UUIDs and bytes).
