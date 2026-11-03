# 12 — VEX GO structural and mechanical parts

Every non-electronic part in a VEX GO kit: how the construction system works, what each part family is called, what it is for, how many come in a kit, and the part numbers used by replacement packs. Electronics are in [11](11-vex-go-electronics.md); kits, bundles and named builds are in [13](13-vex-go-kits-and-builds.md).

Sources: VEX Library articles on building with GO (cited per section), the official build-instruction PDFs on education.vex.com, and authorised resellers for part numbers and per-kit quantities where vexrobotics.com could not be read. Research date: 2026-11-03. Reseller-only data is marked as such.

## 1. The construction system

**Same system as VEX IQ.** GO parts are VEX IQ plastic-construction moulds in GO colours. The IQ system is a tool-less, snap-together grid:

- Hole spacing (**pitch**) is 12.7 mm (0.5 in). Beams and plates are named by hole count (a 2x6 beam is 2 holes wide and 6 long).
- One plastic thickness is 6.35 mm (0.25 in). Pins are sized by how many thicknesses each peg spans (a 1x2 pin spans one beam on one side and two on the other).
- 2-wide beams and plates have a centre row of holes offset by half a pitch.
- Gears are sized by tooth count, pulleys by diameter in mm, tyres by rolling circumference.
- Square metal shafts are the IQ 3.18 mm (1/8 in) square; GO does not state this separately, but GO shafts fit the same motor and gear sockets.

Reseller listings show every GO structural part with an IQ-style part number `228-<colour code>-<IQ part index>`, for example Red Beam 228-3445-001 and Gray Wheel 228-6911-1383. The middle group is the colour and the last group identifies the IQ mould.

**Colour means size, inside a family.** Each part type has its own colour so that look-alike parts are unambiguous in wordless build instructions, and "parts of the same colour are the same size": a Yellow Beam is always shorter than a Blue Beam, and two Dark Gray Large Beams always match. Colour does *not* carry meaning across families: a Red Pin, a Red Gear and a Red Beam are unrelated.

**Square or round: the rule for motion.** Every peg, hole and shaft is either square or round:

| Combination | Result |
|---|---|
| Square peg/shaft in a square hole | Driven: the part turns with the shaft |
| Round peg in a round hole | Free spin (pivot) |
| Square peg/shaft in a round hole | Free spin |
| Round peg in a square hole | Does not fit |

Parts with square pegs or shafts: Gray Pin, Red Shaft, Green Shaft, Capped Shaft, Plain Shaft. Parts with square holes: Smart Motor, Knob, Gray Wheel, Red/Green/Blue Gear, Green/Orange Pulley, Red Square Beam, Blue Thin Beam. One pin between two parts makes a hinge; two or more make a rigid joint.

**Pins vs IQ pins.** A VEX Forum thread reports that GO pins are hexagonal in section (so they are visually distinct from IQ pins) and deliberately easier to pull out. **Unverified**: the thread could not be read directly, and no VEX page discusses GO/IQ interchangeability.

Sources: https://kb.vex.com/hc/en-us/articles/360035592872-Understanding-the-VEX-IQ-Plastic-Construction-System , https://kb.vex.com/hc/en-us/articles/360049869692-Key-Ideas-for-Building-with-VEX-GO , https://kb.vex.com/hc/en-us/articles/4402855251348-Using-the-Printable-VEX-GO-Parts-Ruler , https://www.vexforum.com/t/is-vex-go-parts-legal-on-vex-iq-robots/83165

## 2. Part families

Quantities are per single GO Kit (reseller itemisation of the official "GO Kit Contents" page). Part numbers come from the Parts Pack listings. Exact pitch lengths of each coloured beam are **not published** on any page that could be read; the suffix of the part number gives the length order.

### 2.1 Beams (1 hole wide)

Ten lengths, identified by colour, each with a centre hole. Shortest to longest:

| Beam | Qty | Part no. |
|---|---|---|
| Red Beam | 5 | 228-3445-001 |
| Green Beam | 9 | 228-5579-002 |
| Yellow Beam | 5 | 228-3449-003 |
| Blue Beam | 2 | 228-5587-004 |
| Orange Beam | 6 | 228-3446-005 |
| Pink Beam | 2 | 228-5591-006 |
| Dark Gray Beam | 2 | 228-3616-007 |
| White Beam | 2 | 228-3943-009 |
| Black Beam | 2 | 228-3201-011 |
| Gray Beam | 2 | 228-5573-013 |

### 2.2 Angle Beams

| Angle Beam | Angle | Qty | Part no. |
|---|---|---|---|
| Yellow | 45° | 4 | 228-3449-148 |
| Red | 60° at each end | 2 | 228-3445-1199 |
| Green | 90°, small | 3 | 228-5579-145 |
| Orange | 90°, larger | 2 | 228-3446-150 |

