// Drive tab: picture-only remote control and live sensor pictures.
//
// Controls (all touch friendly):
//   * big arrow pad (hold to move)        * two LED buttons (red / green) and off
//   * magnet grab / drop                  * optional Xbox controller (gamepad.js)
// Sensor pictures update from robot 'sensors' events:
//   battery fill, bumper lights up / squashes when pressed, eye iris takes the
//   colour it sees and shows a box when an object is near, compass needle for
//   heading, little robot with motion lines for speed, star flash on crash.
//
// The brain's own joystick mode is used (same as VEXcode): we send stick values
// ~10 times a second and let the firmware mix tank drive.

import { Icons } from './icons.js';
import { VEXButtonValues } from './encoder.js';

const SEND_MS = 100;

export class DriveTab extends EventTarget {
  constructor({ root, robot, gamepad }) {
    super();
    this.root = root;
    this.robot = robot;
    this.gamepad = gamepad;
    this.active = false;
    this.input = { drive: 0, turn: 0 };
    this.buttons = 0;
    this._ledHeld = null;
    this._timer = null;
    this._crashUntil = 0;
    this._build();
    this.robot.addEventListener('sensors', () => this._paintSensors());
    this.gamepad?.addEventListener('input', (e) => this._onGamepad(e.detail));
    this.gamepad?.addEventListener('connection', (e) => this.root.querySelector('.gp-badge').classList.toggle('on', e.detail));
  }

