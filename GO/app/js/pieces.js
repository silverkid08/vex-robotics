// Puzzle piece catalogue.
//
// A piece is a picture the child can drag into the program. Each definition has:
//   id        - stable name saved in programs (never rename)
//   group     - palette colour family
//   icon(p)   - SVG for the current parameter value
//   params    - optional list of values the child cycles through by tapping
//               (numeric lists also get a - / + stepper on long-press)
//   label(p)  - short helper text for grown-ups (hidden unless labels are on)
//   help      - one sentence for the parent guide
//   run(ctx)  - async action on the robot (ctx = { robot, piece, signal, log })
//   container - true for pieces that hold other pieces (repeat)
//
// Keep it picture-first: every piece must be understandable by a four year old
// without the label. See docs/07-kid-gui-design.md.

import { Icons } from './icons.js';
import { EventType } from './encoder.js';

/** One "step" of forward/backward movement in mm (about one VEX GO field tile). */
export const STEP_MM = 150;

export const Groups = Object.freeze({
  move: { color: '#4da3ff', dark: '#1d6fd1', name: 'Move' },
  turn: { color: '#7b61ff', dark: '#4b35c9', name: 'Turn' },
  light: { color: '#ffd166', dark: '#d19a00', name: 'Light' },
  magnet: { color: '#ef476f', dark: '#b31e45', name: 'Magnet' },
  wait: { color: '#ff9f43', dark: '#c76a10', name: 'Wait & look' },
  loop: { color: '#2ecc40', dark: '#1c8d2b', name: 'Repeat' },
});

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('stopped')); }, { once: true });
});

/** Wait until predicate(robot.sensors) is true, polling sensor events. */
const waitUntil = (robot, pred, signal, timeoutMs = 120000) => new Promise((resolve, reject) => {
  if (pred(robot.sensors)) { resolve(); return; }
  const onSensors = () => { if (pred(robot.sensors)) { cleanup(); resolve(); } };
  const onAbort = () => { cleanup(); reject(new Error('stopped')); };
  const timer = setTimeout(() => { cleanup(); resolve(); }, timeoutMs);
  const cleanup = () => { robot.removeEventListener('sensors', onSensors); signal?.removeEventListener('abort', onAbort); clearTimeout(timer); };
  robot.addEventListener('sensors', onSensors);
  signal?.addEventListener('abort', onAbort, { once: true });
});

const steps = (n) => `${n} step${n === 1 ? '' : 's'} (${(n * STEP_MM) / 10} cm)`;
const STEP_CHOICES = [1, 2, 3, 4, 5];
const TURN_CHOICES = [90, 45, 135, 180];

