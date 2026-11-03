# 15 — The VEX GO ecosystem: software, curriculum, competition

Everything around the hardware: where GO sits in VEX's line-up, what VEXcode GO offers and calls things, how the official curriculum is organised, the competition, safety, warranty and where to buy parts. Hardware is in [11](11-vex-go-electronics.md)–[13](13-vex-go-kits-and-builds.md); definitions are in [14](14-vex-go-glossary.md).

Research date: 2026-11-03. The VEX Library (kb.vex.com), vexrobotics.com and education.vex.com refuse automated reads, so facts from those sites were confirmed through search excerpts of the named article unless stated. api.vex.com was read in full.

## 1. VEX GO in the VEX Continuum

VEX GO launched on 28 September 2020 as the elementary construction-and-coding platform. Official audience: **Grades 3–5, ages 8+** (UK marketing: Key Stage 2, ages 7–11). VEX's "Continuum" is a K–12 progression of eight platforms:

| Platform | Grades |
|---|---|
| VEX 123 | Pre-K–2 |
| **VEX GO** | **3–5** |
| VEX AIM | 4–12 |
| VEX IQ | 5–8 |
| VEX EXP | 8–12 |
| VEX V5 | 9–college |
| VEX CTE | 9–college |
| VEX AIR | drone platform |

Sources: https://www.prnewswire.com/news-releases/vex-robotics-introduces-vex-go-to-inspire-elementary-students-through-robots-stem-and-coding-301139146.html , https://kb.vex.com/hc/en-us/articles/4402854523668-The-VEX-Continuum , https://education.vex.com/stemlabs/go

## 2. VEXcode GO

**Platforms.** Web app at codego.vex.com (Chrome 100+ or Edge; Chromebook, Mac, Windows; needs Bluetooth 4.1+). Native apps for iPad (iOS 16+), Android 9+ / Fire OS 7+ (7-inch screen or larger), Windows 10+ and macOS. The old Chromebook Chrome App is deprecated in favour of the web app. How the app really works (blocks → Python in the browser → Bluetooth, no compiler) is in [01](01-how-vexcode-go-works.md).

**Coding modes.** Blocks, **Switch** blocks (a block converted to an editable text box containing its Python), and **Python** text projects (added in VEXcode 4.60, 2025). VEXcode 4.0 introduced the offline Mac/Windows apps. Recent versions: 4.61 (Sep 2025), 4.62 (Oct 2025). The next generation, **VEXcode 5** at code.vex.com, consolidates GO build configurations into templates and redesigns the Drive tab with keyboard driving.

**Toolbar and panels, in VEX's words:**

| Item | What it is |
|---|---|
| Brain icon | Opens the list of detected brains; green when connected, orange while searching. VEX says "connect" for brains and "pair" for controllers |
| Start / Stop | Runs and halts the project. There is no Download step for GO |
| Step | Runs one block at a time; Start finishes at full speed |
| Devices | "Add a device": CODE BASE template, or Drivetrain, Motor, LED Bumper, Electromagnet, Eye Sensor one at a time. Up to four Smart Port devices plus one Eye Sensor. Robot Arm and Super Car configurations are documented too |
| Drive tab | Remote-control mode with on-screen joysticks (Tank, Left Arcade, Right Arcade, Split Arcade), buttons for port 2 (LED Bumper or motor) and port 3 (Electromagnet or motor), and live velocity, heading and rotation |
| Monitor | Opens the Print Console (output of `print`, saveable as text) and the Monitor Console (drag sensing or variable blocks in to watch live values) |
| Help | Explains the selected block |
| Tutorials | 21 short videos (Navigating VEXcode, Connecting to Your Robot, Configuring Your Robot Build, Understanding the Drive Tab, Creating a My Block, Stepping Through Blocks, Detecting Colors, Using the Electromagnet, …) |
| Examples | File → Open Examples, filterable by category |
| Toolbox | The block palette, grouped by device since 4.60, with high-contrast colours by default and an option for "Classic VEXcode colors" |

Sources: https://www.vexrobotics.com/vexcode/install/go , https://kb.vex.com/hc/en-us/articles/40258869082260 (VEXcode 4.60), https://kb.vex.com/hc/en-us/articles/30950482763668-New-Features-in-VEXcode-GO-4-0 , https://kb.vex.com/hc/en-us/articles/48259643574804-What-s-New-in-VEXcode-5 , https://kb.vex.com/hc/en-us/articles/360049495572-Using-the-Drive-Tab-in-VEXcode-GO , https://kb.vex.com/hc/en-us/articles/360049350172 , https://kb.vex.com/hc/en-us/articles/360050529712 , https://api.vex.com/go/home/vexcode_tutorials/index.html

## 3. Block categories

VEX does not publish category colour names; blocks are identified by "shape, colour and label". Shapes: hat, stack, boolean, reporter, C. Device categories appear only after the device is configured. The byte each block sends is in [03](03-block-reference.md).

