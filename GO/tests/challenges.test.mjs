// Every challenge in the catalogue must be solvable with the pieces a child has: each known
// solution is run on the pretend brain with the challenge board loaded and must win. The first
// solution must use exactly `par` pieces (that is what the star grade is measured against), the
// robot must never leave the board, and the closing gate must really stop a slow robot.
import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimBrain } from '../app/js/sim.js';
import { GoRobot } from '../app/js/robot.js';
import { Runner } from '../app/js/runner.js';
import { makePiece } from '../app/js/pieces.js';
import { Challenges, countPieces, gradeSolution } from '../app/js/challenges.js';
import { Arena, parseBoard, CELL } from '../app/js/challenge.js';
import { Solutions } from './fixtures/challenge-solutions.mjs';

const until = (pred, ms = 8000) => new Promise((resolve, reject) => {
  const t0 = Date.now();
  const i = setInterval(() => { if (pred()) { clearInterval(i); resolve(); } else if (Date.now() - t0 > ms) { clearInterval(i); reject(new Error('timeout')); } }, 20);
});

/** [id, param, children] triples → program pieces. */
const build = (list) => list.map(([id, param, kids]) => { const p = makePiece(id, param); if (kids) p.children = build(kids); return p; });

async function setup(def, speed = 20) {
  const sim = new SimBrain();
  sim.tickMs = 5; sim.speed = speed;
  const arena = new Arena(def);
  sim.setArena(arena);
  const robot = new GoRobot(sim);
  await sim.connect();
  const runner = new Runner(robot);
  return { sim, arena, robot, runner };
}

async function runProgram({ sim, arena, runner }, sol) {
  const program = { order: 'ltr', pieces: build(sol.pieces) };
  if (sol.press) setTimeout(() => { sim.pressBumper(true); setTimeout(() => sim.pressBumper(false), 150); }, sol.press);
  const finished = new Promise((r) => runner.addEventListener('finish', (e) => r(e.detail)));
  runner.run(program);
  const result = await finished;
  if (!arena.won) await until(() => arena.won, 600).catch(() => {});
  return { result, program };
}

test('every challenge board parses and has solutions', () => {
  const ids = new Set();
  for (const def of Challenges) {
    assert.ok(!ids.has(def.id), `duplicate id ${def.id}`); ids.add(def.id);
    const b = parseBoard(def);
    assert.ok(b.cols <= 9 && b.rows <= 7, `${def.id}: board too big (${b.cols}x${b.rows})`);
    assert.ok(Solutions[def.id]?.length, `${def.id}: no solution in tests/fixtures/challenge-solutions.mjs`);
    assert.equal(countPieces(build(Solutions[def.id][0].pieces)), def.par, `${def.id}: first solution must have par (${def.par}) pieces`);
    assert.ok(typeof def.hint === 'string' && def.hint.length, `${def.id}: hint for grown-ups`);
  }
  const twoWays = Challenges.filter((d) => Solutions[d.id].length > 1).length;
  assert.ok(twoWays >= Challenges.length / 3, `at least a third of the challenges need two solutions (have ${twoWays})`);
});

describe('every challenge is solvable with its known solutions', { concurrency: 8 }, () => {
for (const def of Challenges) {
  it(`challenge ${def.id} ${def.name} is solvable`, async () => {
    for (const [k, sol] of Solutions[def.id].entries()) {
      const ctx = await setup(def);
      const { result, program } = await runProgram(ctx, sol);
      assert.ok(result.ok || ctx.arena.won, `${def.id} solution ${k + 1}: program error ${result.error}`);
      assert.ok(ctx.arena.won, `${def.id} solution ${k + 1} did not win (progress ${Math.round(ctx.arena.progress() * 100)}%)`);
      if (k === 0) assert.equal(gradeSolution(def, program), 3, 'the par solution earns three stars');
      await ctx.runner.stop();
      await ctx.sim.disconnect();
    }
  });
}
});

