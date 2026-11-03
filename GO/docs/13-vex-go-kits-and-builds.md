# 13 — VEX GO kits, bundles and standard builds

Which products exist, what is in them, and the named robots VEX publishes instructions for, including the Code Base geometry that this app's simulator and distance maths rely on. Parts are described in [11](11-vex-go-electronics.md) (electronics) and [12](12-vex-go-structural-parts.md) (structure).

Research date: 2026-11-03. Prices are US list prices seen in search excerpts and change; they are given only for scale.

## 1. Kits and bundles

| Product | SKU | What you get |
|---|---|---|
| **VEX GO Kit** | 269-6911 (kit family number; the bare-kit SKU could not be confirmed) | All construction and electronic parts, Pin Tool, USB-C cable, one Field Tile |
| **VEX GO Kit with Storage** ("Education Kit") | 269-6705 | Same parts pre-sorted in 2 bins with moulded trays and Part Locator Sheets. About US$225. Weight 2.7 kg |
| **Small Classroom Bundle** (5 kits, 10 students) | 269-7781 (current); 269-7778 and 269-6783 on other regional listings | 5 Kits with Storage, 12 Field Walls, 5 extra Pin Tools, kit bag, field bag, spare-parts bin (Packs A, B, C), 1 five-battery Charging Hub with AC adapter, poster |
| **Classroom Bundle** (10 kits, 20 students) | 269-7780 (also listed as 269-7777) | 10 Kits with Storage, 24 Field Walls, 10 Pin Tools, 2 spare-parts bins, 2 Charging Hubs, 2 posters, bags. About US$2,750 |
| **Large Classroom Bundle** (15 kits, 30 students) | 269-7782 (also 269-7779) | 15 kits, 36 walls, 15 Pin Tools, 3 spare bins, 3 chargers, 3 posters, cases. About US$4,000 |
| **VEX GO Competition Kit** (field) | 269-8115 | Field Element Kit for all four Missions, 14 Field Tiles + 1 green + 1 red tile, 22 Field Walls, 2 carrying cases. **No robot.** About US$320 |
| GO Field Tile (spare) | 269-7149 | One tile |
| GO Field Walls | 269-7377 | 4-pack |
| GO Parts Packs A–D | 269-7143 … 269-7146 | Replacement structure ([12 §3](12-vex-go-structural-parts.md)) |
| GO Classroom Cart | 254-8380 | |
| USB Charging Bundle (4-port, 48 W) | 228-8808 | |

Every kit has the same electronics: 1 Brain, 1 Battery, 1 Switch, 3 Smart Motors, 1 Eye Sensor, 1 LED Bumper, 1 Electromagnet. VEX's ratio guidance is one kit per two students, and one kit per 2–4 students plus one Competition Kit for the competition.

Products that do **not** exist for GO, despite what some searches suggest: "Kit Plus", "Kit Plus Expansion", "STEM Lab bundles", an "Adaptation Kit" (Adaptation Claw is a build), a "Field Kit" separate from the Competition Kit. Nothing new was announced for GO in 2024–2026 apart from the Code Base 2.0 build and One Stick Controller support. "Code Base", "Super Code Base" and "Code Base Plus" are build names, not kits.

Sources: https://www.vexrobotics.com/go-kits.html , https://www.vexrobotics.com/go-bundles.html , https://www.vexrobotics.com/parts/269-6911 , https://www.vexrobotics.com/269-8115.html , https://kb.vex.com/hc/en-us/articles/360050305691-Setting-Up-STEM-with-VEX-GO , https://kb.vex.com/hc/en-us/articles/360049147252-Get-Started-with-a-GO-Classroom-Bundle , https://docs.rs-online.com/6ffe/A700000007193236.pdf , https://idesign365.com/brand/vex-go/ , https://mangologic.org/vex-go , https://nooby.tech/en/shop/1207-vex-go-large-classroom-bundle-15-kits.html

## 2. Where the builds live

builds.vex.com (vexrobotics.com/go/downloads/build-instructions) lists more than 42 builds. Each has a PDF at content.vexrobotics.com/vexgo/pdf/builds/… with a parts inventory followed by wordless step pictures, and a 3D viewer on instructions.online. VEX groups builds in three tiers:

1. Construction only (Unpowered Super Car).
2. Powered by a motor and the Switch, no code (Motorized Super Car, Spirograph).
3. Powered and coded through the Brain (Code Base, Robot Arm).

Source: https://kb.vex.com/hc/en-us/articles/8244059873940-Progression-of-Building-for-VEX-GO

## 3. Build catalogue

| Family | Builds |
|---|---|
| Code Base | Code Base (original, 4 wheels); **Code Base 2.0** (Nov 2024, 3 wheels); Code Base – Eye Forward; Code Base 2.0 – Eye + Electromagnet; Super Code Base (all sensors fitted) |
| Super Car | Unpowered Super Car, Super Car, Motorized Super Car, Steering Super Car, Code Super Car |
| Robot Arm | Robot Arm (manual), Motorized Robot Arm, Code Robot Arm 1-Axis, Robot Arm 2-Axis |
| Simple Machines unit | Inclined Plane, Lever, Spring Car (wheel and axle), Clock (gears) |
| Other STEM Lab builds | Adaptation Claw, Pendulum, Pantograph, Magnet Car, Slingshot Car, Spirograph, Crawler / Ed / Flopper, Ladder, Raft, Mobile Rescue Vehicle, Topo Map, Fractions build, Battle Boats, Day & Night model, Frog Life Cycle, Parade Float |
| Competition "Hero Robots" | Competition Base 2.0, Competition Base + Claw 2.0, Competition Advanced 2.0 (adds an arm on a third motor; can do every competition task) |

