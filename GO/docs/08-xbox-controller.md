# 08 — Xbox controller support

The app uses the browser **Gamepad API** (`navigator.getGamepads()`), so any controller Chrome recognises with the "standard" mapping works: Xbox One/Series (USB or Bluetooth), Xbox 360, PlayStation DualShock/DualSense, most generic pads. Pair the controller with the computer first (Windows Settings → Bluetooth, or plug in USB); Chrome exposes it only after a button is pressed.

Mapping (`app/js/gamepad.js` → `app/js/drive.js`):

| Control | Action |
|---|---|
| Left stick Y (or D-pad ⬆⬇, or triggers RT/LT) | drive forward / back |
| Right stick X (or left stick X at 80 %, or D-pad ⬅➡) | turn |
| A | toggle green LED |
| B | toggle red LED |
| X or RB | magnet grab (`MAG_BOOST`) |
| Y or LB | magnet drop (`MAG_DROP`) |
| Start | Play (on the build tab) |
| Back/View | Stop |

Details:

* Dead zone 12 % with rescaling, so slightly off-centre sticks do not creep.
* Drive and turn are mixed into tank values in the app (`left = drive + 0.8·turn`, `right = drive − 0.8·turn`) and sent to the brain's built-in joystick mode (`A1` packet every 100 ms, Tank stick type). This means the same code path serves the on-screen arrow pad, a touch screen and the gamepad.
* The gamepad badge (top right of the Drive tab) lights up when a controller is detected.
* Gamepad input only drives the robot while the Drive tab is open; on the build tab only Start/Back are used.
* Multiple controllers: the first one reported is used.

To change the mapping edit the `_onGamepad` handler in `drive.js` (buttons are named `a, b, x, y, lb, rb, lt, rt, back, start, ls, rs, up, down, left, right, home`).

## VEX's own controller

VEX sells no controller for GO; the brain's "Control" preset exists for VEXcode's Drive tab and the VEX 123 / Coder ecosystem. The firmware does support 16 button bindings (`A0` packets) and four stick axes, so a physical gamepad could in principle be mapped entirely on the brain, but VEXcode never saves that configuration (`saveControllerConfig` throws *OperationNotSupported* on the web).