| Category | Blocks |
|---|---|
| Drivetrain | drive, drive for (mm/inches, optional "and don't wait"), drive until object/crash, turn, turn for, turn to heading, turn to rotation, stop driving, set drive/turn velocity, set drive stopping, set drive timeout, set drive heading/rotation; reporters drive is done?, heading, rotation, velocity |
| Motion (motor) | spin, spin for (degrees/turns), spin to position, stop motor, set position/velocity/stopping/max torque/timeout; reporters is done?, is spinning?, position, velocity, current |
| Eye Sensor | set eye light, set eye range near/far, set eye light power; found an object?, detects colour?, brightness, hue |
| Magnet | energize to boost/drop |
| LED Bumper | set bumper colour (red/green/off), set bumper brightness; pressed? |
| Inertial | calibrate gyro, set heading, set rotation; heading, rotation, detected crash?, acceleration of axis |
| Console (formerly Looks) | print, set print precision, clear all rows, next row, set font colour, ask and wait, answer |
| Logic › Control | wait, wait until, repeat, forever, repeat until, while, if, if/else, if/else-if/else, break, stop project |
| Logic › Events | when started, when I receive, broadcast, broadcast and wait |
| Logic › Timer | reset timer, timer in seconds, when timer > |
| Logic › Operators | arithmetic, comparison, and/or/not, range, pick random, round, maths functions, remainder, join, letter of, length of, contains?, convert to text/number |
| Logic › Variables | numeric and boolean variables, lists, 2D lists |
| Logic › My Blocks | define block (with parameters), call |
| Logic › Comments | comment |

There is no Sound category: the GO Brain has no speaker. The older "Sensing" category is now split by device.

**Blocks vs Python.** Every device block has a Python equivalent. Python-only: yaw/roll/pitch getters, timer and broadcast event objects, threads, `monitor_sensor`, the `math` and `random` modules, `elif`, `for … in range`. Blocks-only: the range operator, 2D-list blocks, ask-and-wait, the "when timer" hat. The Python module itself is dissected in [04](04-python-api.md); the public API reference is https://api.vex.com/go/home/python/index.html .

Sources: https://api.vex.com/go/home/blocks/index.html and the per-category pages under it, https://kb.vex.com/hc/en-us/articles/360048212231-Understanding-Block-Shapes-in-VEXcode-GO

## 4. Robot configuration

- **Code Base template:** right motor port 1, LED Bumper port 2, Electromagnet port 3, left motor port 4, Eye Sensor in the Eye port. Drivetrain and Sensing blocks appear only after a drivetrain or sensor is configured; one build per project.
- **Robot Arm:** Arm Motor port 1, Electromagnet port 3, Base Motor port 4, Eye in the Eye port.
- **Custom robot:** choose ports for a drivetrain (left, right), a gear ratio and a preferred drive direction; rename and reverse motors. There are no wheel-travel or track-width fields for GO (unlike IQ/V5); wheel travel is fixed at 160 mm per revolution ([13](13-vex-go-kits-and-builds.md)).
- **Defaults:** drive and turn velocity 50 %, motor velocity and torque 50 %, stopping brake, distance in mm, timeouts in seconds. Headings −359…359 take the shortest direction.
- Names used in VEX examples: `drivetrain`, `motor` (or e.g. `ArmMotor`), `eye`, `bumper`, `magnet`, `brain_inertial`.

Sources: https://kb.vex.com/hc/en-us/articles/360047955692-Configuring-a-VEX-GO-Code-Base , https://kb.vex.com/hc/en-us/articles/360051724671-Configuring-a-Custom-Robot-in-VEXcode-GO , https://kb.vex.com/hc/en-us/articles/360047956052-Configuring-a-VEX-GO-Robot-Arm , https://api.vex.com/go/home/blocks/drivetrain.html

## 5. STEM Labs (the curriculum)

Free teacher-facing lessons at education.vex.com/stemlabs/go, organised as **Units** of **Labs**. Each unit has a Unit Overview (with Background Information and "Applying VEX GO"), a Teacher Portal, Pacing Guides (cumulative and 1:1), standards alignment and a **Choice Board** of nine independent activities. Each Lab has three sections:

1. **Engage** — teacher-led introduction, scripted as Acts & Asks (Instruct, Model, Facilitate, Remind, Ask).
2. **Play** — Part 1 and Part 2, often with a Mid-Play Break.
3. **Share** — optional reflection, a few minutes per group.

Engage plus Play fit in about 40 minutes. Units (24 at the time of writing): Intro to Building; Physical Science; Mars Rover – Surface Operations; Mars Rover – Landing Challenge; Mars Rover – Exploring Mars Geology; Simple Machines; Fractions; Pendulum Game; Fun Frogs; Code Base; Battle Boats; Look Alike; Parade Float; Robot Jobs; Super Car; Ocean Emergency; Helping Hand; Magnet Car; Pantograph; Robot Arm; Mars Math Expedition; Ocean Science Exploration; Village Engineering Construction; City Technology Rebuild. Shorter Activities and Activity Series sit alongside the units.

Other official resources:

- **VEX Classroom app** for managing brains ([11](11-vex-go-electronics.md)).
- **VEX PD+** (pd.vex.com): the free self-paced VEX GO Educator Certification course with an exam, a certificate with training hours, and entry to the GO professional learning community (plc.pd.vex.com).
- **VEX Library** (kb.vex.com, shortcut library.vex.com): the knowledge base. Other shortcuts: go.vex.com, codeGO.vex.com, builds.vex.com, parts.vex.com, educators.vex.com, support.vex.com.
- **VEX GO Leaderboard** (education.vex.com/leaderboard): scoreboard and timer for classroom competitions.
- **GO Educators Start Here** page: https://kb.vex.com/hc/en-us/articles/9834502626196 .

Sources: https://education.vex.com/stemlabs/go , https://kb.vex.com/hc/en-us/articles/360049787331-Implementing-VEX-GO-STEM-Labs , https://kb.vex.com/hc/en-us/articles/360047905012 , https://kb.vex.com/hc/en-us/articles/10655651357076-VEX-GO-STEM-Lab-Unit-Concepts , https://kb.vex.com/hc/en-us/articles/17129411070100 , https://kb.vex.com/hc/en-us/articles/4403240592276-VEX-Website-Shortcuts , https://kb.vex.com/hc/en-us/articles/6982036947604

## 6. The VEX GO Competition

- Official name: **VEX GO Competition** (REC Foundation abbreviation **VGOC**). Launched September 2022 with the Competition Kit. For grades 3+ (ages 8+); meant to be run in a classroom, gym or after-school club. The REC Foundation runs free "VEX GO Classroom Challenges" and a VGOC library at vgoc.recf.org; there is no evidence of sanctioned tournaments or a world championship for GO.
- **No yearly game.** Four fixed **Missions**, each with four **Stages** that add tasks and grow the field: Mars Math Expedition, Ocean Science Exploration, Village Engineering Construction, City Technology Rebuild. Each Mission is also a STEM Lab unit. VEX suggests beginners start with Mars.
- **Field:** built from the Competition Kit's snap-together tiles and walls, about 3 ft 1 in × 6 ft 1 in, separable into smaller fields.
- **Teams and matches:** typically 4–6 students per team, one kit per 2–4 students. Formats: Solo Driving (one robot, 2 min), Solo Coding (one robot, 1 min), Coop Driving (two robots, 1 min). Driving uses the VEXcode GO Drive tab or a paired controller.
- **Rules:** one battery, VEX GO parts only, a licence plate (Name Plate) with team name and number. Each team's official score is its best match; ties go to the faster time; most tasks score 1 point.
- **Hero Robots:** Competition Base 2.0, Competition Base + Claw 2.0, Competition Advanced 2.0 ([13](13-vex-go-kits-and-builds.md)).
- **VEXcode VR:** one premium playground, "GO Competition – Mars Math Expedition", with a virtual Competition Advanced 2.0 robot. No VR playground for the other Missions or for a plain Code Base.

Sources: https://kb.vex.com/hc/en-us/articles/4418405983252-Introduction-to-the-VEX-GO-Competition , https://kb.vex.com/hc/en-us/articles/4418400128276 , https://kb.vex.com/hc/en-us/articles/4418371965716-Running-a-VEX-GO-Competition , https://kb.vex.com/hc/en-us/articles/4418399858708-Rules-and-Scoring-for-VEX-GO-Competitions , https://kb.vex.com/hc/en-us/articles/4418400075924 , https://news.vex.com/2022/10/11/vex-monthly-newsletter-september-2022/ , https://api.vex.com/vr/home/playgrounds/go_competition.html , https://kb.roboticseducation.org/hc/en-us/articles/34050640836887-Acronyms-to-Know

## 7. Safety, warranty, buying parts

- **Safety:** VEX's precautions article for GO and IQ covers pinch points (tie back hair, power off before handling moving parts), falling objects, and electrical care (do not bridge battery terminals; inspect for cracked or frayed cables). Rubber bands call for adult supervision. No official small-parts or choking-hazard wording for GO was found; the official age statement is 8+. For a four-year-old using this app, that means an adult handles the kit.
- **Warranty:** VEX limited warranty, one year from shipment against defects in materials and workmanship, non-transferable. **VEXcare** extended plans (1 or 2 years, electronics only) must be bought with the product.
- **Buying:** every electronic part, the field tile and walls, the Pin Tool and the four Parts Packs are sold individually on vexrobotics.com; outside the US through regional distributors. SKUs are listed in [11](11-vex-go-electronics.md) and [12](12-vex-go-structural-parts.md).
- **Spec sheets:** VEX publishes no datasheet for GO electronics (motor speed and torque, battery capacity are not stated anywhere official).

Sources: https://kb.vex.com/hc/en-us/articles/360053670271 , https://kb.vex.com/hc/en-us/articles/360039794451-Warranty-Policy , https://www.vexrobotics.com/vexcare

## 8. Not verified

1. Block category colour names (not published).
2. Competition team size, tile size and field size (search excerpts only).
3. Whether VEXcode GO lists Code Base 2.0 as a separate template today.
4. Official choking-hazard labelling for GO.