Uses: the Crawler's mouth (Red), centring the Eye Sensor on the Robot Arm (Yellow + standoffs), the disk-centring forks under an Electromagnet (Yellow).

### 2.3 Large Beams (2 holes wide)

Two outer rows plus a half-offset centre row. Nine lengths by colour:

| Large Beam | Qty | Part no. | Note |
|---|---|---|---|
| Green | 4 | 228-5579-018 | shortest |
| Yellow | 3 | 228-3449-019 | |
| Blue | 2 | 228-5587-020 | |
| Orange | 3 | 228-3446-021 | 2x6 (from the Parts Ruler article) |
| Dark Gray | 2 | 228-3616-023 | Code Base chassis sides |
| White | 3 | 228-3943-025 | |
| Black | 3 | 228-3201-026 | Super Car sides |
| Gray | 2 | 228-5573-027 | longest |
| Red Square Beam | 6 | 228-3445-1140 | 2x2 with a **square** centre hole; turns with a shaft or square pin |

### 2.4 Plates (3 and 4 holes wide)

Same hole pattern as Large Beams, five lengths by colour. Which colours are 3-wide and which 4-wide is **not published**.

| Plate | Qty | Part no. |
|---|---|---|
| White Plate | 2 | 228-3943-031 |
| Black Plate | 2 | 228-3201-032 |
| Gray Plate | 2 | 228-5573-035 |
| White Large Plate | 2 | 228-3943-042 |
| Dark Gray Large Plate | 3 | 228-3616-043 |

Two Dark Gray Large Plates are the Code Base chassis; two Dark Gray Plates are the Robot Arm sides.

### 2.5 Specialty beams

- **Blue Thin Beam** (2, 228-5587-?): six round holes plus one **square** end hole, thinner than a beam. The Clock's hand.
- **Pink Slotted Beam** (4 per reseller list; one excerpt of the VEX page says 1, **unverified**; 228-5591-157): two holes and a slot that captures a rubber band or rope; also the Frog's feet.
- **Name Plate** (2, white, 228-3943-524): four holes, writable with dry-erase marker; the Competition Base carries one at the rear as its licence plate.
- **Gray Slide Beam** and **Gray Slide Block** (2 + 2, 228-5573-1456 / -1469): the block slides along the beam for linear motion. This is the "sled" that carries the magnet on the Robot Arm.

### 2.6 Pins

| Pin | Qty | What it is |
|---|---|---|
| Red Pin | 53 | The standard 1x1 connector: two round pegs with a flange between them |
| Green Pin | 7 | 1x2: one peg twice as long, joins three layers |
| Pink Pin ("capped pin") | 5 | A cap, a round section, then a **square** peg; no flange. Through a beam's round hole into a gear's square hole the gear spins freely. Fits tight gear stacks |
| Gray Pin | 2 | Square peg + flange + round section + square peg. Goes into a motor or knob socket, through a beam, and drives a wheel or gear on the far side |

Flanges stop a pin at one plastic thickness; caps (Pink Pin, Capped Shaft) stop the part passing through at all.

### 2.7 Standoffs

Round peg at each end with a spacer between, for connecting parallel parts with a gap.

| Standoff | Gap | Qty |
|---|---|---|
| Yellow | one thickness (6.35 mm, "0.5x pitch") | 7 |
| Blue | two thicknesses (12.7 mm) | 8 |
| Orange | four thicknesses (25.4 mm) | 5 |

### 2.8 Connectors (corner and parallel)

All round holes and round pegs.

| Connector | Shape | Qty | Part no. |
|---|---|---|---|
| Red Connector | 90°, 1 peg + 1 hole (can rotate) | 9 | — |
| Yellow Connector | 90°, 5 holes + 2 pegs | 8 | 228-3449-2295 |
| Blue Connector | 90°, 6 holes + 2 pegs (one leg longer than Yellow) | 5 | 228-5587-2296 |
| Green Connector | Parallel, 2 pegs each side, 2 holes between | 4 | 228-5579-2308 |
| Orange Connector | Parallel, 2 pegs each side, 7 holes between | 3 | 228-3446-277 |

Yellow and Blue Connectors join the Code Base plates to its side beams; Orange Connectors space the Super Car's Black Large Beams.

### 2.9 Spacers and shaft collars

- **Spacer** (8): plain ring, adds clearance between parts or acts as a collar on a shaft.
- **Shaft Collar** (6): rubber collar pushed onto a shaft to stop it sliding out of a hole or a wheel sliding off. Needed with Red, Green and Plain shafts. Warm in the hand to fit.

### 2.10 Shafts (axles)