export const Pieces = [
  {
    id: 'forward', group: 'move', params: STEP_CHOICES, defaultParam: 1,
    icon: (p) => Icons.forward(p),
    label: (p) => `Forward ${steps(p || 1)}`,
    help: 'Drives forward. Each dot is one step of 15 cm. Tap to add dots, hold for − / +.',
    run: ({ robot, piece }) => robot.driveFor(STEP_MM * (piece.param || 1)),
  },
  {
    id: 'backward', group: 'move', params: STEP_CHOICES, defaultParam: 1,
    icon: (p) => Icons.backward(p),
    label: (p) => `Backward ${steps(p || 1)}`,
    help: 'Drives backward. Each dot is one step of 15 cm.',
    run: ({ robot, piece }) => robot.driveFor(-STEP_MM * (piece.param || 1)),
  },
  {
    id: 'turnRight90', group: 'turn', params: TURN_CHOICES, defaultParam: 90,
    icon: (p) => Icons.turnRight(p || 90),
    label: (p) => `Turn right ${p || 90}°`,
    help: 'Turns right. The arc shows how far: tap to choose 90°, 45°, 135° or 180°.',
    run: ({ robot, piece }) => robot.turnFor(piece.param || 90),
  },
  {
    id: 'turnLeft90', group: 'turn', params: TURN_CHOICES, defaultParam: 90,
    icon: (p) => Icons.turnLeft(p || 90),
    label: (p) => `Turn left ${p || 90}°`,
    help: 'Turns left. Tap to choose 90°, 45°, 135° or 180°.',
    run: ({ robot, piece }) => robot.turnFor(-(piece.param || 90)),
  },
  { id: 'turn180', group: 'turn', icon: () => Icons.turn180(), label: () => 'Turn around (180°)', help: 'Turns all the way around to face the other way.', run: ({ robot }) => robot.turnFor(180) },
  { id: 'turn360', group: 'turn', icon: () => Icons.turn360(), label: () => 'Spin once (360°)', help: 'Spins a full circle.', run: ({ robot }) => robot.turnFor(360) },
  { id: 'ledRed', group: 'light', icon: () => Icons.ledRed(), label: () => 'Light red', help: 'Makes the bumper light glow red.', run: ({ robot }) => robot.setBumperColor('red') },
  { id: 'ledGreen', group: 'light', icon: () => Icons.ledGreen(), label: () => 'Light green', help: 'Makes the bumper light glow green.', run: ({ robot }) => robot.setBumperColor('green') },
  { id: 'ledOff', group: 'light', icon: () => Icons.ledOff(), label: () => 'Light off', help: 'Turns the bumper light off.', run: ({ robot }) => robot.setBumperColor('off') },
  { id: 'magnetOn', group: 'magnet', icon: () => Icons.magnetOn(), label: () => 'Magnet grab', help: 'Turns the electromagnet on to pick up a disk.', run: ({ robot }) => robot.magnetBoost() },
  { id: 'magnetOff', group: 'magnet', icon: () => Icons.magnetOff(), label: () => 'Magnet let go', help: 'Turns the electromagnet off to drop the disk.', run: ({ robot }) => robot.magnetDrop() },
  {
    id: 'wait', group: 'wait', params: [1, 2, 3, 4, 5], defaultParam: 1,
    icon: (p) => Icons.wait(p),
    label: (p) => `Wait ${p || 1} second${(p || 1) === 1 ? '' : 's'}`,
    help: 'Pauses. Each dot is one second.',
    run: ({ piece, signal }) => sleep(1000 * (piece.param || 1), signal),
  },
  {
    id: 'waitBump', group: 'wait', icon: () => Icons.waitBump(),
    label: () => 'Wait for a bump',
    help: 'Waits until someone presses the bumper, then carries on.',
    run: async ({ robot, signal }) => {
      await waitUntil(robot, (s) => !s.bumper.pressed, signal, 5000);
      await waitUntil(robot, (s) => s.bumper.pressed, signal);
    },
  },
  {
    id: 'waitSee', group: 'wait', params: ['red', 'green', 'blue'], defaultParam: 'red',
    icon: (p) => Icons.waitSee(p),
    label: (p) => `Wait to see ${p || 'red'}`,
    help: 'Waits until the eye sees something of that colour. Tap to pick red, green or blue.',
    run: ({ robot, piece, signal }) => waitUntil(robot, (s) => s.eye.foundObject && s.eye.color === (piece.param || 'red'), signal),
  },
  {
    id: 'waitObject', group: 'wait', icon: () => Icons.waitObject(),
    label: () => 'Wait to see something',
    help: 'Waits until the eye sees any object close by.',
    run: ({ robot, signal }) => waitUntil(robot, (s) => s.eye.foundObject, signal),
  },
  {
    id: 'repeat', group: 'loop', container: true, params: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, Infinity], defaultParam: 2,
    icon: (p) => Icons.repeat(p),
    label: (p) => (p === Infinity ? 'Repeat forever' : `Repeat ${p || 2} time${(p || 2) === 1 ? '' : 's'}`),
    help: 'A big piece that holds other pieces: everything inside runs again and again. Dots = how many times (1 to 10); the wavy line means forever (press stop to end). A repeat cannot go inside another repeat.',
  },
];

export const PieceById = Object.fromEntries(Pieces.map((p) => [p.id, p]));

let counter = 0;
/** Create a program node for a palette piece. */
export function makePiece(id, param) {
  const def = PieceById[id];
  if (!def) throw new Error(`unknown piece ${id}`);
  const piece = { uid: `p${Date.now().toString(36)}${(counter++).toString(36)}`, id };
  if (def.params) piece.param = param ?? def.defaultParam;
  if (def.container) piece.children = [];
  return piece;
}

/** Cycle to the next parameter value (tap). */
export function nextParam(piece) {
  const def = PieceById[piece.id];
  if (!def?.params) return;
  const i = def.params.indexOf(piece.param);
  piece.param = def.params[(i + 1) % def.params.length];
}

/** Move one step through the parameter list (stepper − / +), clamped at the ends. */
export function stepParam(piece, delta) {
  const def = PieceById[piece.id];
  if (!def?.params) return;
  const list = def.params.every((v) => typeof v === 'number') ? [...def.params].sort((a, b) => a - b) : def.params;
  const i = Math.max(0, list.indexOf(piece.param));
  const j = Math.min(list.length - 1, Math.max(0, i + delta));
  piece.param = list[j];
}

export function labelFor(piece) {
  const def = PieceById[piece.id];
  return def?.label ? def.label(piece.param) : piece.id;
}

/** Serialise for storage (Infinity is not JSON). */
export function serializeProgram(program) {
  const ser = (p) => ({ id: p.id, param: p.param === Infinity ? 'inf' : p.param, children: p.children?.map(ser) });
  return JSON.stringify({ order: program.order, pieces: program.pieces.map(ser) });
}

export function deserializeProgram(text) {
  const data = JSON.parse(text);
  const de = (p) => {
    const piece = makePiece(p.id, p.param === 'inf' ? Infinity : p.param);
    if (piece.children && p.children) piece.children = p.children.map(de);
    return piece;
  };
  return { order: data.order === 'ttb' ? 'ttb' : 'ltr', pieces: (data.pieces || []).map(de) };
}

export const EyeEvent = EventType;
