// Xbox (or any standard-mapping) controller via the Gamepad API.
//
// Standard mapping (what Chrome reports for Xbox controllers):
//   axes[0] left stick X, axes[1] left stick Y (down = +1)
//   axes[2] right stick X, axes[3] right stick Y
//   buttons: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 6 LT, 7 RT, 8 Back, 9 Start,
//            10 LS, 11 RS, 12 Up, 13 Down, 14 Left, 15 Right, 16 Xbox
//
// Emits 'input' events ~60 times a second with a normalised snapshot:
//   { drive: -1..1, turn: -1..1, leftY, rightY, buttons: {a,b,x,y,lb,rb,...}, pressed: {...just pressed} }

const DEADZONE = 0.12;
const dz = (v) => (Math.abs(v) < DEADZONE ? 0 : Math.sign(v) * ((Math.abs(v) - DEADZONE) / (1 - DEADZONE)));
const NAMES = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'back', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right', 'home'];

export class GamepadInput extends EventTarget {
  constructor() {
    super();
    this.connected = false;
    this._prev = {};
    this._raf = null;
    window.addEventListener('gamepadconnected', () => this._update(true));
    window.addEventListener('gamepaddisconnected', () => this._update(false));
  }

  start() {
    if (this._raf) return;
    const loop = () => { this._poll(); this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
  }

  stop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = null; }

  _update(flag) {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const now = flag || pads.length > 0;
    if (now !== this.connected) {
      this.connected = now;
      this.dispatchEvent(new CustomEvent('connection', { detail: now }));
    }
  }

  _poll() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const pad = pads[0];
    this._update(!!pad);
    if (!pad) return;
    const ax = pad.axes;
    const buttons = {};
    const pressed = {};
    pad.buttons.forEach((b, i) => {
      const name = NAMES[i] || `b${i}`;
      buttons[name] = b.pressed || b.value > 0.5;
      if (buttons[name] && !this._prev[name]) pressed[name] = true;
    });
    this._prev = buttons;
    const leftX = dz(ax[0] || 0), leftY = -dz(ax[1] || 0), rightX = dz(ax[2] || 0), rightY = -dz(ax[3] || 0);
    // d-pad doubles as a simple drive
    let drive = leftY, turn = rightX || leftX * 0.8;
    if (buttons.up) drive = 1; if (buttons.down) drive = -1;
    if (buttons.left) turn = -1; if (buttons.right) turn = 1;
    const trigger = (pad.buttons[7]?.value || 0) - (pad.buttons[6]?.value || 0);
    if (Math.abs(trigger) > 0.1 && drive === 0) drive = trigger;
    this.dispatchEvent(new CustomEvent('input', { detail: { drive, turn, leftX, leftY, rightX, rightY, buttons, pressed, id: pad.id } }));
  }
}
