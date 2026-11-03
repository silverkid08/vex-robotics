# 11 — VEX GO electronics (hardware reference)

What every powered part of a VEX GO kit is, what it does, how it plugs in, and how it shows up in VEXcode GO. This is the *hardware* companion to [02](02-bluetooth-protocol.md) (the bytes the brain accepts) and [05](05-drive-tab-and-sensors.md) (how sensor values are derived).

Sources are official VEX pages (VEX Library at kb.vex.com, product pages at vexrobotics.com, the API reference at api.vex.com) and posts by VEX staff on the VEX PD community (plc.pd.vex.com). Research date: 2026-11-03. Anything VEX does not publish is marked **not published**; anything seen only in a search excerpt is marked **unverified**.

## The complete GO electronics catalogue

| Part | SKU | Role | Plugs into |
|---|---|---|---|
| GO Brain | 269-6685 | Runs the devices, talks Bluetooth to VEXcode GO, has the built-in inertial sensor | — |
| GO Battery | 269-6686 | Removable rechargeable pack | Orange Battery Port on the Brain (or the Switch) |
| GO Switch | 269-6687 | Non-programmable 3-position switch; runs one motor or LED Bumper straight from a battery | Battery + one device |
| GO Smart Motor (×3 per kit) | 269-6690 | Closed-loop motor with position feedback | Any numbered Smart Port 1–4 |
| GO Eye Sensor | 269-6695 | Colour / object / brightness sensor with its own light | The dedicated blue-green Eye Sensor port **only** |
| GO LED Bumper | 269-6696 | Bumper switch *and* red/green light in one part | Any numbered Smart Port 1–4 |
| GO Electromagnet | 269-6702 | Picks up and drops the metal-cored GO Disks | Any numbered Smart Port 1–4 |
| GO USB cable (A to C, 1 m) | 269-6961 | Charges the battery | Battery USB-C socket |
| Battery Charging Hub | not published | Charges five batteries at once; Classroom Bundles only | — |

That is the whole list. There is **no** separate plain bumper switch, no touch LED, no distance sensor, no colour sensor module, no gyro module, no speaker and no screen in the GO line. Those belong to VEX IQ or VEX 123 (see the comparison at the end).

Every kit (with or without storage) contains: 1 Brain, 1 Battery, 1 Switch, 3 Smart Motors, 1 Eye Sensor, 1 LED Bumper, 1 Electromagnet, 1 USB-C cable. Only Classroom Bundles add an AC adapter and the Charging Hub.

Sources: https://www.vexrobotics.com/go-kits.html , https://www.vexrobotics.com/parts/269-6911 , https://kb.vex.com/hc/en-us/articles/14937634572948-Troubleshooting-VEX-GO-Sensors

## GO Brain (269-6685)

**Ports.** Four numbered Smart Ports (1–4) on top for Motors, LED Bumpers and Electromagnets. On the opposite side: one **orange** Battery Port and one **blue-green** Eye Sensor port. The Eye Sensor must go in the Eye port, never a Smart Port. Cables click when fully seated; a cable that is not clicked in is the first thing to check when a device is "missing".

**Limits.** Up to four Smart Port devices plus one Eye Sensor per Brain.

**Power button and LED.** One clear button with an orange ring on top. Press to turn on (button glows **green**); hold about 3 s to turn off. LED meanings:

| Colour | Meaning |
|---|---|
| Solid green | On / connected to VEXcode GO |
| Orange (VEXcode icon) | VEXcode is searching for a brain |
| Yellow | "Located" from the VEX Classroom app |
| Blinking red/green | Firmware updating after connecting to VEXcode |
| Flashing red | Forced-update (bootloader) mode, see below |

**Radio.** Bluetooth Low Energy only. Range about 30 ft (9 m). There is no USB data port on the Brain: programs, drive commands and firmware all arrive over Bluetooth. Bluetooth version is **not published**.

**Built-in Inertial Sensor.** The Brain contains a gyro and an accelerometer. VEXcode exposes heading (0–359.99°, clockwise positive), rotation (unbounded), yaw/pitch/roll (Python only), crash detection, and acceleration on X/Y/Z from −4 g to +4 g. Calibration takes about 2 s with the Brain still; since VEXcode GO 4.61 it only calibrates when an inertial device is configured. The raw packet layout is in [02 §8.1](02-bluetooth-protocol.md).

**Timer.** A project timer that resets when a project starts (`reset timer`, `timer in seconds`, `when timer >` hat block).

