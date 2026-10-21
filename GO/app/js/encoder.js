// VEX GO robot command encoder.
//
// This is a clean-room port of the "script line -> 32-bit command" encoding that
// VEXcode GO uses (vex-ble-device-manager/ProgramUtil.scriptLineToCommand).
// Every robot command is a little-endian uint32:
//
//   byte 0 : opcode (ProgramCommands)
//   byte 1 : first argument   (port, event id, velocity, ...)
//   byte 2-3: remaining arguments (see docs/02-bluetooth-protocol.md)
//
// The uint32 is wrapped as [0x20, b0, b1, b2, b3] and written to the
// ProgramCommand characteristic (see ble.js).
//
// The module is dependency free and runs in the browser and in Node (tests).

export const ProgramCommands = Object.freeze({
  CMD_FWD: 0x01,
  CMD_FWD_FOR: 0x02,
  CMD_FWD_UNTIL: 0x04,
  CMD_TURN: 0x11,
  CMD_TURN_FOR: 0x12,
  CMD_TURN_TO: 0x13,
  CMD_TURN_UNTIL: 0x14,
  CMD_TURN_RAND: 0x15,
  CMD_ARM_TILT: 0x16,
  CMD_ARM_TILT_FOR: 0x17,
  CMD_ARM_TILT_TO: 0x18,
  CMD_STOP_DRIVE: 0x1f,
  CMD_RESET_POS: 0x21,
  CMD_RESET_HEADING: 0x22,
  CMD_CAL_GYRO: 0x23,
  CMD_SET_HEADING: 0x31,
  CMD_SET_VELOCITY: 0x32,
  CMD_SET_TURNRATE: 0x33,
  CMD_SET_TIMEOUT: 0x34,
  CMD_SET_STOPPING: 0x35,
  CMD_SET_DRIVE_ACC: 0x36,
  CMD_SET_DRIVE_SENS: 0x37,
  CMD_SOUND: 0x41,
  CMD_SET_VOLUME: 0x42,
  CMD_LED_COLOR: 0x51,
  CMD_GLOW: 0x52,
  CMD_SET_FLOOR_THRESH: 0x5a,
  CMD_SET_FLOOR_LED: 0x5b,
  CMD_WAIT_UNTIL: 0x60,
  CMD_DELAY: 0x61,
  CMD_IF_PROX: 0x62,
  CMD_IF_COLOR: 0x63,
  CMD_IF_CRASH: 0x64,
  CMD_IF_BUTTON: 0x65,
  CMD_IF_LIGHT: 0x66,
  CMD_ELSE: 0x6e,
  CMD_ENDIF: 0x6f,
  CMD_P_SPIN: 0x71,
  CMD_P_SPIN_FOR: 0x72,
  CMD_P_SPIN_TO: 0x73,
  CMD_P_SPIN_TO_A: 0x74,
  CMD_P_STOP: 0x79,
  CMD_P_SET_POS: 0x7a,
  CMD_P_SET_VEL: 0x7b,
  CMD_P_SET_I_LIMIT: 0x7c,
  CMD_P_SET_BRAKE: 0x7d,
  CMD_P_SET_TIMEOUT: 0x7e,
  CMD_P_SET_STALL_TO: 0x7f,
  CMD_P_MAG_SET_POWER: 0x81,
  CMD_P_DROP: 0x82,
  CMD_P_BOOST: 0x83,
  CMD_P_HOLD: 0x84,
  CMD_P_SET_LED: 0x85,
  CMD_GOTO: 0x90,
  CMD_END: 0x91,
  CMD_PAUSE: 0x92,
  CMD_SET_SENS_LED: 0xb0,
  CMD_SET_SENS_PROX: 0xb1,
  CMD_ACT: 0xb4,
  CMD_NO_COMMAND: 0xff,
});

