# 03 — VEXcode GO block reference (block → Python → robot command)

Default device names are those of the Code Base preset: `drivetrain` (ports 1+4), `bumper` (port 2), `magnet` (port 3), `eye`, `inertial`, `timer`, `console`. Firmware ports are 0-based, so bumper = port `1`, magnet = port `2`. "Script line" is the text command VEXGOController sends (see [02](02-bluetooth-protocol.md) §4 for bytes). Velocities: VEXcode halves drivetrain percentages (`×0.5`) and divides motor percentages by 3 before sending.

## Drivetrain – Actions

| Block (picture text) | Python | Script line(s) | Waits? |
|---|---|---|---|
| drive **forward/reverse** | `drivetrain.drive(FORWARD)` | `DRIVE 25` (`DRIVE -25` reverse) | no (runs until stop) |
| drive forward for **200 mm/inches** [and don't wait] | `drivetrain.drive_for(FORWARD, 200, MM)` | `DRIVE_FOR 450 25` (mm × 2.25 = wheel degrees; inches × 25.4 first) | yes unless mutator |
| drive forward until **object/crash** | `drivetrain.drive_until(OBJECT)` | `DRIVE_UNTIL 2 25` (crash = 1) | yes |
| turn **left/right** | `drivetrain.turn(RIGHT)` | `TURN 25` (`TURN -25` left) | no |
| turn right for **90 degrees** | `drivetrain.turn_for(RIGHT, 90)` | `TURN_FOR 90 25` (left → −90) | yes |
| turn to heading **90 degrees** | `drivetrain.turn_to_heading(90)` | `TURN_TO <target> 25` where target = current rotation + shortest delta | yes |
| turn to rotation **90 degrees** | `drivetrain.turn_to_rotation(90)` | `TURN_TO 90 25` | yes |
| stop driving | `drivetrain.stop()` | `DRIVE_STOP 2` (current stopping mode) | – |

## Drivetrain – Settings

| Block | Python | Script line |
|---|---|---|
| set drive velocity to **50 %** | `drivetrain.set_drive_velocity(50, PERCENT)` | `SET_VELOCITY 25` |
| set turn velocity to **50 %** | `drivetrain.set_turn_velocity(50, PERCENT)` | `SET_TURNRATE 25` |
| set drive stopping to **brake/coast/hold** | `drivetrain.set_stopping(BRAKE)` | `SET_MOTOR_BRAKE 0 1` + `SET_MOTOR_BRAKE 3 1` (both drive motors) |
| set drive timeout to **1 seconds** | `drivetrain.set_timeout(1, SECONDS)` | `SET_TIMEOUT 1000` |
| set drive heading to **0 degrees** | `drivetrain.set_heading(0)` | `RESET_HEADING 0` |
| set drive rotation to **0 degrees** | `drivetrain.set_rotation(0)` | `RESET_HEADING 0` |

## Drivetrain – Values (reporter blocks; no command, read from status)

| Block | Python | Source |
|---|---|---|
| drive is done? | `drivetrain.is_stopped()` | drivetrain velocity == 0 |
| drive heading in degrees | `drivetrain.get_heading()` | heading 0–359 |
| drive rotation in degrees | `drivetrain.get_rotation()` | raw heading |
| drive velocity in % | `drivetrain.get_velocity()` | raw × 2 |
| detected crash? | `drivetrain.get_crashed()` | drivetrain flags bit1 |
| acceleration of **x/y/z** axis in g | `inertial.get_acceleration(X)` | accX / 8192 |

## Inertial (brain built-in)

| Block | Python | Script line |
|---|---|---|
| calibrate gyro | `inertial.calibrate()` | `CAL_GYRO` |
| set heading to **0** degrees | `inertial.set_heading(0)` | `RESET_HEADING 0` |
| set rotation to **0** degrees | `inertial.set_rotation(0)` | `RESET_HEADING 0` |
| heading in degrees | `inertial.get_heading()` | status |
| rotation in degrees | `inertial.get_rotation()` | status |

## Magnet

| Block | Python | Script line |
|---|---|---|
| energize magnet to **boost/drop** | `magnet.energize(BOOST)` | `MAG_BOOST 2 1100` / `MAG_DROP 2 1100` |
| set electromagnet power / duration | (legacy, no Python generator) | – |

## LED Bumper (Looks)

| Block | Python | Script line |
|---|---|---|
| set bumper to **red/green/off** | `bumper.set_color(RED)` | `SET_SWITCH_LED 1 -100` / `… 100` / `… 0` (× brightness) |
| set bumper brightness to **50 %** | `bumper.set_brightness(50)` | `SET_SWITCH_LED 1 ±50` (sign from current colour) |
| bumper pressed? | `bumper.is_pressed()` | status state bit0 |
| **when bumper pressed/released** (hat) | event registered on sensor_events | status flags |

## Eye sensor (Sensing)

| Block | Python | Script line / source |
|---|---|---|
| set eye light **on/off** | `eye.set_light(ON)` | `SET_SENSOR_LED 100` / `0` |
| set eye to **near/far** range | `eye.set_range(NEAR)` | `SET_SENSOR_PROX 0` / `2` |
| set eye light power to **50 %** | `eye.set_light_power(50)` | `SET_SENSOR_LED 50` |
| eye found an object? | `eye.is_object_detected()` | proximity ≥ 50 |
| eye detects **red/green/blue**? | `eye.is_color_detected(RED)` | hue thresholds (02 §8.3) |
| eye brightness in % | `eye.get_brightness()` | status |
| eye hue in degrees | `eye.get_hue()` | status |

## Motors (custom configs: `go_motion_*`)

| Block | Python | Script line |
|---|---|---|
| spin Motor1 **forward/reverse** | `motor1.spin(FORWARD)` | `SPIN p 17` (user 50 % ÷ 3) |
| spin Motor1 forward for **90 degrees/turns** | `motor1.spin_for(FORWARD, 90, DEGREES)` | `SPIN_FOR p 90` |
| spin Motor1 to position **90 degrees** | `motor1.spin_to_position(90, DEGREES)` | `SPIN_TO p 90` |
| stop Motor1 | `motor1.stop()` | `STOP_MOTOR p 2` |
| set Motor1 position to **0 degrees** | `motor1.set_position(0, DEGREES)` | `SET_MOTOR_POS p 0` |
| set Motor1 velocity to **50 %** | `motor1.set_velocity(50, PERCENT)` | `SET_MOTOR_VEL p 17` |
| set Motor1 stopping to **brake** | `motor1.set_stopping(BRAKE)` | `SET_MOTOR_BRAKE p 1` |
| set Motor1 max torque to **50 %** | `motor1.set_max_torque(50, PERCENT)` | `SET_I_LIMIT p 50` |
| set Motor1 timeout to **1 seconds** | `motor1.set_timeout(1, SECONDS)` | `SET_MOTOR_TIMEOUT p 1000` |
| Motor1 is done? / is spinning? | `motor1.is_done()` / `is_spinning()` | status velocity |
| Motor1 position / velocity / current | `motor1.get_position()` … | status |

## Console (Looks)

| Block | Python | Effect |
|---|---|---|
| print **VEXcode** [and set cursor to next row] | `console.print("VEXcode")` (+ `console.new_line()`) | text in VEXcode's Monitor → Console panel (nothing on the brain) |
| set print precision to **0.1** | `console_precision = 1` | formatting |
| clear all rows | `console.clear()` | |
| set cursor to next row | `console.new_line()` | |
| set print color **black/red/green/blue** | `set_print_color(RED)` | |

## Control, Timer, Events, Operators, Variables (pure Python, no robot commands)

| Block | Python |
|---|---|
| wait **1** seconds | `wait(1, SECONDS)` (`asyncio.sleep`) |
| wait until ⟨cond⟩ | `while not cond: wait(5, MSEC)` |
| repeat **10** / forever / repeat until / while | `for repeat_count in range(10):` / `while True:` / `while not …` / `while …` — each loop body gets `wait(5, MSEC)` so sensors update |
| if / if-else / if-elseif-else, break | Python equivalents |
| stop project | `stop_program()` → `vexcode_api.stopProject()` (stops the VM; the brain gets `01`, `DRIVE_STOP`, `END`) |
| reset timer / timer in seconds | `timer.reset()` / `timer.time(SECONDS)` |
| when started (hat) | `def when_started1(): …` + `start_thread(when_started1)` (each hat = asyncio task) |
| when timer > **1** seconds (hat) | `timer.event(callback, 1000)` |
| when I receive **msg** / broadcast / broadcast and wait | `Event()` objects: `my_event(callback)`, `my_event.broadcast()`, `await my_event.broadcast_and_wait()` |
| operators (+ − × ÷, comparisons, and/or/not, random, round, abs/sqrt/…, remainder, join, letter, length, contains, convert) | plain Python (`random.randint`, `math.fabs`, `str()`, …) |
| variables, lists, 2-D lists, booleans | Python globals / lists |
| My Blocks (custom procedures) | `def my_block(): …` |
| comment | `# …` |

## Blocks per robot configuration

The toolbox only shows categories for configured devices. Without a robot: Inertial, Console, Logic, Switch. With **Code Base**: Drivetrain (Actions/Settings/Values), Inertial, Magnet, LED, Eye, Console, Logic, Switch. With **Robot Arm**: Motion (motors), Magnet, LED, Eye, … Custom configurations add a Motion category per motor.

## The puzzle app's pieces map onto these

| Puzzle piece | Equivalent block | Script line |
|---|---|---|
| ⬆ ×1…5 | drive forward for 150…750 mm | `DRIVE_FOR 338…1688 25` |
| ⬇ ×1…5 | drive reverse for … | `DRIVE_FOR -338… 25` |
| ↱ / ↰ (45/90/135/180°) | turn right/left for N degrees | `TURN_FOR ±N 25` |
| ↻180 / ↻360 | turn right for 180°/360° | `TURN_FOR 180/360 25` |
| 🔴/🟢/⚪ bumper | set bumper to red/green/off | `SET_SWITCH_LED 1 -100/100/0` |
| 🧲 on / off | energize magnet boost/drop | `MAG_BOOST 2 1100` / `MAG_DROP 2 1100` |
| speedometer 1…5 | set drive velocity + set turn velocity to 17/33/50/75/100 % | `SET_VELOCITY 9…50` + `SET_TURNRATE 9…50` |
| ⏳ ×1…5 | wait 1…5 seconds | – |
| 👆bumper | wait until bumper pressed | – (status) |
| 👁🔴/🟢/🔵 | wait until eye detects colour | – (status) |
| 👁📦 | wait until eye found an object | – (status) |
| 🔁 2/3/5/10/∞ | repeat N / forever | – |