Square metal rods that fit the Smart Motor socket and every square hub.

| Shaft | Qty | Part no. | Note |
|---|---|---|---|
| Red Shaft | 4 | — | Plastic flange stops it sliding through a beam; Code Base drive axle |
| Green Shaft | 4 | — | Longer, same flange |
| Plain Shaft | 2 | 228-2500-124 | No flange |
| Capped Shaft | 2 | — | Cap on one end holds it in place; no flange, for tight gear stacks |

Lengths by colour are **not published** (the Parts Ruler gives "2x pitch shaft" as an example only).

### 2.11 Wheels and tyres

| Wheel | Qty | Part no. | Hub | Use |
|---|---|---|---|---|
| Gray Wheel | 2 | 228-6911-1383 | **square** (driven) | Treaded traction wheel, 8 holes; the Code Base drive wheels |
| Blue Wheel | 2 | 228-5587-1384 | round (free) | Smooth, 8 holes; Code Base idlers. Can be pinned to a square-hub part to be driven |
| Tire | 2 | — | — | Rubber ring that fits over a Green Pulley to make a small wheel |

Official Gray Wheel size (VEX Parade Float math support page): diameter about 50.93 mm (2 in), circumference about **160 mm** (6.25 in). This is the 160 mm per revolution that VEXcode and this app use to turn millimetres into motor degrees ([04](04-python-api.md), `app/js/robot.js`). Blue Wheel diameter: **not published**.

More tread = more push and better obstacle climbing but harder turning, which is why the Code Base pairs treaded drive wheels with smooth idlers.

### 2.12 Gears

| Gear | Teeth | Hub | Qty | Part no. |
|---|---|---|---|---|
| Red Gear | 8 | square | 6 | (Parts Pack A) |
| Green Gear | 16 | square | 3 | 228-5579-2181 |
| Blue Gear | 24 | square, 4 holes | 5 | 228-5587-2182 |
| Pink Gear | 24 | **round** (idler), 4 holes | 2 | 228-5591-2191 |