**No screen, no speaker.** Inferred from the hardware description and the absence of any Looks/Sound category in the GO API; `print` goes to the VEXcode console on the tablet. The brain silently ignores the sound and RGB commands that VEX 123 uses ([02 §4](02-bluetooth-protocol.md)).

**Physical specs.** Dimensions, weight, processor: **not published**.

**Mounting.** Pins directly to beams and plates like any other GO part; there is no separate brain mount. The exact hole pattern on the underside is not documented.

**Firmware.** VEX calls it "firmware", not VEXos, for GO. How to update:

- *VEX Classroom app* (iPad, Android, Chromebook, Mac, Windows): brains needing an update are listed in red; select, press Update; a real update takes up to 2 min; "Update All Devices" does several brains one after another. Also used to rename brains, Locate (LED yellow), read battery level and a live device table.
- *VEXcode GO on iPad/Android* updates automatically on connect.
- *Web VEXcode GO (Chromebook, codego.vex.com)*: the first update must be done with the Classroom app; later ones can be done from VEXcode GO.
- *Forced update / recovery*: with the brain off, hold the power button about 10 s until the LED flashes red, then connect from VEXcode GO and wait for the progress message.
- Version is shown in the Classroom app under "Show Device Info". There is no public firmware changelog for GO. Last version number seen in a VEX staff post: 1.0.6.B0 (undated).

**Controllers.** An IQ (2nd gen) or EXP Controller, or the One Stick Controller, can pair directly to a GO Brain and drive a Code Base with no project at all. Pairing (IQ gen2): hold R-Up + R-Down and double-tap power; (EXP): hold R1 + R2 and double-tap power; LED blinks yellow while pairing. The pairing is temporary and repeats after power-off. The protocol behind this is the controller mode in [02 §7](02-bluetooth-protocol.md).

Sources: https://kb.vex.com/hc/en-us/articles/360048821251-Using-the-VEX-GO-Brain , https://www.vexrobotics.com/269-6685.html , https://api.vex.com/go/home/blocks/Inertial.html , https://kb.vex.com/hc/en-us/articles/360049541252 , https://kb.vex.com/hc/en-us/articles/360048923252 , https://kb.vex.com/hc/en-us/articles/20082111789460-Pairing-an-IQ-2nd-gen-or-EXP-Controller-to-a-GO-Brain , https://kb.vex.com/hc/en-us/articles/52385221518996 , https://plc.pd.vex.com/t/brain-blinking-green-and-red/801 , https://plc.pd.vex.com/t/vexcode-go-4-61-release/1842

## GO Battery (269-6686)

- Separate, removable pack. Connects to the orange port on the Brain or the Switch. One battery per brain, and competition rules allow only one on a robot.
- Chemistry: rechargeable lithium iron (LiFePO4) cells. Capacity and voltage: **not published**.
- Charged through its own **USB-C** socket with the included 1 m USB-A-to-C cable. Any USB power source works; only Classroom Bundles include an AC adapter.
- Charge time: VEX's product page says 1–2 h, the VEX Library says about 3.5 h. Both are official; expect the longer figure from a low-power USB port.
- Run time: "approximately one school day". No hour figure published.
- Indicator: two lights on the side. Two green = full; one green = partly charged; one red = low (0–25 %) or actively charging.
- Dead batteries are handled by VEX Support (RMA), not by the user.

Sources: https://www.vexrobotics.com/269-6686.html , https://kb.vex.com/hc/en-us/articles/360048319212 , https://kb.vex.com/hc/en-us/articles/360049147252-Get-Started-with-a-GO-Classroom-Bundle , https://plc.pd.vex.com/t/vex-go-batteries/765

## GO Switch (269-6687)

A hand-operated three-position switch for builds without a Brain ("bring the VEX GO system to life without programming"). Two ports: a small uncoloured Smart Port for one Motor or LED Bumper and a larger orange Battery Port. Positions: **+** (motor forward, or LED Bumper green), neutral/off, **−** (reverse). Used by the Motorized Super Car and Spirograph builds.

Sources: https://kb.vex.com/hc/en-us/articles/360048330992-Using-the-VEX-GO-Switch , https://www.vexrobotics.com/269-6687.html

## GO Smart Motor (269-6690)

