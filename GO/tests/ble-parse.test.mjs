// Checks the notification parsers against hand-built packets that follow the
// layouts documented in docs/02-bluetooth-protocol.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSensorStatus, parsePortStatus, parseAcks } from '../app/js/ble.js';
import { hueToColor } from '../app/js/robot.js';

const dv = (bytes) => new DataView(new Uint8Array(bytes).buffer);

test('sensor status: IMU, eye hue/brightness/proximity', () => {
  const b = new Uint8Array(20);
  const v = new DataView(b.buffer);
  v.setInt16(0, 100, true); v.setInt16(2, -200, true); v.setInt16(4, 8192, true); // acc
  v.setInt16(6, 1, true); v.setInt16(8, 2, true); v.setInt16(10, 3, true); // gyro
  b[12] = 10; b[13] = 0xf6; b[14] = 64; // pitch roll yaw (int8 * 1.41)
  b[15] = 85; b[16] = 70; b[17] = 120; // hue(/1.41) brightness proximity
  v.setInt16(18, 123, true);
  const s = parseSensorStatus(v);
  assert.equal(s.accX, 100); assert.equal(s.accY, -200); assert.equal(s.accelZG, 1);
  assert.equal(s.pitch, 14); assert.equal(s.roll, -14); assert.equal(s.yaw, 90);
  assert.equal(s.hue, 119); assert.equal(s.brightness, 70); assert.equal(s.proximity, 120); assert.equal(s.floor, 123);
  assert.equal(parseSensorStatus(dv([1, 2, 3])), null);
});

test('port command status: drivetrain, bumper and magnet records', () => {
  const pkt = [
    0xa4, 0xff, 10, /* battery */ 87, /* preset */ 1, /* flags */ 0x02, /* vel */ 25, /* heading */ 0x5a, 0x00, /* pos */ 0x10, 0x00, 0x00, 0x00,
    0x81, 0xff, 3, /* pwm */ 0x9c, /* state */ 1, /* flags */ 0,
    0x12, 0x83, 2, /* pwm */ 100, /* flags */ 0,
    0,
  ];
  const r = parsePortStatus(dv(pkt));
  assert.equal(r.battery, 87); assert.equal(r.configPreset, 1);
  assert.equal(r.ports.length, 3);
  const dt = r.ports[0];
  assert.equal(dt.port, 4); assert.equal(dt.deviceID, 0xa0); assert.equal(dt.velocity, 25); assert.equal(dt.heading, 90); assert.equal(dt.position, 16); assert.equal(dt.crash, true);
  const bump = r.ports[1];
  assert.equal(bump.port, 1); assert.equal(bump.pwm, -100); assert.equal(bump.pressed, true);
  const mag = r.ports[2];
  assert.equal(mag.port, 2); assert.equal(mag.activeCommand, 0x83); assert.equal(mag.pwm, 100);
});

test('acks: single-command ack carries the echoed uint32', () => {
  const acks = parseAcks(dv([0xaa, 0x76, 0x20, 0x02, 0xc8, 0x00, 0x32, 0xaa, 0x76, 0x50, 0x01]));
  assert.equal(acks.length, 2);
  assert.equal(acks[0].cmd, 0x20); assert.equal(acks[0].data, 0x3200c802);
  assert.equal(acks[1].cmd, 0x50); assert.equal(acks[1].data, 1);
});

test('hue thresholds match VEXcode GO', () => {
  assert.equal(hueToColor(0), 'red'); assert.equal(hueToColor(350), 'red');
  assert.equal(hueToColor(100), 'green'); assert.equal(hueToColor(200), 'blue');
  assert.equal(hueToColor(30), 'none'); assert.equal(hueToColor(157), 'none'); assert.equal(hueToColor(300), 'none');
});
