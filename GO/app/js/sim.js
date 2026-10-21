// A pretend VEX GO brain.
//
// Implements the same surface as VexGoBle (connect/disconnect/sendCommand/
// stopProgram/setConfigPreset/setControlValues/... plus 'state', 'sensor',
// 'ports', 'ack', 'log' events) but drives an on-screen toy robot instead of
// real hardware. Used when no brain is around (or in tests) so a child can
// still play, and so the program runner can be tested deterministically.
//
// Physics are deliberately simple: the Code Base drives at ~ (velocity% * 2) mm/s
// ... close enough for a cartoon.

import { scriptLineToCommand, ProgramCommands, VEXPortDeviceID } from './encoder.js';
import { ConnectionState } from './ble.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export class SimBrain extends EventTarget {
  constructor() {
    super();
    this.state = ConnectionState.Disconnected;
    this.deviceInfo = { name: 'Pretend Brain', model: 'VEX Go Sim', appVersion: '0.0.0', bootVersion: '0.0.0', mode: 'connect' };
    this.tickMs = 100;
    this.speed = 1; // >1 makes the pretend robot move faster (tests)
    this.world = {
      x: 0, y: 0, heading: 0, // mm, mm, degrees (0 = up)
      velocity: 25, turnRate: 25, // percent settings
      driveVel: 0, turnVel: 0, // current motion (percent and deg/s)
      target: null, // active timed command
      bumper: { pressed: false, led: 0 }, // led: -100..100 (neg = red, pos = green)
      magnet: { on: false, pwm: 0 },
      eye: { hue: 0, brightness: 0, proximity: 0, lightOn: true, range: 0 },
      battery: 90,
      crash: false,
    };
    this._updateCounter = 0;
    this._timer = null;
    this._activeCommand = 0xff;
  }

  static get isSupported() { return true; }
  get connected() { return this.state === ConnectionState.Connected; }

  _setState(s) { this.state = s; this.dispatchEvent(new CustomEvent('state', { detail: s })); }
  _log(...a) { this.dispatchEvent(new CustomEvent('log', { detail: '[sim] ' + a.join(' ') })); }

  async connect() {
    this._setState(ConnectionState.Connecting);
    await delay(300);
    this.dispatchEvent(new CustomEvent('deviceinfo', { detail: this.deviceInfo }));
    this._setState(ConnectionState.Connected);
    this._timer = setInterval(() => this._tick(), this.tickMs);
  }

  async disconnect() {
    clearInterval(this._timer); this._timer = null;
    this._setState(ConnectionState.Disconnected);
  }

  // ---- user interaction with the pretend world (used by the sim view) ----
  pressBumper(pressed) { this.world.bumper.pressed = pressed; }
  setEyeColor(hue, brightness = 80) { this.world.eye.hue = hue; this.world.eye.brightness = brightness; }
  setEyeProximity(p) { this.world.eye.proximity = p; }
  bump() { this.world.crash = true; setTimeout(() => { this.world.crash = false; }, 500); }

  // ---- command surface (same names as VexGoBle) ----
  async sendCommand(script) {
    const cmd = scriptLineToCommand(script);
    if (cmd === 0) throw new Error(`invalid command: ${script}`);
    this._log('TX', script);
    await delay(15);
    this._execute(script.trim().split(' '));
    this.dispatchEvent(new CustomEvent('ack', { detail: { status: 0x76, cmd: 0x20, data: cmd } }));
    return cmd;
  }
  async sendCommands(scripts) { for (const s of scripts) await this.sendCommand(s); }
  async writeProgram() { await delay(5); }
  async stopProgram() { this._stopMotion(); }
  async playProgram() {}
  async setConfigPreset() {}
  async setPortConfig() {}
  async clearPortEvents() {}
  async locate() { this._log('beep beep'); }
  async setStickMode() {}
  async setButtonCommand() {}
  async setControlValues(lx, ly, rx, ry, b1 = 0) {
    // Tank drive: left stick Y = left wheel, right stick Y = right wheel.
    const l = (127 - ly) / 127; // -1..1 (up = positive)
    const r = (127 - ry) / 127;
    const w = this.world;
    w.target = null;
    w.driveVel = ((l + r) / 2) * 100;
    w.turnVel = ((l - r) / 2) * 180; // deg per second
    // buttons: bit0 F_DOWN (red), bit2 F_UP (green)
    if (b1 & (1 << 2)) w.bumper.led = 100; else if (b1 & 1) w.bumper.led = -100; else if (!this._stickLedHold) w.bumper.led = 0;
    if (b1 & (1 << 3)) { w.magnet.on = true; w.magnet.pwm = 100; }
    if (b1 & (1 << 1)) { w.magnet.on = false; w.magnet.pwm = 0; }
  }

  _stopMotion() { const w = this.world; w.driveVel = 0; w.turnVel = 0; w.target = null; this._activeCommand = 0xff; }

  _execute(parts) {
    const w = this.world;
    const op = parts[0].toUpperCase();
    const n = (i, d = 0) => (parts.length > i ? parseInt(parts[i], 10) : d);
    const velPct = (v) => (v || w.velocity);
    switch (op) {
      case 'SET_VELOCITY': w.velocity = n(1); break;
      case 'SET_TURNRATE': w.turnRate = n(1); break;
      case 'SET_HEADING': case 'RESET_HEADING': w.heading = n(1); break;
      case 'RESET_POS': break;
      case 'CAL_GYRO': w.heading = 0; break;
      case 'DRIVE': w.target = null; w.driveVel = n(1); w.turnVel = 0; this._activeCommand = ProgramCommands.CMD_FWD; break;
      case 'TURN': w.target = null; w.driveVel = 0; w.turnVel = n(1) * 1.8; this._activeCommand = ProgramCommands.CMD_TURN; break;
      case 'DRIVE_STOP': this._stopMotion(); break;
      case 'DRIVE_FOR': {
        const distDeg = n(1); const mm = distDeg * (160 / 360); // 160 mm per wheel rev
        const sign = Math.sign(mm) || 1;
        w.driveVel = sign * velPct(n(2)); w.turnVel = 0;
        w.target = { kind: 'drive', remaining: Math.abs(mm) };
        this._activeCommand = ProgramCommands.CMD_FWD_FOR;
        break;
      }
      case 'TURN_FOR': case 'TURN_TO': {
        let deg = n(1);
        if (op === 'TURN_TO') deg = n(1) - w.heading;
        const sign = Math.sign(deg) || 1;
        w.driveVel = 0; w.turnVel = sign * velPct(n(2)) * 1.8;
        w.target = { kind: 'turn', remaining: Math.abs(deg) };
        this._activeCommand = op === 'TURN_FOR' ? ProgramCommands.CMD_TURN_FOR : ProgramCommands.CMD_TURN_TO;
        break;
      }
      case 'DRIVE_UNTIL': {
        w.driveVel = n(2) || w.velocity; w.turnVel = 0;
        w.target = { kind: 'until', event: n(1) };
        this._activeCommand = ProgramCommands.CMD_FWD_UNTIL;
        break;
      }
      case 'TURN_UNTIL': {
        w.driveVel = 0; w.turnVel = (n(2) || w.turnRate) * 1.8;
        w.target = { kind: 'until', event: n(1) };
        this._activeCommand = ProgramCommands.CMD_TURN_UNTIL;
        break;
      }
      case 'TURN_RANDOM': {
        const deg = Math.round(Math.random() * 720 - 360);
        w.driveVel = 0; w.turnVel = Math.sign(deg) * (n(1) || w.turnRate) * 1.8;
        w.target = { kind: 'turn', remaining: Math.abs(deg) };
        this._activeCommand = ProgramCommands.CMD_TURN_RAND;
        break;
      }
      case 'SET_SWITCH_LED': w.bumper.led = n(2); break;
      case 'MAG_BOOST': w.magnet.on = true; w.magnet.pwm = 100; setTimeout(() => { w.magnet.pwm = 0; }, n(2)); break;
      case 'MAG_DROP': w.magnet.on = false; w.magnet.pwm = -100; setTimeout(() => { w.magnet.pwm = 0; }, n(2)); break;
      case 'MAG_HOLD': w.magnet.on = n(2) !== 0; w.magnet.pwm = n(2); break;
      case 'SET_SENSOR_LED': w.eye.lightOn = n(1) > 0; break;
      case 'SET_SENSOR_PROX': w.eye.range = n(1); break;
      case 'END': this._stopMotion(); break;
      default: break;
    }
  }

  _tick() {
    const w = this.world;
    const dt = (this.tickMs / 1000) * this.speed;
    const mmPerSec = w.driveVel * 2; // 100% ~ 200 mm/s
    if (w.target?.kind === 'drive') {
      const step = Math.min(Math.abs(mmPerSec) * dt, w.target.remaining);
      w.target.remaining -= step;
      this._move(Math.sign(mmPerSec) * step);
      if (w.target.remaining <= 0.01) this._stopMotion();
    } else if (w.target?.kind === 'turn') {
      const step = Math.min(Math.abs(w.turnVel) * dt, w.target.remaining);
      w.target.remaining -= step;
      w.heading += Math.sign(w.turnVel) * step;
      if (w.target.remaining <= 0.01) this._stopMotion();
    } else if (w.target?.kind === 'until') {
      this._move(mmPerSec * dt);
      w.heading += w.turnVel * dt;
      const ev = w.target.event;
      const hit = (ev === 1 && w.crash) || (ev === 2 && w.eye.proximity >= 50) || (ev >= 3 && ev <= 6 && w.bumper.pressed);
      if (hit) this._stopMotion();
    } else {
      this._move(mmPerSec * dt);
      w.heading += w.turnVel * dt;
    }
    this._updateCounter = (this._updateCounter + 1) & 0xff;
    const heading = ((w.heading % 360) + 360) % 360;
    this.dispatchEvent(new CustomEvent('sensor', {
      detail: {
        accX: 0, accY: 0, accZ: 8192, accelXG: 0, accelYG: 0, accelZG: 1, gyroX: 0, gyroY: 0, gyroZ: 0,
        pitch: 0, roll: 0, yaw: Math.round(heading), hue: w.eye.hue, brightness: w.eye.brightness, proximity: w.eye.proximity, floor: 0,
      },
    }));
    this.dispatchEvent(new CustomEvent('ports', {
      detail: {
        battery: w.battery, configPreset: 1,
        ports: [
          { port: 1, deviceID: VEXPortDeviceID.Bumper, activeCommand: 0xff, pwm: w.bumper.led, state: w.bumper.pressed ? 1 : 0, flags: 0, pressed: w.bumper.pressed },
          { port: 2, deviceID: VEXPortDeviceID.Magnet, activeCommand: 0xff, pwm: w.magnet.pwm, flags: 0 },
          { port: 4, deviceID: VEXPortDeviceID.DriveTrain, activeCommand: this._activeCommand, flags: w.crash ? 2 : 0, velocity: Math.round(w.driveVel / 2), heading: Math.round(w.heading), position: 0, crash: w.crash },
        ].map((p) => ({ ...p, updateCounter: this._updateCounter })),
      },
    }));
  }

  _move(mm) {
    const rad = (this.world.heading * Math.PI) / 180;
    this.world.x += Math.sin(rad) * mm;
    this.world.y -= Math.cos(rad) * mm;
  }
}
