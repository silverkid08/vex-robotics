// Runs a tiny puzzle program against the pretend brain (SimBrain) and checks
// that the robot actually moved, turned and lit its bumper. This exercises
// GoRobot's "wait until the port reports the command finished" logic end to end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SimBrain } from '../app/js/sim.js';
import { GoRobot } from '../app/js/robot.js';
import { Runner } from '../app/js/runner.js';
import { makePiece, serializeProgram, deserializeProgram } from '../app/js/pieces.js';

const until = (pred, ms = 8000) => new Promise((resolve, reject) => {
  const t0 = Date.now();
  const i = setInterval(() => { if (pred()) { clearInterval(i); resolve(); } else if (Date.now() - t0 > ms) { clearInterval(i); reject(new Error('timeout')); } }, 20);
});

test('forward, turn, LED program runs on the simulator', async () => {
  const sim = new SimBrain();
  sim.tickMs = 20; sim.speed = 8;
  const robot = new GoRobot(sim);
  await sim.connect();
  const runner = new Runner(robot);
  const seen = [];
  runner.addEventListener('piece', (e) => seen.push(`${e.detail.uid}:${e.detail.state}`));
  const program = { order: 'ltr', pieces: [makePiece('forward', 1), makePiece('turnRight90'), makePiece('ledGreen')] };
  const finished = new Promise((r) => runner.addEventListener('finish', (e) => r(e.detail)));
  runner.run(program);
  const result = await finished;
  assert.equal(result.ok, true, result.error);
  assert.ok(Math.abs(sim.world.y) > 100, `robot should have driven ~150mm, y=${sim.world.y}`);
  assert.ok(Math.abs(((sim.world.heading % 360) + 360) % 360 - 90) < 15, `heading ~90, got ${sim.world.heading}`);
  assert.equal(sim.world.bumper.led, 100);
  assert.equal(seen.length, 6);
  await sim.disconnect();
});

test('repeat container loops its children and stop aborts a forever loop', async () => {
  const sim = new SimBrain();
  sim.tickMs = 20; sim.speed = 8;
  const robot = new GoRobot(sim);
  await sim.connect();
  const runner = new Runner(robot);
  const rep = makePiece('repeat', 2);
  rep.children.push(makePiece('ledRed'), makePiece('ledOff'));
  let ledChanges = 0;
  sim.addEventListener('log', (e) => { if (e.detail.includes('SET_SWITCH_LED')) ledChanges++; });
  await new Promise((r) => { runner.addEventListener('finish', r, { once: true }); runner.run({ order: 'ttb', pieces: [rep] }); });
  assert.equal(ledChanges, 4);

  const forever = makePiece('repeat', Infinity);
  forever.children.push(makePiece('wait', 1));
  const done = new Promise((r) => runner.addEventListener('finish', (e) => r(e.detail), { once: true }));
  runner.run({ order: 'ltr', pieces: [forever] });
  await until(() => runner.running);
  await new Promise((r) => setTimeout(r, 100));
  await runner.stop();
  const res = await done;
  assert.equal(res.ok, false);
  assert.equal(runner.running, false);
  await sim.disconnect();
});

test('wait-for-bump resolves when the pretend bumper is pressed', async () => {
  const sim = new SimBrain();
  sim.tickMs = 20; sim.speed = 8;
  const robot = new GoRobot(sim);
  await sim.connect();
  const runner = new Runner(robot);
  const done = new Promise((r) => runner.addEventListener('finish', (e) => r(e.detail), { once: true }));
  runner.run({ order: 'ltr', pieces: [makePiece('waitBump'), makePiece('ledGreen')] });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(sim.world.bumper.led, 0, 'should still be waiting');
  sim.pressBumper(true);
  const res = await done;
  assert.equal(res.ok, true);
  assert.equal(sim.world.bumper.led, 100);
  await sim.disconnect();
});

test('programs round-trip through storage including the infinite repeat', () => {
  const rep = makePiece('repeat', Infinity);
  rep.children.push(makePiece('waitSee', 'blue'));
  const text = serializeProgram({ order: 'ttb', pieces: [makePiece('backward', 3), rep] });
  const back = deserializeProgram(text);
  assert.equal(back.order, 'ttb');
  assert.equal(back.pieces[0].param, 3);
  assert.equal(back.pieces[1].param, Infinity);
  assert.equal(back.pieces[1].children[0].param, 'blue');
});

test('remote-control stick values move the pretend robot (Drive tab path)', async () => {
  const sim = new SimBrain();
  sim.tickMs = 20; sim.speed = 8;
  const robot = new GoRobot(sim);
  await sim.connect();
  await robot.startRemoteControl();
  const y0 = sim.world.y;
  for (let i = 0; i < 10; i++) { await robot.sendRemoteControl(0, 1, 0, 1, 0); await new Promise((r) => setTimeout(r, 25)); }
  assert.ok(sim.world.y < y0 - 20, `robot should have driven forward, dy=${sim.world.y - y0}`);
  const h0 = sim.world.heading;
  for (let i = 0; i < 10; i++) { await robot.sendRemoteControl(0, 1, 0, -1, 0); await new Promise((r) => setTimeout(r, 25)); }
  assert.ok(Math.abs(sim.world.heading - h0) > 5, `robot should have turned, dh=${sim.world.heading - h0}`);
  await robot.stopRemoteControl();
  assert.equal(sim.world.driveVel, 0);
  await sim.disconnect();
});

test('speed piece sets drive and turn velocity for the pieces after it', async () => {
  const sim = new SimBrain();
  sim.tickMs = 20; sim.speed = 8;
  const robot = new GoRobot(sim);
  await sim.connect();
  const runner = new Runner(robot);
  const tx = [];
  sim.addEventListener('log', (e) => tx.push(e.detail));
  const program = { order: 'ltr', pieces: [makePiece('speed', 5), makePiece('forward', 1), makePiece('speed', 1), makePiece('turnRight90', 90)] };
  const finished = new Promise((r) => runner.addEventListener('finish', (e) => r(e.detail)));
  runner.run(program);
  const result = await finished;
  assert.equal(result.ok, true, result.error);
  // level 5 = 100 % → firmware 50; level 1 = 17 % → firmware 9 (VEXcode halves what the user asks for, rounded)
  assert.ok(tx.some((l) => l.includes('SET_VELOCITY 50')), `expected SET_VELOCITY 50 in ${tx.join(' | ')}`);
  assert.ok(tx.some((l) => l.includes('SET_TURNRATE 50')), 'expected SET_TURNRATE 50');
  assert.ok(tx.some((l) => /DRIVE_FOR \d+ 50/.test(l)), 'forward should drive at the fast speed');
  assert.ok(tx.some((l) => l.includes('SET_VELOCITY 9')), 'expected SET_VELOCITY 9');
  assert.ok(tx.some((l) => /TURN_FOR 90 9/.test(l)), 'turn should use the slow speed');
  assert.equal(sim.world.velocity, 9, 'the pretend brain keeps the last speed');
  await sim.disconnect();
});