- Captive cable with a Smart Port plug; plugs into any port 1–4. Can also run from the Switch.
- **Square output socket.** A square shaft (Red/Green/Capped/Plain Shaft) or a Gray Pin in the socket is driven; the flange on Red/Green shafts captures the shaft when the motor is mounted on a 2x Beam or 4x Plate. Wheels, gears and pulleys with square hubs then turn with the shaft. See [12](12-vex-go-structural-parts.md) for the square/round rule.
- **Closed loop.** VEXcode exposes position in degrees or turns, absolute `spin to position`, `set motor position`, measured velocity (−100…100 %), current (0–100 %), a torque limit (%), a timeout, and brake / coast / hold stopping, so there is an internal encoder. Encoder resolution, free speed, stall torque, internal gear ratio, voltage, weight, dimensions: **not published**. (For comparison the IQ Smart Motor is 120 rpm free speed, 0.414 N·m stall; the GO motor is a different, smaller unit.)
- **Units are percentages only.** Velocity default 50 %, torque default 50 %. VEXcode scales the user percentage before sending it: motor velocity ÷ 3, drivetrain velocity × 0.5 ([04](04-python-api.md)).
- In VEXcode's device panel a motor can be renamed (e.g. `ArmMotor`), given direction names and reversed.

Sources: https://www.vexrobotics.com/269-6690.html , https://kb.vex.com/hc/en-us/articles/360048817431 , https://kb.vex.com/hc/en-us/articles/360049869692-Key-Ideas-for-Building-with-VEX-GO , https://api.vex.com/go/home/blocks/motion.html , https://api.vex.com/go/home/python/Motion.html

## GO Eye Sensor (269-6695)

Kit contents lists sometimes call it the "GO Optical Sensor".

- Captive blue-green cable into the dedicated Eye port. Attach it before powering the brain on; if it is plugged or unplugged while on, power-cycle the brain (**unverified**, seen in a search excerpt of the sensors article).
- Reports: object found (yes/no), colour (red / green / blue / none), hue 0–359°, brightness 0–100 % (reflected light). Has a white light with adjustable power 0–100 % that helps in dim rooms.
- Range setting: **near** = objects up to 18 mm, **far** = up to 40 mm. Default is far.
- Official colour thresholds: red = hue 340°–20° (wrapping), green = 75°–154°, blue = 160°–254°, otherwise none. Only those three colours are named; use hue for anything finer.
- Known quirk: "detects red" can read true with nothing in front of the sensor because an empty reading has hue 0. VEX's advice is to check readings in the Classroom app's device table, change light power, and try a different sensor. This app only reports a colour when an object is also found ([05](05-drive-tab-and-sensors.md)).
- Protocol note: the brain reports eye data in its own sensor-status packet and takes eye settings via the sensor commands, which is why [02](02-bluetooth-protocol.md) groups the eye with the brain. Physically it is a separate part on its own port.

Sources: https://kb.vex.com/hc/en-us/articles/360049752951-Coding-with-the-VEX-GO-Eye-Sensor , https://api.vex.com/go/home/blocks/Eye.html , https://api.vex.com/go/home/python/Eye.html , https://kb.vex.com/hc/en-us/articles/360048331792-Using-the-VEX-GO-Sensors , https://plc.pd.vex.com/t/vex-code-go-eye-sensor-issues/1242

## GO LED Bumper (269-6696)

"Both a light and a bumper switch." Reports pressed / released, and lights **red, green or off** at a brightness 0–100 %. It is not RGB. Plugs into any Smart Port; Code Base convention is port 2. Also works from the Switch (+ = green). On the wire a single signed value carries colour and brightness: + green, − red, 0 off ([02](02-bluetooth-protocol.md)).

Sources: https://www.vexrobotics.com/269-6696.html , https://kb.vex.com/hc/en-us/articles/360049697051 , https://api.vex.com/go/home/blocks/LED.html

## GO Electromagnet (269-6702)

- Picks up and puts down the kit's three **GO Disks** (red, green, blue), which have metal cores. Holding force and maximum load: **not published**.
- It is really a permanent magnet with a coil. VEX staff describe it this way: at rest it is weakly magnetic and will lift a disk that passes directly under it; **boost** sends current through the coil for about 1 s to strengthen the field; **drop** sends current the other way for about 1 s to cancel it. The pulses are short because the coil warms up. After the pulse it returns to its weak natural pull. The protocol has a continuous hold command too ([02](02-bluetooth-protocol.md)), but VEXcode only uses the pulses (1100 ms in projects, 500/1000 ms from the Drive tab).
- The only block is `energize [magnet] to [boost | drop]`.
- Mounting height matters: too high and it cannot reach a disk. The "Code Base 2.0 – Eye + Electromagnet" build mounts it close to the floor between the forks of a Yellow Angle Beam that centre the disk.
- Code Base convention: port 3.