test('the robot never leaves a board', async () => {
  await Promise.all(Challenges.map(async (def) => {
    const ctx = await setup(def);
    const { result } = await runProgram(ctx, { pieces: [['forward', 5], ['turnLeft90', 90], ['forward', 5], ['backward', 5]] });
    assert.ok(result.ok, `${def.id}: ${result.error}`);
    const w = ctx.sim.world;
    assert.ok(w.x > 0 && w.y > 0 && w.x < ctx.arena.widthMm && w.y < ctx.arena.heightMm, `${def.id}: robot left the board (${w.x}, ${w.y})`);
    const { c, r } = ctx.arena.cellOf(w.x, w.y);
    assert.ok(!ctx.arena.board.walls.has(`${c},${r}`), `${def.id}: robot inside a wall`);
    await ctx.runner.stop();
    await ctx.sim.disconnect();
  }));
});

test('gate timers only run while a program runs', async () => {
  const def = Challenges.find((d) => d.id === 'c12');
  const ctx = await setup(def);
  await new Promise((r) => setTimeout(r, 2300));
  assert.equal(ctx.arena.gateOpen, false, 'the door stays shut until Play');
  await runProgram(ctx, { pieces: [['wait', 3]] });
  assert.equal(ctx.arena.gateOpen, true, 'the door opened during the program');
  await ctx.sim.disconnect();
});

test('a wall bump presses the bumper, shows the crash and settles the robot on its square', async () => {
  const ctx = await setup(Challenges[0]); // c01: star one ahead, wall beyond
  const { sim, arena } = ctx;
  const seen = { pressed: false, crash: false };
  sim.addEventListener('ports', () => { if (sim.world.bumper.pressed) seen.pressed = true; if (sim.world.crash) seen.crash = true; });
  await runProgram(ctx, { pieces: [['forward', 5]] });
  assert.ok(seen.pressed && seen.crash, 'bumper and crash should have been reported');
  const { c, r } = arena.cellOf(sim.world.x, sim.world.y);
  assert.deepEqual([c, r], [arena.board.star.c, arena.board.star.r], 'robot stops on the star square');
  const centre = arena.centre(c, r);
  assert.ok(Math.abs(sim.world.x - centre.x) < 1 && Math.abs(sim.world.y - centre.y) < 1, 'robot settles on the square centre');
  await ctx.runner.stop(); await sim.disconnect();
});

test('c19: at normal speed the closing door stops the robot', async () => {
  const def = Challenges.find((d) => d.id === 'c19');
  const ctx = await setup(def, 2); // the app runs challenge boards at x2
  ctx.sim.tickMs = 20;
  const program = { order: 'ltr', pieces: build([['forward', 5]]) };
  ctx.runner.run(program);
  await until(() => ctx.arena.gateLocked, 6000);
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(!ctx.arena.won, 'a slow robot must not get through');
  const { c } = ctx.arena.cellOf(ctx.sim.world.x, ctx.sim.world.y);
  assert.ok(c < ctx.arena.board.gates[0].c, `robot must be before the door, is in column ${c}`);
  await ctx.runner.stop(); await ctx.sim.disconnect();
});

test('grades: par = 3 stars, par + 2 = 2 stars, more = 1 star', () => {
  const def = { par: 3 };
  const prog = (n) => ({ pieces: Array.from({ length: n }, () => makePiece('forward', 1)) });
  assert.equal(gradeSolution(def, prog(2)), 3);
  assert.equal(gradeSolution(def, prog(3)), 3);
  assert.equal(gradeSolution(def, prog(5)), 2);
  assert.equal(gradeSolution(def, prog(6)), 1);
  const rep = makePiece('repeat', 2); rep.children = [makePiece('forward', 1), makePiece('turnRight90', 90)];
  assert.equal(countPieces([rep]), 3, 'a repeat counts itself plus its children');
  assert.equal(CELL, 150);
});
