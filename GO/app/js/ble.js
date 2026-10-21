// Web Bluetooth transport for the VEX GO Brain.
//
// Mirrors what VEXcode GO does in @vexcode/vex-ble-device-manager:
//   1. navigator.bluetooth.requestDevice({ filters: [{ services: [0x0677] }], optionalServices: [...] })
//   2. gatt.connect -> getPrimaryServices -> cache characteristics
//   3. subscribe to notifications on ProgramCommand (acks), ProgramSensorStatus,
//      ProgramPortCmdStatus and ProgramBotConfig
//   4. read the Device Information service for firmware / model / name
//
// Emits events through a tiny EventTarget: 'state', 'deviceinfo', 'sensor',
// 'ports', 'ack', 'log'.
//
// All packet layouts are documented in docs/02-bluetooth-protocol.md.

import {
  ProgramConst, scriptLineToCommand, buildExecuteSinglePacket, buildExecuteMultiPacket,
  buildPortConfigPacket, buildConfigPresetPacket, buildControlValuesPacket,
  buildButtonCommandPacket, buildStickModePacket, VEXPortDeviceID,
} from './encoder.js';

export const BLEService = Object.freeze({
  DeviceInfo: '0000180a-0000-1000-8000-00805f9b34fb',
  Programmer: '6faa5911-9200-49a0-a353-6152c5930ec5',
  Sensor: '6faa6911-9200-49a0-a353-6152c5930ec5',
  Coder: '6faa7911-9200-49a0-a353-6152c5930ec5',
  Reset: '0113de02-7a5e-11e8-adc0-fa7ae01bbebc',
  OAD: '6faaffc0-9200-49a0-a353-6152c5930ec5',
});

export const BLEChar = Object.freeze({
  ProgramCommand: '6faa5920-9200-49a0-a353-6152c5930ec5',
  ProgramStatus: '6faa5921-9200-49a0-a353-6152c5930ec5',
  ProgramBotStatus: '6faa5922-9200-49a0-a353-6152c5930ec5',
  ProgramBotConfig: '6faa5923-9200-49a0-a353-6152c5930ec5',
  ProgramSensorStatus: '6faa5924-9200-49a0-a353-6152c5930ec5',
  ProgramPortCmdStatus: '6faa5925-9200-49a0-a353-6152c5930ec5',
  SensorStatusShort: '6faa6920-9200-49a0-a353-6152c5930ec5',
  SensorGyroDetails: '6faa6921-9200-49a0-a353-6152c5930ec5',
  SensorGyroCmd: '6faa6922-9200-49a0-a353-6152c5930ec5',
  SensorRegWrite: '6faa6923-9200-49a0-a353-6152c5930ec5',
  SensorPortDetails: '6faa6925-9200-49a0-a353-6152c5930ec5',
  DevInfoSystemID: '00002a23-0000-1000-8000-00805f9b34fb',
  DevInfoModelNumber: '00002a24-0000-1000-8000-00805f9b34fb',
  DevInfoSerialNumber: '00002a25-0000-1000-8000-00805f9b34fb',
  DevInfoFirmware: '00002a26-0000-1000-8000-00805f9b34fb',
  DevInfoHardwareRev: '00002a27-0000-1000-8000-00805f9b34fb',
  DevInfoSoftware: '00002a28-0000-1000-8000-00805f9b34fb',
  DevInfoManufacturer: '00002a29-0000-1000-8000-00805f9b34fb',
});

/** Advertised 16-bit service id that identifies a GO brain while scanning. */
export const GO_ADVERTISED_SERVICE = 0x0677;

export const ConnectionState = Object.freeze({
  Disconnected: 'disconnected', Scanning: 'scanning', Connecting: 'connecting', Connected: 'connected',
});