Sources: https://education.vex.com/stemlabs/go , https://kb.vex.com/hc/en-us/articles/4418400017044-Building-a-Robot-for-the-VEX-GO-Competition

## 4. The Code Base in detail

The Code Base is the default coding robot and the one this app's pretend robot imitates.

**Bill of materials (original Code Base, VEX PDF 269-6913-100 Rev 3, 23 steps):** 2 Dark Gray Large Plate, 2 Dark Gray Large Beam, 4 Yellow Connector, 4 Blue Connector, 2 Smart Motor, 2 Red Shaft, 2 Shaft Collar, 2 Gray Wheel, 2 Blue Wheel, about 28 Red Pins, 1 Battery, 1 Brain. Each motor drives a Gray Wheel directly on a Red Shaft, so the motor-to-wheel ratio is **1:1**. The Blue Wheels are free idlers on Red Pins.

**Geometry (official VEX numbers from the Parade Float math-support page):**

| Quantity | Value |
|---|---|
| Drive wheel diameter | about 50.93 mm (2 in) |
| Distance per wheel revolution | about 160 mm (6.25 in) |
| Motor-to-wheel ratio | 1:1 |
| Track width (wheel centre to wheel centre) | about 135 mm (5.3 in) |
| Turning circumference | about 424 mm (16.7 in) |
| Wheel turns for a 360° spin | about 2.65 (180° = about 1.47) |

Wheelbase is not published and does not apply to the three-wheel 2.0. One search excerpt quoted "83.2 mm per revolution" with no source; it contradicts VEX and should be ignored. VEXcode GO itself does not expose wheel travel or track width in its device panel (only gear ratio and drive direction), which is consistent with the fixed 160 mm/rev conversion in VEXcode's Python module ([04](04-python-api.md)) and in this app.

**Code Base 2.0** (announced 1 Nov 2024): two powered wheels plus one free caster; quicker to build, easier to charge, drives straighter and turns more accurately. VEXcode configures it as a drivetrain rather than two individual motors, and VEX says the original Code Base is "not recommended for new builds". The PDF is image-only, so its caster type, parts list and track width are **unverified**.

**Port map in VEXcode GO** (Devices → Add a device → CODE BASE): right motor port 1, LED Bumper port 2, Electromagnet port 3, left motor port 4, Eye Sensor in the Eye port. Left and right are judged from behind the robot. Drivetrain and Sensing blocks only appear once a drivetrain or sensor is configured; one build per project. See the port-numbering note in [11](11-vex-go-electronics.md).

**Robot Arm preset:** Arm Motor port 1, Electromagnet port 3, Base Motor port 4, Eye in the Eye port. The brain-side preset codes for these builds are in [02 §6](02-bluetooth-protocol.md).

**Super Car (PDF 269-6911-100 Rev 6):** 2 Black Large Beam, 2 Orange Connector, 3 Red Square Beam, 2 Blue Gear, 1 Red Gear, 2 Red Shaft, 2 Green Shaft, 1 Gray Wheel, 2 Blue Wheel, 1 Hand Knob, 1 Rubber Band, 3 Orange + 2 Blue Standoff, 2 Shaft Collar, spacers, pins. The Blue 24-tooth gear drives the Red 8-tooth gear on the Gray Wheel shaft (3× speed-up).

Sources: https://education.vex.com/stemlabs/sites/default/files/inline-files/BI%20Code%20Base.pdf , https://education.vex.com/stemlabs/sites/default/files/inline-files/BI%20Super%20Car.pdf , https://education.vex.com/stemlabs/go/parade-float/unit-overview/math-support , https://kb.vex.com/hc/en-us/articles/360047955692-Configuring-a-VEX-GO-Code-Base , https://kb.vex.com/hc/en-us/articles/360047956052-Configuring-a-VEX-GO-Robot-Arm , https://kb.vex.com/hc/en-us/articles/360051724671-Configuring-a-Custom-Robot-in-VEXcode-GO , https://kb.vex.com/hc/en-us/articles/32481684303892-Code-Base-2-0-Features-and-Improvements , https://plc.pd.vex.com/t/code-base-2-0/1593 , https://content.vexrobotics.com/vexgo/pdf/builds/code_base_2/Code_Base_2.0.pdf

## 5. What this app assumes

- Wheel travel 160 mm per revolution (`MM_TO_DEG` in `app/js/robot.js`, matching VEXcode).
- One "step" piece = 150 mm, and the challenge boards treat one step as one square ([10](10-challenge-mode.md)).
- Code Base preset: drivetrain on ports 1 and 4, bumper on port 2, magnet on port 3, eye on the Eye port.
- Turns are done by the brain's own heading control, so track width never enters the app's maths; it only matters for the simulator's drawing.

## 6. Not verified

1. The SKU of the bare GO Kit without storage.
2. Which Classroom Bundle SKU series (269-777x vs 269-778x) applies in which region.
3. Code Base 2.0 parts list, caster type and geometry.
4. Field tile dimensions and the competition field size (one excerpt: 3 ft 1 in × 6 ft 1 in).
