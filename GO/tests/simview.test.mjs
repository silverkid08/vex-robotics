// The path prediction used to frame the pretend-robot window before a program runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { predictPath } from '../app/js/simview.js';
import { makePiece, STEP_MM } from '../app/js/pieces.js';

test('predictPath follows forward/turn pieces and repeats', () => {
  const rep = makePiece('repeat', 4);
  rep.children.push(makePiece('forward', 2), makePiece('turnRight90', 90));
  const { pts, bounds } = predictPath({ order: 'ltr', pieces: [rep] });
  // a square of 300 mm sides, back to the start
  assert.equal(pts.length, 5);
  const last = pts[pts.length - 1];
  assert.ok(Math.abs(last[0]) < 1e-6 && Math.abs(last[1]) < 1e-6);
  assert.ok(Math.abs(bounds.maxX - 2 * STEP_MM) < 1e-6);
  assert.ok(Math.abs(bounds.minY + 2 * STEP_MM) < 1e-6);
});

test('predictPath treats forever as a few passes and ignores non-motion pieces', () => {
  const rep = makePiece('repeat', Infinity);
  rep.children.push(makePiece('forward', 1), makePiece('ledRed'), makePiece('wait', 2));
  const { bounds } = predictPath({ order: 'ltr', pieces: [rep, makePiece('backward', 1)] });
  assert.ok(bounds.minY < 0 && bounds.maxY === 0);
});