const td = new TextDecoder('utf-8');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** Parse a ProgramSensorStatus notification (brain IMU + eye sensor). */
export function parseSensorStatus(dv) {
  if (dv.byteLength < 18) return null;
  const i16 = (n) => ((n << 16) >> 16);
  const s = {
    accX: dv.getInt16(0, true), accY: dv.getInt16(2, true), accZ: dv.getInt16(4, true),
    gyroX: dv.getInt16(6, true), gyroY: dv.getInt16(8, true), gyroZ: dv.getInt16(10, true),
    pitch: i16(Math.trunc(dv.getInt8(12) * 1.41)),
    roll: i16(Math.trunc(dv.getInt8(13) * 1.41)),
    yaw: i16(Math.trunc(dv.getInt8(14) * 1.41)),
    hue: Math.trunc(dv.getUint8(15) * 1.41) & 0xffff,
    brightness: dv.getUint8(16),
    proximity: dv.getUint8(17),
    floor: dv.byteLength >= 20 ? dv.getInt16(18, true) : 0,
  };
  // derived values (same formulas as VEXcode GO)
  s.accelXG = s.accX / 8192; s.accelYG = s.accY / 8192; s.accelZG = s.accZ / 8192;
  return s;
}

/** Parse a ProgramPortCmdStatus notification into { battery, configPreset, ports: [...] }. */
export function parsePortStatus(dv) {
  const out = { battery: null, configPreset: null, ports: [] };
  let i = 0;
  while (i < dv.byteLength) {
    const head = dv.getUint8(i);
    if (head === 0) break;
    const portNum = head & 0x0f;
    const devType = head & 0xf0;
    if (portNum > 4 || dv.byteLength <= i + 2) break;
    i += 1;
    const activeCommand = dv.getUint8(i); i += 1;
    const len = dv.getUint8(i); i += 1;
    if (dv.byteLength < i + len) break;
    const p = { port: portNum, deviceID: devType, activeCommand };
    if (devType === VEXPortDeviceID.Motor) {
      p.current = dv.getInt8(i); p.velocity = dv.getInt8(i + 1); p.position = dv.getInt32(i + 2, true);
      p.flags = dv.getUint8(i + 6); p.modeBits = dv.getUint8(i + 7);
    } else if (devType === VEXPortDeviceID.Magnet) {
      p.pwm = dv.getInt8(i); p.flags = dv.getUint8(i + 1);
    } else if (devType === VEXPortDeviceID.Bumper) {
      p.pwm = dv.getInt8(i); p.state = dv.getUint8(i + 1); p.flags = dv.getUint8(i + 2);
      p.pressed = (p.state & 0x01) !== 0;
    } else if (devType === VEXPortDeviceID.DriveTrain) {
      out.battery = dv.getUint8(i); out.configPreset = dv.getUint8(i + 1);
      p.flags = dv.getUint8(i + 2);
      if (len === 10) {
        p.velocity = dv.getInt8(i + 3); p.heading = dv.getInt16(i + 4, true); p.position = dv.getInt32(i + 6, true);
      } else if (len === 5) {
        p.heading = dv.getInt16(i + 3, true);
      }
      p.crash = (p.flags & 0x02) !== 0;
    }
    i += len;
    out.ports.push(p);
  }
  return out;
}

/** Parse the ack notification(s) on ProgramCommand: 0xAA status cmd [data]. */
export function parseAcks(dv) {
  const acks = [];
  let i = 0;
  while (i < dv.byteLength) {
    if (dv.getUint8(i) === 0xaa && i + 3 < dv.byteLength) {
      const status = dv.getUint8(i + 1);
      const cmd = dv.getUint8(i + 2);
      let data = dv.getUint8(i + 3);
      let consumed = 4;
      if (cmd === ProgramConst.PROG_CMD_EXE_SINGLE && i + 6 < dv.byteLength) {
        data = dv.getUint32(i + 3, true);
        consumed = 7;
      }
      acks.push({ status, cmd, data });
      i += consumed;
    } else {
      i += 1;
    }
  }
  return acks;
}

