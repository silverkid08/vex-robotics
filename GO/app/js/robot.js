// High-level robot API used by the puzzle runner and the Drive tab.
//
// Wraps a transport (VexGoBle or SimBrain) and reproduces the important parts
// of VEXcode GO's VEXGOController:
//   * keeps the latest sensor snapshot (brain IMU, eye, bumper, battery, ...)
//   * sends robot commands as script lines ("DRIVE_FOR 450 50")
//   * for "wait until done" commands, watches the drivetrain/port status
//     notifications: the command is finished when the port's activeCommand goes
//     back to 0xFF after it had started (or within 7 status updates if it
//     finished before we ever saw it start) - the same heuristic VEXcode uses.
//   * prepares the brain for a project (config preset + default velocities) the
//     way VEXcode's prepareGOForProject / sendCurrentConfigToBrain do.

import { VEXPortDeviceID, VEXRobotConfigPreset, BrakeMode, EventType, VEXDriveStickType, VEXButtonValues } from './encoder.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Ports as the firmware numbers them (0-based). Code Base preset layout. */
export const Port = Object.freeze({ P1: 0, P2: 1, P3: 2, P4: 3, Drivetrain: 4 });

/** Wheel travel: 160 mm per wheel revolution -> degrees per mm. */
export const MM_TO_DEG = 360 / 160;

/** Hue (degrees 0-359) -> colour name using VEXcode GO's thresholds. */
export function hueToColor(hue) {
  if (hue >= 340) return 'red';
  if (hue >= 255) return 'none';
  if (hue >= 160) return 'blue';
  if (hue >= 155) return 'none';
  if (hue >= 75) return 'green';
  if (hue >= 20) return 'none';
  return 'red';
}

export class GoRobot extends EventTarget {
  /** @param {EventTarget} transport VexGoBle or SimBrain */
  constructor(transport) {
    super();
    this.t = transport;
    this.sensors = {
      battery: null, heading: 0, rotation: 0, velocity: 0, crash: false,
      accelXG: 0, accelYG: 0, accelZG: 0, pitch: 0, roll: 0, yaw: 0,
      eye: { hue: 0, brightness: 0, proximity: 0, foundObject: false, color: 'none' },
      bumper: { pressed: false, led: 0, port: null },
      magnet: { pwm: 0, port: null },
      motors: {},
      ports: [],
      preset: null,
    };
    this._updateCounts = [0, 0, 0, 0, 0, 0];
    this._waiters = [null, null, null, null, null, null]; // per port {resolve, started, maxCount}
    this._driveVelocity = 25;
    this._turnVelocity = 25;
    this.t.addEventListener('sensor', (e) => this._onSensor(e.detail));
    this.t.addEventListener('ports', (e) => this._onPorts(e.detail));
    this.t.addEventListener('state', (e) => {
      if (e.detail !== 'connected') this._rejectAllWaiters();
      this.dispatchEvent(new CustomEvent('state', { detail: e.detail }));
    });
  }

  get connected() { return this.t.connected; }

  // ---------------- sensor bookkeeping ----------------

  _onSensor(s) {
    const S = this.sensors;
    Object.assign(S, { accelXG: s.accelXG, accelYG: s.accelYG, accelZG: s.accelZG, pitch: s.pitch, roll: s.roll, yaw: s.yaw });
    S.eye.hue = s.hue; S.eye.brightness = s.brightness; S.eye.proximity = s.proximity;
    S.eye.foundObject = s.proximity >= 50;
    S.eye.color = hueToColor(s.hue);
    this.dispatchEvent(new CustomEvent('sensors', { detail: S }));
  }

  _onPorts(d) {
    const S = this.sensors;
    if (d.battery !== null && d.battery !== undefined) S.battery = d.battery;
    if (d.configPreset !== null && d.configPreset !== undefined) S.preset = d.configPreset;
    S.ports = d.ports;
    for (const p of d.ports) {
      const port = p.port;
      const counter = p.updateCounter ?? ((this._updateCounts[port] + 1) & 0xff);
      const updated = this._updateCounts[port] !== counter;
      // completion detection for "and wait" commands
      const w = this._waiters[port];
      if (w && updated) {
        if (w.maxCount === null) w.maxCount = (counter + 7) % 256;
        const inactive = p.activeCommand === 0xff;
        if (inactive && w.started) this._resolvePort(port);
        else if (inactive && counter === w.maxCount) this._resolvePort(port);
        else if (!inactive && !w.started) w.started = true;
      }
      this._updateCounts[port] = counter;
      if (p.deviceID === VEXPortDeviceID.DriveTrain) {
        S.heading = ((p.heading % 360) + 360) % 360;
        S.rotation = p.heading;
        S.velocity = (p.velocity ?? 0) * 2; // firmware reports half-percent
        S.crash = !!p.crash;
      } else if (p.deviceID === VEXPortDeviceID.Bumper) {
        S.bumper.pressed = !!p.pressed; S.bumper.led = p.pwm; S.bumper.port = port;
      } else if (p.deviceID === VEXPortDeviceID.Magnet) {
        S.magnet.pwm = p.pwm; S.magnet.port = port;
      } else if (p.deviceID === VEXPortDeviceID.Motor) {
        S.motors[port] = { velocity: (p.velocity ?? 0) * 3, position: p.position, current: p.current };
      }
    }
    this.dispatchEvent(new CustomEvent('sensors', { detail: S }));
  }