// First byte written to the ProgramCommand characteristic ("program" level
// commands as opposed to robot commands).
export const ProgramConst = Object.freeze({
  PROG_CMD_NONE: 0x00,
  PROG_CMD_STOP: 0x01,
  PROG_CMD_STEP: 0x02,
  PROG_CMD_PLAY: 0x03,
  PROG_CMD_PAUSE: 0x04,
  PROG_CMD_ADD: 0x10,
  PROG_CMD_REMOVE: 0x11,
  PROG_CMD_REMOVE_ALL: 0x12,
  PROG_CMD_SET_CMD_DELAY: 0x1a,
  PROG_CMD_SET_IGNORE_CONN_DROP: 0x1b,
  PROG_CMD_SET_USER_SETTINGS: 0x1c,
  PROG_CMD_GET_USER_SETTINGS: 0x1d,
  PROG_CMD_EXE_SINGLE: 0x20,
  PROG_CMD_CLEAR_PORT_EVENTS: 0x21,
  PROG_CMD_RAW_PWM: 0x30,
  PROG_CMD_SET_BOT_NAME: 0x40,
  PROG_CMD_SET_BOT_CONFIG_PRESET: 0x50,
  PROG_CMD_SET_PORT_CONFIG: 0x51,
  PROG_CMD_SET_PROD_TEST_MODE: 0x52,
  PROG_CMD_LOCATE: 0x70,
  PROG_CMD_GET_CONN_INT: 0x90,
  PROG_CMD_SET_BUTTON_CMD: 0xa0,
  PROG_CMD_SET_CONTROLL_VALUES: 0xa1,
  PROG_CMD_SAVE_CONTROL_CONFIG_CMD: 0xa2,
  PROG_CMD_SET_STICK_MODE_CMD: 0xa3,
});

// ---- fixed-width integer helpers (wrap exactly like typed arrays do) ----
const u8 = (n) => (n & 0xff) >>> 0;
const i8 = (n) => ((n << 24) >> 24);
const u16 = (n) => (n & 0xffff) >>> 0;
const i16 = (n) => ((n << 16) >> 16);
const u32 = (n) => n >>> 0;

const int = (s) => parseInt(s, 10);

// Pack helpers. All of them return a uint32 built as opcode | (arg << 8) ...
// Note: VEX's original code adds uint32 pieces with "+" and finally wraps to a
// uint32 when building the byte array, so we wrap with u32 at the end as well.
const packB1 = (op, b1) => u32(op + u32(u16(b1) << 8));

/**
 * Encode a VEX GO script line such as "DRIVE_FOR 200 50" into a uint32 command.
 * Returns 0 for unknown or malformed commands, 0xff for "NONE".
 * @param {string} script
 * @returns {number}
 */
