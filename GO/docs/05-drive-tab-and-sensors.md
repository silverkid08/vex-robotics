# 05 — The Drive tab and the sensors

## What VEXcode GO's Drive tab shows

Layout (as rendered in v4.67):

```
 Brain                 Drivetrain            LED Bumper        Eye Sensor
 Battery      [N/A]    Velocity    0 %       Pressed?  FALSE   Found Object? FALSE
 X Accel.    0.00 G    Heading     0 deg                       Detect Red?   TRUE
 Y Accel.    0.00 G    Rotation    0 deg                       Detect Blue?  FALSE
 Z Accel.    0.00 G                                            Detect Green? FALSE
                                                               Brightness    0 %
                                                               Hue           0 degrees

           Drive Mode:  [TANK DRIVE] [LEFT ARCADE] [RIGHT ARCADE] [SPLIT ARCADE]

        Port 2                 Timer                 Port 3
        [LED BUMPER] [MOTOR]   RESET / 00:00.0       [ELECTROMAGNET] [MOTOR]
                               START

  (left joystick)   ⬆ Port 2 ⬇                       ⬆ Port 3 ⬇   (right joystick)
```

* Two on-screen joysticks (vertical sliders in tank mode). Drive Mode selects the firmware stick mapping (`A3 type 50 25`).
* Port 2 / Port 3 toggles tell the brain what is plugged in (`51` per-port config) and the arrow buttons map to the controller buttons F_UP/F_DOWN (port 2) and E_UP/E_DOWN (port 3): LED green/red (or motor fwd/rev), magnet boost/drop (or motor fwd/rev).
* Values are **text** ("TRUE", "0 degrees"). Our app replaces each cell with a picture (below).
* Timer is a page-side stopwatch.

Mechanics are in [02 §7](02-bluetooth-protocol.md): the brain is put into the **GO_CONTROL** preset and receives joystick values every 185 ms (web) / 100 ms (iOS) / 150 ms (Android). Nothing is "programmed"; the firmware mixes the sticks into motor speeds.

## Sensors on a Code Base and where each value comes from

| Sensor | Raw source | Conversion | VEXcode block/Drive label |
|---|---|---|---|
| Battery | PortCmdStatus drivetrain record byte 0 | % | Battery |
| Accelerometer X/Y/Z | SensorStatus i16 | ÷ 8192 → g | X/Y/Z Acceleration |
| Gyro rates | SensorStatus i16 | raw | (not shown) |
| Pitch / Roll / Yaw | SensorStatus i8 | × 1.41 → degrees | inertial.get_pitch… |
| Heading | PortCmdStatus drivetrain i16 heading | mod 360 | Heading |
| Rotation | same, unbounded | | Rotation |
| Drive velocity | drivetrain i8 velocity | × 2 → % | Velocity |
| Crash | drivetrain flags bit1 | boolean (latched until cleared / next motion) | detected crash? |
| Bumper pressed | bumper record state bit0 | boolean | Pressed? |
| Bumper LED | bumper record pwm | − red, + green, magnitude = brightness | (not shown) |
| Magnet | magnet record pwm | + boost, − drop pulse | (not shown) |
| Eye proximity | SensorStatus u8 | object found if ≥ 50 (near if > 200) | Found Object? |
| Eye hue | SensorStatus u8 × 1.41 | 0–359° | Hue |
| Eye brightness | SensorStatus u8 | % (bright object if > 70) | Brightness |
| Eye colour | hue thresholds | red ≥340 or <20; green 75–154; blue 160–254; otherwise none | Detect Red/Green/Blue? |

Note that "Detect Red? TRUE" shows even with nothing in front of the eye (hue 0 → red). VEXcode's block `eye detects red?` has the same quirk; our app only reports a colour when `foundObject` is also true.

## The app's picture equivalents

| Value | Picture |
|---|---|
| Battery % | battery outline whose fill shrinks and turns yellow (< 50 %) then red (< 20 %) |
| Bumper pressed | the bumper dome squashes down and the tile turns light green |
| Bumper LED | the dome glows red / green with a halo, grey when off |
| Eye colour / object | eye whose iris takes the seen colour; a small box appears beside it when an object is in range |
| Magnet | magnet with sparks when energised |
| Heading | compass with a red needle rotated to the heading |
| Velocity | little robot with 0–3 motion lines |
| Crash | a star-burst flashes for 0.8 s |
| Controller connected | gamepad icon lights up |

## Driving in the app

* **Arrow pad:** hold ⬆ ⬇ ⬅ ➡ (multi-touch OK). The app mixes `drive`/`turn` into tank values: left = drive + 0.8·turn, right = drive − 0.8·turn, and sends `A1` every 100 ms.
* **LED buttons:** latch the F_UP / F_DOWN bits (green / red); tap again for off. **Magnet buttons:** pulse E_UP (grab) / E_DOWN (drop) for 250 ms.
* **Xbox controller:** see [08](08-xbox-controller.md).
* Leaving the Drive tab sends `01` (stop) and restores the Code Base configuration so puzzle programs work again.