  _resolvePort(port) {
    const w = this._waiters[port];
    this._waiters[port] = null;
    if (w) w.resolve();
  }

  _rejectAllWaiters() {
    this._waiters.forEach((w, i) => { if (w) { this._waiters[i] = null; w.reject(new Error('disconnected')); } });
  }

  /** Cancel every pending "wait for completion" (used by stop). */
  cancelWaits() {
    this._waiters.forEach((w, i) => { if (w) { this._waiters[i] = null; w.resolve(); } });
  }

  // ---------------- sending ----------------

  /**
   * Send a script line. When `waitPort` is given, resolve only when the brain reports the
   * command finished on that port (or after `timeoutMs`).
   */
  async send(script, waitPort = null, timeoutMs = 20000) {
    if (!this.connected) throw new Error('robot not connected');
    if (waitPort === null) {
      await this.t.sendCommand(script);
      return;
    }
    if (this._waiters[waitPort]) this._resolvePort(waitPort);
    const done = new Promise((resolve, reject) => {
      this._waiters[waitPort] = { resolve, reject, started: false, maxCount: null };
    });
    await this.t.sendCommand(script);
    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(() => { this._resolvePort(waitPort); resolve(); }, timeoutMs); });
    await Promise.race([done, timeout]);
    clearTimeout(timer);
  }

  // ---------------- project preparation (like VEXcode) ----------------

  /** Tell the brain which robot is plugged in and reset defaults. */
  async prepare(preset = VEXRobotConfigPreset.GOCodeBase) {
    await this.t.stopProgram();
    await delay(50);
    await this.t.setConfigPreset(preset);
    await delay(100);
    await this.setDriveVelocity(50);
    await this.setTurnVelocity(50);
    await this.send('SET_HEADING 0');
    await this.send('SET_TIMEOUT 0');
    await this.send('SET_SENSOR_PROX 0');
    await this.send('SET_SENSOR_LED 100');
  }

  /** Stop everything the brain is doing (motors coast). */
  async stopAll() {
    this.cancelWaits();
    if (!this.connected) return;
    try {
      await this.t.stopProgram();
      await this.send(`DRIVE_STOP ${BrakeMode.Coast}`);
      await this.send('END');
    } catch (e) { /* ignore */ }
  }

  // ---------------- drivetrain ----------------

  /** Velocity in percent (VEXcode halves what the user asks for: 50% -> firmware 25). */
  async setDriveVelocity(pct) { this._driveVelocity = clamp(Math.round(pct * 0.5), -100, 100); await this.send(`SET_VELOCITY ${this._driveVelocity}`); }
  async setTurnVelocity(pct) { this._turnVelocity = clamp(Math.round(pct * 0.5), -100, 100); await this.send(`SET_TURNRATE ${this._turnVelocity}`); }

  /** Drive forever at the current velocity. direction = 1 forward, -1 reverse. */
  drive(direction = 1) { return this.send(`DRIVE ${direction * this._driveVelocity}`); }
  /** Drive a distance in mm (negative = reverse) and wait until done. */
  driveFor(mm, wait = true) {
    const deg = Math.round(mm * MM_TO_DEG);
    return this.send(`DRIVE_FOR ${clamp(deg, -32768, 32767)} ${Math.abs(this._driveVelocity)}`, wait ? Port.Drivetrain : null);
  }
  /** Drive until an event (EventType.Object / EventType.Crash). */
  driveUntil(event = EventType.Object, direction = 1, wait = true) {
    return this.send(`DRIVE_UNTIL ${event} ${direction * Math.abs(this._driveVelocity)}`, wait ? Port.Drivetrain : null);
  }
  /** Turn forever: direction = 1 right, -1 left. */
  turn(direction = 1) { return this.send(`TURN ${direction * this._turnVelocity}`); }
  /** Turn by degrees (positive = right/clockwise) and wait. */
  turnFor(deg, wait = true) { return this.send(`TURN_FOR ${Math.round(deg)} ${Math.abs(this._turnVelocity)}`, wait ? Port.Drivetrain : null); }
  /** Turn to an absolute heading 0-359 using the shortest way. */
  turnToHeading(heading, wait = true) {
    const target = ((heading % 360) + 360) % 360;
    const current = ((this.sensors.rotation % 360) + 360) % 360;
    let delta = target - current;
    if (delta > 180) delta -= 360; else if (delta < -180) delta += 360;
    return this.send(`TURN_TO ${Math.round(current + delta)} ${Math.abs(this._turnVelocity)}`, wait ? Port.Drivetrain : null);
  }
  stopDriving(mode = BrakeMode.Brake) { return this.send(`DRIVE_STOP ${mode}`); }
  setHeading(deg = 0) { return this.send(`SET_HEADING ${Math.round(deg)}`); }
  calibrate() { return this.send('CAL_GYRO'); }

  // ---------------- LED bumper (Code Base: port 2 -> firmware port 1) ----------------

  /** color: 'red' | 'green' | 'off'; brightness 0-100 */
  setBumperColor(color, brightness = 100, port = Port.P2) {
    const sign = color === 'red' ? -1 : color === 'green' ? 1 : 0;
    return this.send(`SET_SWITCH_LED ${port} ${sign * clamp(brightness, 0, 100)}`);
  }

  // ---------------- electromagnet (Code Base: port 3 -> firmware port 2) ----------------

  magnetBoost(port = Port.P3, ms = 1100) { return this.send(`MAG_BOOST ${port} ${ms}`); }
  magnetDrop(port = Port.P3, ms = 1100) { return this.send(`MAG_DROP ${port} ${ms}`); }

  // ---------------- eye sensor ----------------

  setEyeLight(on) { return this.send(`SET_SENSOR_LED ${on ? 100 : 0}`); }
  setEyeRange(near = true) { return this.send(`SET_SENSOR_PROX ${near ? 0 : 2}`); }

  // ---------------- motors ----------------

  motorSpin(port, pct) { return this.send(`SPIN ${port} ${clamp(Math.round(pct / 3), -100, 100)}`); }
  motorSpinFor(port, deg, wait = true) { return this.send(`SPIN_FOR ${port} ${Math.round(deg)}`, wait ? port : null); }
  motorStop(port, mode = BrakeMode.Coast) { return this.send(`STOP_MOTOR ${port} ${mode}`); }

  // ---------------- remote control (Drive tab) ----------------

  /**
   * Put the brain in its built-in joystick mode (GO_CONTROL preset) exactly like VEXcode's Drive tab:
   * port 2 = LED bumper, port 3 = magnet, buttons mapped to LED colours / magnet boost & drop.
   */
  async startRemoteControl(stickType = VEXDriveStickType.Tank) {
    await this.t.stopProgram();
    await delay(50);
    await this.t.setConfigPreset(VEXRobotConfigPreset.GOControl);
    await delay(50);
    await this.t.setPortConfig(1, VEXPortDeviceID.Bumper, 1);
    await this.t.setPortConfig(2, VEXPortDeviceID.Magnet, 1);
    await this.t.setButtonCommand(VEXButtonValues.F_UP, true, 'SET_SWITCH_LED 1 100');
    await this.t.setButtonCommand(VEXButtonValues.F_DOWN, true, 'SET_SWITCH_LED 1 -100');
    await this.t.setButtonCommand(VEXButtonValues.F_UP, false, 'SET_SWITCH_LED 1 0');
    await this.t.setButtonCommand(VEXButtonValues.F_DOWN, false, 'SET_SWITCH_LED 1 0');
    await this.t.setButtonCommand(VEXButtonValues.E_UP, true, 'MAG_BOOST 2 500');
    await this.t.setButtonCommand(VEXButtonValues.E_DOWN, true, 'MAG_DROP 2 1000');
    await this.t.setButtonCommand(VEXButtonValues.E_UP, false, 'NONE');
    await this.t.setButtonCommand(VEXButtonValues.E_DOWN, false, 'NONE');
    await this.t.setStickMode(stickType, 50, 25);
    await delay(100);
  }

  /** sticks are -1..1 (up/right positive); buttons is a bitmask of VEXButtonValues */
  sendRemoteControl(leftX, leftY, rightX, rightY, buttons = 0) {
    const b = (v) => clamp(Math.round(127 + v * 127), 0, 255);
    // firmware convention: 0 = full up, 255 = full down for Y; left = 0 for X
    return this.t.setControlValues(b(leftX), b(-leftY), b(rightX), b(-rightY), buttons & 0xff, (buttons >> 8) & 0xff);
  }

  async stopRemoteControl() {
    try {
      await this.t.setControlValues(127, 127, 127, 127, 0, 0);
      await this.t.stopProgram();
      await this.prepare();
    } catch (e) { /* ignore */ }
  }
}