export function scriptLineToCommand(script) {
  if (script === 'NONE') return 0xff;
  if (!script) return 0;
  const parts = script.trim().split(' ');
  if (parts.length === 0) return 0;
  const cmd = parts[0].toUpperCase().trim();
  const C = ProgramCommands;
  const n = parts.length;
  try {
    switch (cmd) {
      // --- VEX 123 only (kept for completeness) ---
      case 'SET_FLOOR_THRESH': return n < 2 ? 0 : packB1(C.CMD_SET_FLOOR_THRESH, u8(int(parts[1])));
      case 'SET_FLOOR_LED': return n < 2 ? 0 : packB1(C.CMD_SET_FLOOR_LED, u8(int(parts[1])));
      case 'ACT': return n < 2 ? 0 : packB1(C.CMD_ACT, u8(int(parts[1])));
      case 'SET_RGB': {
        if (n < 4) return 0;
        const r = u8(int(parts[1])), g = u8(int(parts[2])), b = u8(int(parts[3]));
        return u32(C.CMD_LED_COLOR + u32(b << 8) + u32(g << 16) + u32(r << 24));
      }
      case 'GLOW': return n < 2 ? 0 : packB1(C.CMD_GLOW, u8(int(parts[1])));

      // --- drivetrain settings ---
      case 'SET_STOPPING': return u32(C.CMD_SET_STOPPING + u32(u32(i16(n > 1 ? int(parts[1]) : 0)) << 8));
      case 'SET_ACC': return u32(C.CMD_SET_DRIVE_ACC + u32(u32(i8(n > 1 ? int(parts[1]) : 0)) << 8));
      case 'SET_SENS': return u32(C.CMD_SET_DRIVE_SENS + u32(u32(i8(n > 1 ? int(parts[1]) : 100)) << 8));
      case 'SET_VELOCITY': return u32(C.CMD_SET_VELOCITY + u32(u32(i16(n > 1 ? int(parts[1]) : 0)) << 8));
      case 'SET_HEADING': return u32(C.CMD_SET_HEADING + u32(u32(i16(n > 1 ? int(parts[1]) : 0)) << 8));
      case 'SET_TIMEOUT': return u32(C.CMD_SET_TIMEOUT + u32(u32(n > 1 ? int(parts[1]) : 0) << 8));
      case 'SET_TURNRATE': return u32(C.CMD_SET_TURNRATE + u32(u32(i16(n > 1 ? int(parts[1]) : 0)) << 8));
      case 'CAL_GYRO': return C.CMD_CAL_GYRO;
      case 'RESET_HEADING': return u32(C.CMD_RESET_HEADING + u32(u32(i16(n > 1 ? int(parts[1]) : 0)) << 8));
      case 'RESET_POS': return u32(C.CMD_RESET_POS + u32(u32(i16(n > 1 ? int(parts[1]) : 0)) << 8));

      // --- control ---
      case 'DELAY':
      case 'WAIT': return u32(C.CMD_DELAY + u32(u32(n > 1 ? int(parts[1]) : 0) << 8));
      case 'WAIT_UNTIL': return n < 2 ? 0 : packB1(C.CMD_WAIT_UNTIL, u8(int(parts[1])));
      case 'GOTO': return packB1(C.CMD_GOTO, u8(n > 1 && parts[1] !== '' ? int(parts[1]) : 0));
      case 'END': return C.CMD_END;
      case 'PAUSE': return C.CMD_PAUSE;
      case 'IF_LIGHT': return n < 2 ? 0 : packB1(C.CMD_IF_LIGHT, u8(int(parts[1])));
      case 'IF_BUTTON': {
        if (n < 3) return 0;
        return u32(C.CMD_IF_BUTTON + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(i8(int(parts[2]))) << 16));
      }
      case 'IF_CRASH': return C.CMD_IF_CRASH;
      case 'IF_COLOR': return n < 2 ? 0 : packB1(C.CMD_IF_COLOR, u8(int(parts[1])));
      case 'IF_PROX': {
        if (n < 3) return 0;
        return u32(C.CMD_IF_PROX + u32(u16(i8(int(parts[1]))) << 8) + u32(u32(u8(int(parts[2]))) << 16));
      }
      case 'ELSE': return C.CMD_ELSE;
      case 'END_IF': return C.CMD_ENDIF;

      // --- drivetrain motion ---
      case 'DRIVE_STOP': return packB1(C.CMD_STOP_DRIVE, u8(n > 1 ? int(parts[1]) : 0));
      case 'DRIVE': return n < 2 ? 0 : u32(C.CMD_FWD + u32(i16(int(parts[1])) << 8));
      case 'DRIVE_FOR': {
        if (n < 2) return 0;
        const dist = i16(int(parts[1]));
        let vel = 0;
        if (n > 2) {
          const t = i16(int(parts[2]));
          if (t > 100) vel = 100; else if (t < 0) return 0; else vel = u8(t);
        }
        return u32(C.CMD_FWD_FOR + u32(u16(dist) << 8) + u32(u8(vel) << 24));
      }
      case 'DRIVE_UNTIL': {
        if (n < 2) return 0;
        const ev = u8(int(parts[1]));
        const vel = i16(n > 2 ? int(parts[2]) : 0);
        return u32(C.CMD_FWD_UNTIL + u32(u16(ev) << 8) + u32(u32(vel) << 16));
      }
      case 'TURN_UNTIL': {
        if (n < 2) return 0;
        const ev = u8(int(parts[1]));
        const rate = i16(n > 2 ? int(parts[2]) : 0);
        return u32(C.CMD_TURN_UNTIL + u32(u16(ev) << 8) + u32(u32(rate) << 16));
      }
      case 'TURN_RANDOM': return u32(C.CMD_TURN_RAND + u32(u16(i16(n > 1 ? int(parts[1]) : 0)) << 8));
      case 'TURN_FOR':
      case 'TURN_TO': {
        if (n < 2) return 0;
        const dist = i16(int(parts[1]));
        let vel = 0;
        if (n > 2) {
          const t = u16(int(parts[2]));
          vel = t > 100 ? 100 : u8(t);
        }
        const op = cmd === 'TURN_FOR' ? C.CMD_TURN_FOR : C.CMD_TURN_TO;
        return u32(op + u32(u16(dist) << 8) + u32(u8(vel) << 24));
      }
      case 'TURN': return n < 2 ? 0 : u32(C.CMD_TURN + u32(u16(i16(int(parts[1]))) << 8));

      // --- LED bumper / magnet (port 0-3) ---
      case 'SET_SWITCH_LED': {
        if (n < 3) return 0;
        return u32(C.CMD_P_SET_LED + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(i16(int(parts[2]))) << 16));
      }
      case 'MAG_HOLD': {
        if (n < 3) return 0;
        return u32(C.CMD_P_HOLD + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(i8(int(parts[2]))) << 16));
      }
      case 'MAG_BOOST':
      case 'MAG_DROP': {
        if (n < 3) return 0;
        const op = cmd === 'MAG_BOOST' ? C.CMD_P_BOOST : C.CMD_P_DROP;
        return u32(op + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(u16(int(parts[2]))) << 16));
      }
      case 'MAG_SET_POWER': {
        if (n < 3) return 0;
        return u32(C.CMD_P_MAG_SET_POWER + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(u8(int(parts[2]))) << 16));
      }

      // --- motors (port 0-3) ---
      case 'SET_I_LIMIT': {
        if (n < 2) return 0;
        return u32(C.CMD_P_SET_I_LIMIT + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(u16(n > 2 ? int(parts[2]) : 0)) << 16));
      }
      case 'SET_MOTOR_TIMEOUT':
      case 'SET_MOTOR_STALL_TIMEOUT': {
        if (n < 3) return 0;
        const op = cmd === 'SET_MOTOR_TIMEOUT' ? C.CMD_P_SET_TIMEOUT : C.CMD_P_SET_STALL_TO;
        return u32(op + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(u16(int(parts[2]))) << 16));
      }
      case 'SET_MOTOR_POS': {
        if (n < 2) return 0;
        const pos = n > 2 ? int(parts[2]) : 0; // int32 in the original
        return u32(C.CMD_P_SET_POS + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(pos) << 16));
      }
      case 'SET_MOTOR_VEL':
      case 'SET_MOTOR_BRAKE': {
        if (n < 3) return 0;
        const op = cmd === 'SET_MOTOR_VEL' ? C.CMD_P_SET_VEL : C.CMD_P_SET_BRAKE;
        return u32(op + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(i16(int(parts[2]))) << 16));
      }
      case 'STOP_MOTOR': {
        if (n < 2) return 0;
        return u32(C.CMD_P_STOP + u32(u16(u8(int(parts[1]))) << 8) + u32(u32(u8(n > 2 ? int(parts[2]) : 0)) << 16));
      }
      case 'SPIN_TO':
      case 'SPIN_FOR':
      case 'SPIN':
      case 'SPIN_TO_A': {
        if (n < 3) return 0;
        const op = { SPIN_TO: C.CMD_P_SPIN_TO, SPIN_FOR: C.CMD_P_SPIN_FOR, SPIN: C.CMD_P_SPIN, SPIN_TO_A: C.CMD_P_SPIN_TO_A }[cmd];
        return u32(op + u32(u16(u8(int(parts[1]))) << 8) + u32(u16(i16(int(parts[2]))) << 16));
      }

      // --- robot arm preset helpers (rotation = port 0, tilt = port 3) ---
      case 'SET_ARM_ROTATION': return u32(C.CMD_P_SET_POS + u32(u32(i16(n > 1 ? int(parts[1]) : 0)) << 16));
      case 'SET_ARM_ROTATE_VEL': return u32(C.CMD_P_SET_VEL + u32(u32(i16(int(parts[1]))) << 16));
      case 'ARM_STOP_ROTATE': return u32(C.CMD_P_STOP + u32(u32(u8(n > 1 ? int(parts[1]) : 0)) << 16));
      case 'ARM_ROTATE_TO': return n < 2 ? 0 : u32(C.CMD_P_SPIN_TO + u32(u16(i16(int(parts[1]))) << 16));
      case 'ARM_ROTATE_FOR': return n < 2 ? 0 : u32(C.CMD_P_SPIN_FOR + u32(u16(i16(int(parts[1]))) << 16));
      case 'ARM_ROTATE': return n < 2 ? 0 : u32(C.CMD_P_SPIN + u32(u16(i16(int(parts[1]))) << 16));
      case 'ARM_ROTATE_TO_A': return n < 2 ? 0 : u32(C.CMD_P_SPIN_TO_A + u32(u16(i16(int(parts[1]))) << 16));
      case 'SET_ARM_TILT': return u32(C.CMD_P_SET_POS + u32(u16(3) << 8) + u32(u32(i16(n > 1 ? int(parts[1]) : 0)) << 16));
      case 'SET_ARM_TILT_VEL': return u32(C.CMD_P_SET_VEL + u32(u16(3) << 8) + u32(u32(i16(int(parts[1]))) << 16));
      case 'ARM_STOP_TILT': return u32(C.CMD_P_STOP + u32(u16(3) << 8) + u32(u32(u8(n > 1 ? int(parts[1]) : 0)) << 16));
      case 'ARM_TILT': return n < 2 ? 0 : u32(C.CMD_P_SPIN + u32(u16(3) << 8) + u32(u16(i16(int(parts[1]))) << 16));
      case 'ARM_TILT_FOR': return n < 2 ? 0 : u32(C.CMD_P_SPIN_FOR + u32(u16(3) << 8) + u32(u16(i16(int(parts[1]))) << 16));
      case 'ARM_TILT_TO': return n < 2 ? 0 : u32(C.CMD_P_SPIN_TO + u32(u16(3) << 8) + u32(u16(i16(int(parts[1]))) << 16));

      // --- sound (123 / coder) ---
      case 'PLAY_SOUND': return n < 2 ? 0 : u32(C.CMD_SOUND + u32(0x03 << 24) + u32(u16(u8(int(parts[1]))) << 16));
      case 'PLAY_MIDI': return n < 2 ? 0 : u32(C.CMD_SOUND + u32(0x02 << 24) + u32(u16(u8(int(parts[1]))) << 16));
      case 'PLAY_TONE': return n < 2 ? 0 : u32(C.CMD_SOUND + u32(0x01 << 24) + u32(u32(u8(n > 2 ? int(parts[2]) : 0)) << 16));
      case 'SET_VOLUME': return n < 2 ? 0 : u32(C.CMD_SET_VOLUME + u32(u32(u8(int(parts[1]))) << 8));

      // --- eye sensor ---
      case 'SET_SENSOR_LED': return n < 2 ? 0 : u32(C.CMD_SET_SENS_LED + u32(u32(u8(int(parts[1]))) << 8));
      case 'SET_SENSOR_PROX': return n < 2 ? 0 : u32(C.CMD_SET_SENS_PROX + u32(u32(u8(int(parts[1]))) << 8));
      default:
        return 0;
    }
  } catch (e) {
    return 0;
  }
}

