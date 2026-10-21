// Verifies app/js/encoder.js against golden vectors produced by running
// VEXcode GO's own encoder (vex-ble-device-manager ProgramUtil.scriptLineToCommand)
// in Node. Regenerate the fixture with tools/regen-golden.md instructions if VEX
// changes the protocol.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  scriptLineToCommand, uint32ToBytes, buildExecuteSinglePacket, buildExecuteMultiPacket,
  buildPortConfigPacket, buildConfigPresetPacket, buildControlValuesPacket,
  buildButtonCommandPacket, buildStickModePacket,
} from '../app/js/encoder.js';

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(here, 'fixtures', 'vex-command-golden.json'), 'utf8'));

test('every golden script line encodes to the same bytes as VEXcode GO', () => {
  const failures = [];
  for (const [script, expected] of Object.entries(golden)) {
    const value = scriptLineToCommand(script);
    const bytes = Array.from(uint32ToBytes(value));
    if (bytes.join(',') !== expected.bytes.join(',')) {
      failures.push(`${script}: got [${bytes}] expected [${expected.bytes}] (value ${value} vs ${expected.value})`);
    }
  }
  assert.deepEqual(failures, []);
});

test('unknown and malformed lines encode to 0, NONE to 0xff', () => {
  assert.equal(scriptLineToCommand('BOGUS 1'), 0);
  assert.equal(scriptLineToCommand(''), 0);
  assert.equal(scriptLineToCommand('DRIVE'), 0);
  assert.equal(scriptLineToCommand('NONE'), 0xff);
});

test('packet builders produce the documented layouts', () => {
  assert.deepEqual(Array.from(buildExecuteSinglePacket(scriptLineToCommand('DRIVE_FOR 200 50'))), [0x20, 2, 200, 0, 50]);
  assert.deepEqual(Array.from(buildExecuteMultiPacket([1, 0x11])), [0x20, 1, 0, 0, 0, 0x20, 0x11, 0, 0, 0]);
  assert.deepEqual(Array.from(buildPortConfigPacket(0, 0x20, 1 | 4, 100, 500)), [0x51, 0, 0x20, 5, 0xf4, 0x01, 100, 1, 50]);
  assert.deepEqual(Array.from(buildConfigPresetPacket(1)), [0x50, 1]);
  assert.deepEqual(Array.from(buildControlValuesPacket(127, 200, 127, 127, 0b101, 0)), [0xa1, 127, 200, 127, 127, 5, 0]);
  assert.deepEqual(Array.from(buildButtonCommandPacket(2, true, scriptLineToCommand('SET_SWITCH_LED 1 100'))), [0xa0, 2, 1, 0x85, 1, 100, 0]);
  assert.deepEqual(Array.from(buildStickModePacket(1, 50, 25)), [0xa3, 1, 50, 25]);
});