Sources: https://www.vexrobotics.com/269-6702.html , https://kb.vex.com/hc/en-us/articles/360049218172-Coding-with-the-VEX-GO-Electromagnet , https://api.vex.com/go/home/blocks/magnet.html , https://plc.pd.vex.com/t/electromagnet-issues/447

## Cables and connectors

- **Smart Port plug = 4P4C** modular connector, the same connector family as V5/EXP Smart Cables (VEX staff). GO device cables are **captive**: you cannot swap lengths like IQ Smart Cables. A broken clip can in principle be re-crimped with the V5 crimp tool (276-5773) and connectors (276-5775), but VEX's supported path is a replacement device.
- The Eye Sensor cable is a different, blue-green captive cable into its own port. Pin count: **not published**.
- The Battery connector type is **not published**.
- Whether GO devices work on an IQ brain (or IQ devices on a GO brain) is **not documented** by VEX. Treat them as separate ecosystems.

Sources: https://plc.pd.vex.com/t/tool-for-fixing-broken-wire-port-clip/452 , https://www.vexrobotics.com/v5-smart-cables.html

## Default port map (Code Base)

VEX Library, "Configuring a VEX GO Code Base":

| Port | Device |
|---|---|
| 1 | Right drive motor |
| 2 | LED Bumper |
| 3 | Electromagnet |
| 4 | Left drive motor |
| Eye port | Eye Sensor |

Left and right are judged standing behind the robot looking forward. Robot Arm preset: Arm Motor port 1, Electromagnet port 3, Base Motor port 4. Competition Advanced hero robot: extra arm motor on port 2, set to reverse.

Note for this codebase: port numbers are 0-based in code (bumper 1, magnet 2), and the drivetrain preset byte sent to the brain treats ports 1 and 4 as a pair ([02 §6](02-bluetooth-protocol.md)). The Python `go` module passes port indices 0 and 3 as left and right respectively ([04](04-python-api.md)), which is the reverse of the labels in the VEX Library article above. Nothing in this app depends on which physical motor is "left"; the brain's drivetrain commands handle both. Confirm on hardware before relying on the labels.

Sources: https://kb.vex.com/hc/en-us/articles/360047955692-Configuring-a-VEX-GO-Code-Base , https://kb.vex.com/hc/en-us/articles/360047956052-Configuring-a-VEX-GO-Robot-Arm , https://kb.vex.com/hc/en-us/articles/4418400017044

## GO vs IQ vs 123 (don't mix them up)

| | VEX 123 | VEX GO | VEX IQ (2nd gen) |
|---|---|---|---|
| Grades | Pre-K–2 | 3–5 | 5–8 |
| Brain | Built into the 123 Robot (speaker, buttons, eye, line sensor) | 4 Smart Ports + Eye port + Battery port, BLE, IMU, no screen | 12 Smart Ports, LCD screen, buttons, radio |
| Programming | Coder cards, VEXcode 123 | VEXcode GO (Blocks / Switch / Python), Bluetooth only | VEXcode IQ, USB or wireless |
| Motor | Internal | GO Smart Motor (specs not published) | IQ Smart Motor: 120 rpm, 0.414 N·m |
| Sensors | Built in | Eye, LED Bumper, Electromagnet, Brain IMU | Distance, Colour/Optical, Gyro, Touch LED, Bumper, AI Vision |
| Cables | None | Captive 4P4C | Removable Smart Cables |
| Cross-over | — | IQ gen2 / EXP / One Stick controllers pair to a GO brain; structural parts share IQ moulds ([12](12-vex-go-structural-parts.md)) | — |

Sources: https://kb.vex.com/hc/en-us/articles/360056489091-Identifying-the-123-Robot-s-Features , https://kb.vex.com/hc/en-us/articles/7267344764308-Understanding-IQ-1st-Generation-vs-2nd-Generation , https://kb.vex.com/hc/en-us/articles/18113746616724-Understanding-IQ-Smart-Motor-Performance

## Not published by VEX (as of 2026-11-03)

1. Smart Motor free speed, stall torque, encoder resolution, internal gearing, voltage, weight, size.
2. Battery capacity, nominal voltage, run time in hours, connector type.
3. Brain dimensions, weight, processor, Bluetooth version.
4. Electromagnet holding force.
5. Eye Sensor cable pin count.
6. Charging Hub SKU.
7. A firmware changelog for GO.