/** uint32 -> 4 little-endian bytes */
export function uint32ToBytes(value) {
  const v = u32(value);
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
}

/** Build the 5-byte "execute single command" packet for the ProgramCommand characteristic. */
export function buildExecuteSinglePacket(command) {
  const raw = uint32ToBytes(command);
  return new Uint8Array([ProgramConst.PROG_CMD_EXE_SINGLE, raw[0], raw[1], raw[2], raw[3]]);
}

/** Build a packet holding up to 4 commands back to back. */
export function buildExecuteMultiPacket(commands) {
  const list = commands.slice(0, 4);
  const out = new Uint8Array(list.length * 5);
  list.forEach((c, i) => out.set(buildExecuteSinglePacket(c), i * 5));
  return out;
}

/** PROG_CMD_SET_PORT_CONFIG packet (port 0-3, devType = VEXPortDeviceID, flags = VEXPortConfigFlags). */
export function buildPortConfigPacket(port, devType, flags, iLimitPct = 100, iLimitMax = 500, accel = 1, defaultVel = 50) {
  return new Uint8Array([
    ProgramConst.PROG_CMD_SET_PORT_CONFIG,
    u8(port), u8(devType), u8(flags),
    iLimitMax & 0xff, (iLimitMax >>> 8) & 0xff,
    u8(iLimitPct), u8(accel), u8(defaultVel),
  ]);
}