export class VexGoBle extends EventTarget {
  constructor() {
    super();
    this.device = null;
    this.server = null;
    this.chars = {};
    this.state = ConnectionState.Disconnected;
    this.deviceInfo = null;
    this._writeChain = Promise.resolve();
    this._onDisconnected = this._onDisconnected.bind(this);
  }

  static get isSupported() {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  get connected() { return this.state === ConnectionState.Connected; }

  _setState(s) {
    this.state = s;
    this.dispatchEvent(new CustomEvent('state', { detail: s }));
  }

  _log(...args) { this.dispatchEvent(new CustomEvent('log', { detail: args.join(' ') })); }

  /** Show the browser's device chooser filtered to GO brains, then connect. */
  async connect() {
    if (!VexGoBle.isSupported) throw new Error('Web Bluetooth is not available in this browser');
    this._setState(ConnectionState.Scanning);
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [GO_ADVERTISED_SERVICE] }],
        optionalServices: [BLEService.Programmer, BLEService.OAD, BLEService.Reset, BLEService.DeviceInfo, BLEService.Sensor],
      });
    } catch (e) {
      this._setState(ConnectionState.Disconnected);
      throw e;
    }
    this.device.addEventListener('gattserverdisconnected', this._onDisconnected);
    await this._connectGatt();
  }

  async _connectGatt(attempt = 1) {
    this._setState(ConnectionState.Connecting);
    try {
      await delay(300);
      this.server = await this.device.gatt.connect();
      await delay(500);
      const services = await this.server.getPrimaryServices();
      this.chars = {};
      for (const svc of services) {
        let chars = [];
        try { chars = await svc.getCharacteristics(); } catch (e) { continue; }
        for (const c of chars) this.chars[c.uuid] = c;
      }
      await this._subscribe();
      this.deviceInfo = await this._readDeviceInfo();
      this.dispatchEvent(new CustomEvent('deviceinfo', { detail: this.deviceInfo }));
      await delay(200);
      this._setState(ConnectionState.Connected);
      this._log('connected to', this.deviceInfo?.name || this.device.name);
    } catch (e) {
      this._log('connect error', e.message);
      if (attempt < 4) {
        await delay(1000);
        return this._connectGatt(attempt + 1);
      }
      this._setState(ConnectionState.Disconnected);
      throw e;
    }
  }

  async _subscribe() {
    const sub = async (uuid, handler) => {
      const c = this.chars[uuid];
      if (!c) return;
      c.addEventListener('characteristicvaluechanged', handler);
      try { await c.startNotifications(); } catch (e) { this._log('notify failed', uuid, e.message); }
    };
    await sub(BLEChar.ProgramCommand, (ev) => {
      for (const ack of parseAcks(ev.target.value)) this.dispatchEvent(new CustomEvent('ack', { detail: ack }));
    });
    await sub(BLEChar.ProgramSensorStatus, (ev) => {
      const s = parseSensorStatus(ev.target.value);
      if (s) this.dispatchEvent(new CustomEvent('sensor', { detail: s }));
    });
    await sub(BLEChar.ProgramPortCmdStatus, (ev) => {
      this.dispatchEvent(new CustomEvent('ports', { detail: parsePortStatus(ev.target.value) }));
    });
    await sub(BLEChar.ProgramBotConfig, (ev) => {
      this.dispatchEvent(new CustomEvent('config', { detail: new Uint8Array(ev.target.value.buffer) }));
    });
  }

  async _readDeviceInfo() {
    const info = { name: this.device?.name || '', model: '', bootVersion: '', appVersion: '', mode: 'connect', deviceId: null };
    const read = async (uuid) => {
      const c = this.chars[uuid];
      if (!c) return null;
      try { return await c.readValue(); } catch (e) { return null; }
    };
    const ver = (dv) => dv && dv.byteLength > 7
      ? `${dv.getUint8(0) - 0x30}.${dv.getUint8(2) - 0x30}.${dv.getUint8(4) - 0x30}.b${dv.getUint8(7) - 0x30}` : '';
    info.bootVersion = ver(await read(BLEChar.DevInfoFirmware));
    info.appVersion = ver(await read(BLEChar.DevInfoSoftware));
    const model = await read(BLEChar.DevInfoModelNumber);
    if (model) {
      info.model = td.decode(model);
      info.mode = info.model.includes('Bootload') ? 'update' : 'connect';
    }
    const sysId = await read(BLEChar.DevInfoSystemID);
    if (sysId && sysId.byteLength >= 6) info.deviceId = [sysId.getUint8(0), sysId.getUint8(1), sysId.getUint8(2), sysId.getUint8(5)];
    const serial = await read(BLEChar.DevInfoSerialNumber);
    if (serial) { try { info.name = td.decode(serial) || info.name; } catch (e) { /* ignore */ } }
    return info;
  }

  _onDisconnected() {
    this._log('disconnected');
    this.chars = {};
    this._setState(ConnectionState.Disconnected);
  }

  async disconnect() {
    try { if (this.device?.gatt?.connected) this.device.gatt.disconnect(); } catch (e) { /* ignore */ }
    this._onDisconnected();
  }

  // ---------------- writes ----------------

  /** Serialised write to the ProgramCommand characteristic with one retry. */
  writeProgram(bytes) {
    const c = this.chars[BLEChar.ProgramCommand];
    if (!c) return Promise.reject(new Error('not connected'));
    const doWrite = async () => {
      try {
        await c.writeValue(bytes);
      } catch (e) {
        await delay(200);
        await c.writeValue(bytes);
      }
    };
    this._writeChain = this._writeChain.then(doWrite, doWrite);
    return this._writeChain;
  }

  /** Encode and send one robot command string, e.g. "DRIVE_FOR 200 50". */
  async sendCommand(script) {
    const cmd = scriptLineToCommand(script);
    if (cmd === 0) throw new Error(`invalid command: ${script}`);
    this._log('TX', script);
    await this.writeProgram(buildExecuteSinglePacket(cmd));
    return cmd;
  }

  /** Send up to 4 commands in one write. */
  async sendCommands(scripts) {
    const cmds = scripts.map(scriptLineToCommand).filter((c) => c !== 0);
    if (!cmds.length) return;
    await this.writeProgram(buildExecuteMultiPacket(cmds));
  }

  /** PROG_CMD_STOP: stop the on-brain script engine (also used before config changes). */
  stopProgram() { return this.writeProgram(new Uint8Array([ProgramConst.PROG_CMD_STOP])); }
  playProgram() { return this.writeProgram(new Uint8Array([ProgramConst.PROG_CMD_PLAY])); }

  setConfigPreset(preset) { return this.writeProgram(buildConfigPresetPacket(preset)); }
  setPortConfig(port, devType, flags, iLimitPct = 100, iLimitMax = 500) {
    return this.writeProgram(buildPortConfigPacket(port, devType, flags, iLimitPct, iLimitMax));
  }
  clearPortEvents(port) { return this.writeProgram(new Uint8Array([ProgramConst.PROG_CMD_CLEAR_PORT_EVENTS, port & 0xff])); }
  locate(seconds = 2) { return this.writeProgram(new Uint8Array([ProgramConst.PROG_CMD_LOCATE, seconds & 0xff])); }

  // ---- remote-control (Drive) mode ----
  setStickMode(type, driveSens = 50, turnSens = 25) { return this.writeProgram(buildStickModePacket(type, driveSens, turnSens)); }
  setButtonCommand(buttonId, pressed, script) {
    return this.writeProgram(buildButtonCommandPacket(buttonId, pressed, scriptLineToCommand(script)));
  }
  setControlValues(lx, ly, rx, ry, b1 = 0, b2 = 0) { return this.writeProgram(buildControlValuesPacket(lx, ly, rx, ry, b1, b2)); }
}