  _build() {
    this.root.innerHTML = `
      <div class="drive-sensors">
        <div class="sensor" data-s="battery" title="Battery">${Icons.battery(0)}</div>
        <div class="sensor" data-s="bumper" title="Bumper">${Icons.bumperLive('off', false)}</div>
        <div class="sensor" data-s="eye" title="Eye sees">${Icons.eyeLive('none', false)}</div>
        <div class="sensor" data-s="magnet" title="Magnet">${Icons.magnetLive(false)}</div>
        <div class="sensor" data-s="compass" title="Heading">${Icons.compass(0)}</div>
        <div class="sensor" data-s="speed" title="Speed">${Icons.speed(0)}</div>
        <div class="sensor crash" data-s="crash" title="Bump!">${Icons.crash()}</div>
        <div class="gp-badge" title="Game controller">${Icons.gamepad()}</div>
      </div>
      <div class="drive-controls">
        <div class="pad">
          <button class="pad-btn up" data-dir="up" title="Forward">${Icons.arrowUp()}</button>
          <button class="pad-btn left" data-dir="left" title="Left">${Icons.arrowLeft()}</button>
          <button class="pad-btn right" data-dir="right" title="Right">${Icons.arrowRight()}</button>
          <button class="pad-btn down" data-dir="down" title="Back">${Icons.arrowDown()}</button>
        </div>
        <div class="side-buttons">
          <button class="big-btn led-red" data-act="ledRed" title="Red light">${Icons.ledRed()}</button>
          <button class="big-btn led-green" data-act="ledGreen" title="Green light">${Icons.ledGreen()}</button>
          <button class="big-btn" data-act="magnetOn" title="Grab">${Icons.magnetOn()}</button>
          <button class="big-btn" data-act="magnetOff" title="Let go">${Icons.magnetOff()}</button>
        </div>
      </div>`;

    const held = new Set();
    const applyPad = () => {
      let drive = 0, turn = 0;
      if (held.has('up')) drive += 1;
      if (held.has('down')) drive -= 1;
      if (held.has('left')) turn -= 1;
      if (held.has('right')) turn += 1;
      this.input = { drive, turn };
    };
    for (const btn of this.root.querySelectorAll('.pad-btn')) {
      const dir = btn.dataset.dir;
      const down = (e) => { e.preventDefault(); held.add(dir); btn.classList.add('held'); applyPad(); btn.setPointerCapture?.(e.pointerId); };
      const up = () => { held.delete(dir); btn.classList.remove('held'); applyPad(); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
    }
    for (const btn of this.root.querySelectorAll('.big-btn')) {
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._action(btn.dataset.act); });
    }
  }

  /** LED/magnet actions are sent as momentary controller button presses (firmware mappings set by robot.startRemoteControl). */
  _action(act) {
    const pulse = (bit, ms = 250) => {
      this.buttons |= (1 << bit);
      setTimeout(() => { this.buttons &= ~(1 << bit); }, ms);
    };
    if (act === 'ledRed') { this._toggleLed('red'); }
    else if (act === 'ledGreen') { this._toggleLed('green'); }
    else if (act === 'magnetOn') pulse(VEXButtonValues.E_UP);
    else if (act === 'magnetOff') pulse(VEXButtonValues.E_DOWN);
  }

  _toggleLed(color) {
    // Firmware maps F_UP -> green while held, F_DOWN -> red while held; we latch the bit until toggled off.
    const bit = color === 'green' ? VEXButtonValues.F_UP : VEXButtonValues.F_DOWN;
    const other = color === 'green' ? VEXButtonValues.F_DOWN : VEXButtonValues.F_UP;
    this.buttons &= ~(1 << other);
    if (this._ledHeld === color) { this.buttons &= ~(1 << bit); this._ledHeld = null; }
    else { this.buttons |= (1 << bit); this._ledHeld = color; }
    this.root.querySelector('.led-red').classList.toggle('on', this._ledHeld === 'red');
    this.root.querySelector('.led-green').classList.toggle('on', this._ledHeld === 'green');
  }

  _onGamepad(g) {
    if (!this.active) return;
    if (g.drive !== 0 || g.turn !== 0) this.input = { drive: g.drive, turn: g.turn };
    else if (!this.root.querySelector('.pad-btn.held')) this.input = { drive: 0, turn: 0 };
    if (g.pressed.a) this._action('ledGreen');
    if (g.pressed.b) this._action('ledRed');
    if (g.pressed.x || g.pressed.rb) this._action('magnetOn');
    if (g.pressed.y || g.pressed.lb) this._action('magnetOff');
  }

  async start() {
    if (this.active) return;
    this.active = true;
    this.gamepad?.start();
    if (this.robot.connected) {
      try { await this.robot.startRemoteControl(); } catch (e) { this.dispatchEvent(new CustomEvent('error', { detail: e.message })); }
    }
    this._timer = setInterval(() => this._send(), SEND_MS);
  }

  async stop() {
    if (!this.active) return;
    this.active = false;
    clearInterval(this._timer); this._timer = null;
    this.input = { drive: 0, turn: 0 }; this.buttons = 0; this._ledHeld = null;
    this.root.querySelectorAll('.big-btn.on').forEach((b) => b.classList.remove('on'));
    if (this.robot.connected) await this.robot.stopRemoteControl();
  }

  /** Called when the transport connects while the tab is open. */
  async onConnected() { if (this.active && this.robot.connected) await this.robot.startRemoteControl(); }

  _send() {
    if (!this.robot.connected) return;
    const { drive, turn } = this.input;
    // tank mix: left = drive + turn, right = drive - turn
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const left = clamp(drive + turn * 0.8);
    const right = clamp(drive - turn * 0.8);
    this.robot.sendRemoteControl(0, left, 0, right, this.buttons).catch(() => {});
  }

  _paintSensors() {
    const s = this.robot.sensors;
    const q = (k) => this.root.querySelector(`[data-s="${k}"]`);
    q('battery').innerHTML = Icons.battery(s.battery ?? 0);
    const led = s.bumper.led > 0 ? 'green' : s.bumper.led < 0 ? 'red' : 'off';
    q('bumper').innerHTML = Icons.bumperLive(led, s.bumper.pressed);
    q('bumper').classList.toggle('pressed', s.bumper.pressed);
    q('eye').innerHTML = Icons.eyeLive(s.eye.foundObject ? s.eye.color : 'none', s.eye.foundObject);
    q('magnet').innerHTML = Icons.magnetLive(s.magnet.pwm > 0);
    q('compass').innerHTML = Icons.compass(s.heading);
    q('speed').innerHTML = Icons.speed(s.velocity);
    if (s.crash) this._crashUntil = Date.now() + 800;
    q('crash').classList.toggle('show', Date.now() < this._crashUntil);
  }
}