/** PROG_CMD_SET_BOT_CONFIG_PRESET packet. */
export function buildConfigPresetPacket(preset) {
  return new Uint8Array([ProgramConst.PROG_CMD_SET_BOT_CONFIG_PRESET, u8(preset)]);
}

/** Controller stick/button values (0-255, 127 = centre). */
export function buildControlValuesPacket(leftX = 127, leftY = 127, rightX = 127, rightY = 127, buttons1 = 0, buttons2 = 0) {
  return new Uint8Array([ProgramConst.PROG_CMD_SET_CONTROLL_VALUES, u8(leftX), u8(leftY), u8(rightX), u8(rightY), u8(buttons1), u8(buttons2)]);
}

/** Bind a robot command to a controller button press/release. */
export function buildButtonCommandPacket(buttonId, pressed, command) {
  const raw = uint32ToBytes(command);
  return new Uint8Array([ProgramConst.PROG_CMD_SET_BUTTON_CMD, u8(buttonId), pressed ? 1 : 0, raw[0], raw[1], raw[2], raw[3]]);
}

/** Choose how the firmware interprets the sticks (VEXDriveStickType). */
export function buildStickModePacket(stickType, driveSensitivity = 50, turnSensitivity = 25) {
  return new Uint8Array([ProgramConst.PROG_CMD_SET_STICK_MODE_CMD, u8(stickType), u8(driveSensitivity), u8(turnSensitivity)]);
}