Blue driving Red = 3× speed, ⅓ torque; Red driving Blue = ⅓ speed, 3× torque; meshed gears turn opposite ways. A Pink Pin lets a square-hub gear free-spin on a beam. Gears double as decoration (the Crawler's eyes are Green Gears; there is no dedicated eye part).

### 2.13 Pulleys, ropes, rubber bands

- **Green Pulley** (3, 228-5579-164): small, square hub; also the core of the Tire wheel.
- **Orange Pulley** (2, 228-3446-165): larger, square hub, 4 holes. The ruler article mentions a "30 mm pulley" without saying which.
- **Short Rope** ×2 (12 pitch) and **Long Rope** ×2 (24 pitch): plastic end tabs with mounting holes; flexible links and pulley systems, guided by the Slotted Beam.
- **Rubber Band** ×2 (orange): energy storage (Super Car, Slingshot Car) or a pulley belt.

There are no sprockets, chain, racks or tank treads in the GO line.

### 2.14 Magnets, disks, knob, figure

- **Red North Magnet** and **Black South Magnet** (1 each, 228-3167-020 / -010): permanent magnets on a 4-hole beam. Opposite poles attract; the South Magnet rides the Robot Arm's slide to lift disks.
- **GO Disks**, red, green, blue (1 each): metal-cored so the Electromagnet or the permanent magnets can lift them; the Eye Sensor can sort them by colour; also used as weights. This app calls them pucks in Challenge mode ([10](10-challenge-mode.md)).
- **Orange Knob / Hand Knob** (2, 228-3446-473): square-hub crank for winding the Super Car's rubber band or turning the Clock.
- **Astronaut** figure (1) with sticker sheet; feet pin to any hole.

### 2.15 Tools and field

- **Pin Tool** (1 per kit, SKU 228-4035, shared with IQ): the nose slot pulls a pin, the handle end pushes a pin out, the lever pries flush beams apart. Classroom Bundles include extras.
- **GO Field Tile** (1 per kit, SKU 269-7149) and **GO Field Walls** (4-pack SKU 269-7377): tiles snap together with walls into square, racetrack, zig-zag or U layouts. Tile size: reported as 12 in / 300 mm square in one excerpt, **unverified**.
- **USB A-to-C cable** (1 per kit, SKU 269-6961).

### 2.16 CAD

STEP files for every GO part are a free download from VEX for personal and educational use (commercial 3D printing is prohibited).

Sources for §2: https://kb.vex.com/hc/en-us/articles/360050318772-Using-VEX-GO-Beams-and-Plates , https://kb.vex.com/hc/en-us/articles/360051708531-Using-VEX-GO-Unique-Pieces , https://kb.vex.com/hc/en-us/articles/360050360712-Using-VEX-GO-Pins-Standoffs-and-Connectors , https://kb.vex.com/hc/en-us/articles/360047976292-Pieces-in-the-VEX-GO-Kit , https://kb.vex.com/hc/en-us/articles/360050365272-Using-VEX-GO-Wheels-Gears-and-Pulleys , https://education.vex.com/stemlabs/go/parade-float/unit-overview/math-support , https://kb.vex.com/hc/en-us/articles/360048460151-Using-the-VEX-Pin-Tool , https://kb.vex.com/hc/en-us/articles/360057689112-CAD-Resources-for-VEX-GO , https://kb.vex.com/hc/en-us/articles/360055967272-VEX-GO-Interactive-Parts-Poster ; quantities and part numbers (resellers): https://mangologic.org/en/products/269-6705-vex-go-kit-with-storage , https://idesign365.com/product/vex-go-parts-pack-a/ , https://idesign365.com/product/vex-go-parts-pack-b/ , https://nooby.tech/en/shop/1190-go-parts-pack-c.html , https://nooby.tech/en/shop/1191-go-parts-pack-d.html

## 3. Replacement parts packs

| Pack | SKU | Contents |
|---|---|---|
| Parts Pack A (fasteners, motion) | 269-7143 | 8 Shaft Collar, 10 Spacer, 2 Gray Pin, 2 Rubber Band, 3 Blue Thin Beam, 7 Red Gear, 3 Capped Shaft, 5 Red Shaft, 5 Green Shaft, 6 Pink Pin, 58 Red Pin, 9 Green Pin, 9 Yellow / 9 Blue / 6 Orange Standoff, 10 Red Connector, 2 Tire, 2 Short Rope, 2 Long Rope |
| Parts Pack B (angle beams, pulleys, gears, connectors) | 269-7144 | 3 Green / 4 Yellow / 2 Orange / 2 Red Angle Beam, 5 Pink Slotted Beam, 4 Green / 3 Orange Pulley, 2 Orange Knob, 3 Slide Beam, 3 Slide Block, 4 Green / 5 Blue / 2 Pink Gear, 9 Yellow / 5 Blue / 5 Green / 3 Orange Connector |
| Parts Pack C (coloured beams) | 269-7145 | 6 Red, 10 Green, 5 Yellow, 2 Blue, 6 Orange, 2 Pink, 2 Dark Gray Beam; 4 Green, 3 Yellow, 2 Blue, 3 Orange, 2 Dark Gray Large Beam; 2 Name Plate; 7 Red Square Beam |
| Parts Pack D (greys, plates, wheels, magnets) | 269-7146 | 2 White / 2 Black / 2 Gray Beam; 3 White / 3 Black / 2 Gray Large Beam; 2 White / 2 Black / 2 Gray Plate; 2 White Large Plate; 3 Dark Gray Large Plate; 2 Plain Shaft; 2 Gray Wheel; 2 Blue Wheel; 1 North + 1 South Magnet |

Classroom Bundles ship a spare-parts bin containing Packs A, B and C.

## 4. Storage, poster, ruler

- **Kit with Storage**: two clear-lidded stackable bins with moulded sorted trays and a Part Locator Sheet in each lid. VEX suggests labelling bins and brains with matching names and renaming the brain in the VEX Classroom app.
- **Parts poster** ("VEX GO STEM Starts Early Parts Poster"): ships with every kit, organised by category (pins, standoffs, shafts, gears, pulleys, disks, connectors, wheels, beams, angle beams, large beams, plates, electronics). An interactive version with clickable parts is at parts.vex.com.
- **Printable 1:1 Parts Ruler** (US Letter and A4, print at 100 %): identifies beams and plates by pitch, pulleys in mm, gears by teeth, ropes, pins, angle beams, shafts and collars.
- **Build instructions** are online only (builds.vex.com): a parts inventory followed by wordless step pictures, plus a 3D viewer. See [13](13-vex-go-kits-and-builds.md).

Sources: https://kb.vex.com/hc/en-us/articles/360049144612-Get-Started-with-a-GO-Kit-with-Storage- , https://kb.vex.com/hc/en-us/articles/360055967272-VEX-GO-Interactive-Parts-Poster , https://kb.vex.com/hc/en-us/articles/4402855251348-Using-the-Printable-VEX-GO-Parts-Ruler

## 5. Not verified

1. Exact pitch length of each coloured beam, large beam, plate and shaft; Blue Wheel and pulley diameters.
2. Pink Slotted Beam quantity per kit (4 vs 1).
3. Hexagonal GO pins and IQ interchangeability (forum claim only).
4. Field tile dimensions.
5. The "296 structural and motion components" marketing count; the itemised list sums to roughly 274 structural/motion pieces plus about 15 other items.