export const VEXPortDeviceID = Object.freeze({
  Unknown: 0x00, Magnet: 0x10, Motor: 0x20, Pot: 0x40, Bumper: 0x80,
  DriveTrain: 0xa0, TouchRGB: 0xb0, Sound: 0xc0, Drive123: 0xd0, Motor123: 0xe0,
});

export const VEXPortConfigFlags = Object.freeze({
  FLAG_DISABLED: 0, FLAG_ENABLED: 1, FLAG_REVERSE: 2, FLAG_DRV_LEFT: 4, FLAG_DRV_RIGHT: 8, FLAG_OPTIONAL: 16,
});

export const VEXRobotConfigPreset = Object.freeze({
  CustomConfig: 0, GOCodeBase: 1, GOArm: 2, GOControl: 3, BOT123: 17, AutoConfig: 250, NoConfig: 255,
});

export const VEXDriveStickType = Object.freeze({
  Tank: 1, Left_Stick: 2, Right_Stick: 3, Split_Stick_Left: 4, Split_Stick_Right: 5,
});

export const VEXButtonValues = Object.freeze({
  F_DOWN: 0, E_DOWN: 1, F_UP: 2, E_UP: 3, L_DOWN: 4, L_UP: 5, R_DOWN: 6, R_UP: 7, L_STICK: 8, R_STICK: 9, POWER: 10,
});

export const BrakeMode = Object.freeze({ Brake: 1, Coast: 2, Hold: 3 });

/** Event ids used by DRIVE_UNTIL / TURN_UNTIL / WAIT_UNTIL */
export const EventType = Object.freeze({ Crash: 1, Object: 2, Button1: 3, Button2: 4, Button3: 5, Button4: 6 });
