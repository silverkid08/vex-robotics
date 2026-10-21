// Challenge arena: turns a challenge definition (challenges.js) into a board the pretend brain
// (SimBrain) drives around in, with walls that stop the robot, coins / stars / paint tiles / pucks /
// boxes / gates as objectives, and a canvas drawing of it all for the sim window and level cards.
//
// Geometry: the board's top-left corner is world (0, 0); cell (c, r) spans
// [c*CELL, (c+1)*CELL) x [r*CELL, (r+1)*CELL); one cell = one robot step. Heading 0 = up (row - 1).

import { STEP_MM } from './pieces.js';

export const CELL = STEP_MM;      // 150 mm
export const ROBOT_R = 52;        // mm, the pretend robot is a disc this big for wall contact
const BUMP_MS = 600;              // how long the bumper reads pressed / the crash star shows after a wall hit

const DIRS = { N: 0, E: 90, S: 180, W: 270 };
const COLORS = { red: '#ff4136', green: '#2ecc40', blue: '#4da3ff' };
const PUCK_CHARS = { r: 'red', g: 'green', b: 'blue' };
const TILE_CHARS = { R: 'red', G: 'green', B: 'blue' };
const BOX_CHARS = { 1: 'red', 2: 'green', 3: 'blue' };
const HUE = { red: 0, green: 120, blue: 220 };

/** Parse a challenge's grid into cell lists. Throws on a malformed board. */
export function parseBoard(def) {
  const rows = def.grid.length, cols = Math.max(...def.grid.map((r) => r.length));
  const b = { cols, rows, walls: new Set(), gates: [], start: null, star: null, coins: [], tiles: [], pucks: [], boxes: [] };
  const key = (c, r) => `${c},${r}`;
  def.grid.forEach((line, r) => {
    for (let c = 0; c < cols; c++) {
      const ch = line[c] ?? '#';
      if (ch === '#' || ch === ' ') b.walls.add(key(c, r));
      else if (ch === 'S') { if (b.start) throw new Error(`${def.id}: two starts`); b.start = { c, r, dir: def.dir || 'N' }; }
      else if (ch === '*') b.star = { c, r };
      else if (ch === 'o') b.coins.push({ c, r });
      else if (ch === '=') b.gates.push({ c, r });
      else if (TILE_CHARS[ch]) b.tiles.push({ c, r, color: TILE_CHARS[ch] });
      else if (PUCK_CHARS[ch]) b.pucks.push({ c, r, color: PUCK_CHARS[ch] });
      else if (BOX_CHARS[ch]) b.boxes.push({ c, r, color: BOX_CHARS[ch] });
      else if (ch !== '.') throw new Error(`${def.id}: unknown cell '${ch}'`);
    }
  });
  if (!b.start) throw new Error(`${def.id}: no start`);
  if (!b.star && !b.coins.length && !b.tiles.length && !b.boxes.length) throw new Error(`${def.id}: nothing to do`);
  if (b.gates.length && !def.gate) throw new Error(`${def.id}: gates need a gate rule`);
  return b;
}

export class Arena extends EventTarget {
  constructor(def) {
    super();
    this.def = def;
    this.board = parseBoard(def);
    this.reset();
  }

  get cols() { return this.board.cols; }
  get rows() { return this.board.rows; }
  get widthMm() { return this.board.cols * CELL; }
  get heightMm() { return this.board.rows * CELL; }

  /** Fresh objectives, closed gates, pucks back home; places the robot when a world is given. */
  reset(world = null) {
    const b = this.board;
    this.won = false;
    this.t0 = Date.now();
    this.starDone = false;
    this.coins = b.coins.map((c) => ({ ...c, done: false }));
    this.tiles = b.tiles.map((t) => ({ ...t, done: false }));
    this.pucks = b.pucks.map((p) => ({ ...p, carried: false }));
    this.boxes = b.boxes.map((x) => ({ ...x, done: false }));
    this.gateOpen = this.def.gate?.closeAfter != null; // closing gates start open
    this.gateLocked = false; // a closed-for-good gate (closeAfter) never reopens
    this.running = false;    // gate timers only run while a program runs (start() / stop())
    this.lastBump = 0;
    if (world) this.place(world);
    this._emit('reset');
  }

  place(world) {
    const s = this.board.start;
    world.x = (s.c + 0.5) * CELL; world.y = (s.r + 0.5) * CELL; world.heading = DIRS[s.dir] ?? 0;
    world.driveVel = 0; world.turnVel = 0; world.target = null;
    world.bumper.led = 0; world.bumper.pressed = !!world.bumper.held; world.magnet.on = false; world.magnet.pwm = 0; world.crash = false;
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  /** A program starts: fresh board, clock from now. */
  start(world) { this.reset(world); this.running = true; this.t0 = Date.now(); }
  /** The program ended or was stopped: timers freeze (the board keeps its state for the child to look at). */
  stop() { this.running = false; }

  // ---------- cells ----------

  cellOf(x, y) { return { c: Math.floor(x / CELL), r: Math.floor(y / CELL) }; }
  centre(c, r) { return { x: (c + 0.5) * CELL, y: (r + 0.5) * CELL }; }
  inside(c, r) { return c >= 0 && r >= 0 && c < this.board.cols && r < this.board.rows; }
  isGate(c, r) { return this.board.gates.some((g) => g.c === c && g.r === r); }
  /** Solid for the robot: walls, outside, closed gates. */
  isSolid(c, r) { return !this.inside(c, r) || this.board.walls.has(`${c},${r}`) || (this.isGate(c, r) && !this.gateOpen); }

  /** The square straight ahead of the robot (heading rounded to the nearest 90°). */
  aheadCell(world) {
    const { c, r } = this.cellOf(world.x, world.y);
    const q = ((Math.round(world.heading / 90) % 4) + 4) % 4; // 0 N, 1 E, 2 S, 3 W
    return { c: c + [0, 1, 0, -1][q], r: r + [-1, 0, 1, 0][q], q };
  }

  /** True when a robot disc centred at (x, y) touches a solid cell. */
  blocked(x, y) {
    const c0 = Math.floor((x - ROBOT_R) / CELL), c1 = Math.floor((x + ROBOT_R) / CELL);
    const r0 = Math.floor((y - ROBOT_R) / CELL), r1 = Math.floor((y + ROBOT_R) / CELL);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!this.isSolid(c, r)) continue;
        const nx = Math.max(c * CELL, Math.min(x, (c + 1) * CELL));
        const ny = Math.max(r * CELL, Math.min(y, (r + 1) * CELL));
        if (Math.hypot(x - nx, y - ny) < ROBOT_R) return true;
      }
    }
    return false;
  }

  // ---------- hooks called by SimBrain ----------

  /** Try to move `mm` along the heading. Returns 'bump' when a wall stopped the robot. */
  move(world, mm) {
    const rad = (world.heading * Math.PI) / 180;
    const nx = world.x + Math.sin(rad) * mm, ny = world.y - Math.cos(rad) * mm;
    if (!this.blocked(nx, ny)) { world.x = nx; world.y = ny; return 'ok'; }
    this.bump(world);
    return 'bump';
  }

  /** Wall hit: settle back on the square's centre, press the bumper and show the crash for a moment. */
  bump(world) {
    const { c, r } = this.cellOf(world.x, world.y);
    const p = this.centre(c, r);
    world.x = p.x; world.y = p.y;
    world.crash = true; world.bumper.pressed = true;
    this.lastBump = Date.now();
    setTimeout(() => {
      if (Date.now() - this.lastBump < BUMP_MS - 20) return; // a newer bump owns the flags
      world.crash = false; if (!world.bumper.held) world.bumper.pressed = false;
    }, BUMP_MS);
    this._emit('bump');
  }

  /** Magnet commands: pick up / drop a puck. */
  command(op, world) {
    if (op === 'MAG_BOOST') {
      if (this.pucks.some((p) => p.carried)) return;
      const ahead = this.aheadCell(world), own = this.cellOf(world.x, world.y);
      const puck = this.pucks.find((p) => !p.carried && p.c === ahead.c && p.r === ahead.r)
        || this.pucks.find((p) => !p.carried && p.c === own.c && p.r === own.r);
      if (puck) { puck.carried = true; this._emit('progress', { kind: 'pickup', color: puck.color }); }
    } else if (op === 'MAG_DROP') {
      const puck = this.pucks.find((p) => p.carried);
      if (!puck) return;
      const ahead = this.aheadCell(world), own = this.cellOf(world.x, world.y);
      const at = this.isSolid(ahead.c, ahead.r) ? own : ahead;
      puck.carried = false; puck.c = at.c; puck.r = at.r;
      this._emit('progress', { kind: 'drop', color: puck.color });
    }
  }

  /** Called every sim tick: timers, objectives, what the eye sees. */
  tick(world) {
    if (this.won) return;
    const g = this.def.gate;
    const t = (Date.now() - this.t0) / 1000;
    const { c, r } = this.cellOf(world.x, world.y);
    const allCoins = this.coins.every((x) => x.done);
    // gates
    if (g && this.board.gates.length && this.running) {
      if (g.after != null && !this.gateOpen && t >= g.after) { this.gateOpen = true; this._emit('progress', { kind: 'gate' }); }
      if (g.when === 'bump' && !this.gateOpen && world.bumper.pressed) { this.gateOpen = true; this._emit('progress', { kind: 'gate' }); }
      if (g.when === 'coins' && !this.gateOpen && this.coins.length && allCoins) { this.gateOpen = true; this._emit('progress', { kind: 'gate' }); }
      if (g.closeAfter != null && this.gateOpen && !this.gateLocked && t >= g.closeAfter) {
        this.gateOpen = false; this.gateLocked = true;
        // the door shuts: a robot still in the doorway is pushed back to the square it came from
        if (this.isGate(c, r)) {
          const q = this.aheadCell(world).q;
          const back = this.centre(c - [0, 1, 0, -1][q], r - [-1, 0, 1, 0][q]);
          world.x = back.x; world.y = back.y; world.target = null; world.driveVel = 0;
          world.crash = true; world.bumper.pressed = true; this.lastBump = Date.now();
          setTimeout(() => { world.crash = false; if (!world.bumper.held) world.bumper.pressed = false; }, BUMP_MS);
          this._emit('bump');
        }
        this._emit('progress', { kind: 'gate' });
      }
    }
    // objectives
    if (this.board.star && !this.starDone && c === this.board.star.c && r === this.board.star.r) { this.starDone = true; this._emit('progress', { kind: 'star' }); }
    for (const coin of this.coins) if (!coin.done && coin.c === c && coin.r === r) { coin.done = true; this._emit('progress', { kind: 'coin' }); }
    const led = world.bumper.led > 0 ? 'green' : world.bumper.led < 0 ? 'red' : null;
    for (const tile of this.tiles) if (!tile.done && tile.c === c && tile.r === r && led === tile.color) { tile.done = true; this._emit('progress', { kind: 'paint', color: tile.color }); }
    for (const box of this.boxes) {
      const filled = this.pucks.some((p) => !p.carried && p.color === box.color && p.c === box.c && p.r === box.r);
      if (filled && !box.done) { box.done = true; this._emit('progress', { kind: 'box', color: box.color }); }
      else if (!filled && box.done) box.done = false;
    }
    // the eye looks one square ahead
    const a = this.aheadCell(world);
    const puck = this.pucks.find((p) => !p.carried && p.c === a.c && p.r === a.r);
    if (this.isGate(a.c, a.r)) { world.eye.hue = this.gateOpen ? HUE.green : HUE.red; world.eye.brightness = 80; world.eye.proximity = 120; }
    else if (puck) { world.eye.hue = HUE[puck.color]; world.eye.brightness = 80; world.eye.proximity = 120; }
    else if (this.isSolid(a.c, a.r)) { world.eye.hue = 0; world.eye.brightness = 0; world.eye.proximity = 120; }
    else { world.eye.hue = 0; world.eye.brightness = 0; world.eye.proximity = 0; }
    // win
    const done = (!this.board.star || this.starDone) && allCoins && this.tiles.every((x) => x.done) && this.boxes.every((x) => x.done);
    if (done) { this.won = true; this._emit('won'); }
  }

  /** Fraction of objectives done (for the log / tests). */
  progress() {
    const items = [...this.coins, ...this.tiles, ...this.boxes].map((x) => x.done);
    if (this.board.star) items.push(this.starDone);
    return items.filter(Boolean).length / Math.max(1, items.length);
  }
}

// ---------- drawing ----------

/**
 * Draw the board. `toPx(x, y)` maps world mm → canvas px, `scale` = px per mm.
 * Used by the sim window (full detail) and the level cards (`thumb`: no grid, chunkier marks).
 */
export function drawBoard(ctx, arena, toPx, scale, { thumb = false } = {}) {
  const b = arena.board;
  const cell = CELL * scale;
  const lw = Math.max(1, cell * 0.04);
  const rect = (c, r) => { const [x, y] = toPx(c * CELL, r * CELL); return [x, y]; };
  // floor + walls
  for (let r = 0; r < b.rows; r++) {
    for (let c = 0; c < b.cols; c++) {
      const [x, y] = rect(c, r);
      if (b.walls.has(`${c},${r}`)) {
        ctx.fillStyle = '#b5562e'; ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
        if (!thumb) {
          ctx.strokeStyle = '#7a3415'; ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(x, y + cell / 2); ctx.lineTo(x + cell, y + cell / 2);
          ctx.moveTo(x + cell / 2, y); ctx.lineTo(x + cell / 2, y + cell / 2);
          ctx.moveTo(x + cell / 4, y + cell / 2); ctx.lineTo(x + cell / 4, y + cell);
          ctx.moveTo(x + (3 * cell) / 4, y + cell / 2); ctx.lineTo(x + (3 * cell) / 4, y + cell);
          ctx.stroke();
          ctx.strokeStyle = '#7a3415'; ctx.strokeRect(x, y, cell, cell);
        }
      } else {
        ctx.fillStyle = '#fafcff'; ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
        if (!thumb) { ctx.strokeStyle = '#dfe5ec'; ctx.lineWidth = lw; ctx.strokeRect(x, y, cell, cell); }
      }
    }
  }
  // start marker: a faint arrow the way the robot faces
  {
    const s = b.start; const [x, y] = toPx((s.c + 0.5) * CELL, (s.r + 0.5) * CELL);
    ctx.save(); ctx.translate(x, y); ctx.rotate(((DIRS[s.dir] ?? 0) * Math.PI) / 180);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.moveTo(0, -cell * 0.32); ctx.lineTo(cell * 0.22, -cell * 0.05); ctx.lineTo(cell * 0.08, -cell * 0.05); ctx.lineTo(cell * 0.08, cell * 0.3);
    ctx.lineTo(-cell * 0.08, cell * 0.3); ctx.lineTo(-cell * 0.08, -cell * 0.05); ctx.lineTo(-cell * 0.22, -cell * 0.05); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // paint tiles
  for (const t of arena.tiles) {
    const [x, y] = rect(t.c, t.r); const inset = cell * 0.12;
    ctx.lineWidth = Math.max(2, cell * 0.1); ctx.strokeStyle = COLORS[t.color];
    ctx.fillStyle = t.done ? COLORS[t.color] : '#cfd6de';
    ctx.beginPath(); ctx.roundRect(x + inset, y + inset, cell - 2 * inset, cell - 2 * inset, cell * 0.12); ctx.fill(); ctx.stroke();
    if (t.done) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x + cell / 2, y + cell / 2, cell * 0.16, 0, Math.PI * 2); ctx.fill(); }
  }
  // boxes
  for (const bx of arena.boxes) {
    const [x, y] = rect(bx.c, bx.r); const inset = cell * 0.14;
    ctx.lineWidth = Math.max(2, cell * 0.1); ctx.strokeStyle = COLORS[bx.color]; ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.beginPath(); ctx.rect(x + inset, y + inset, cell - 2 * inset, cell - 2 * inset); ctx.fill(); ctx.stroke();
    ctx.setLineDash([cell * 0.08, cell * 0.08]); ctx.lineWidth = Math.max(1, cell * 0.04); ctx.strokeRect(x + inset * 2, y + inset * 2, cell - 4 * inset, cell - 4 * inset); ctx.setLineDash([]);
  }
  // star
  if (b.star) {
    const [x, y] = toPx((b.star.c + 0.5) * CELL, (b.star.r + 0.5) * CELL);
    drawStar(ctx, x, y, cell * 0.38, arena.starDone ? '#fff3b0' : '#ffd166', '#c98f00', lw);
  }
  // coins
  for (const coin of arena.coins) {
    if (coin.done) continue;
    const [x, y] = toPx((coin.c + 0.5) * CELL, (coin.r + 0.5) * CELL);
    ctx.fillStyle = '#ffb800'; ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = lw * 1.5;
    ctx.beginPath(); ctx.arc(x, y, cell * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.arc(x - cell * 0.07, y - cell * 0.07, cell * 0.08, 0, Math.PI * 2); ctx.fill();
  }
  // pucks on the floor (a carried puck is drawn with the robot)
  for (const p of arena.pucks) {
    if (p.carried) continue;
    const [x, y] = toPx((p.c + 0.5) * CELL, (p.r + 0.5) * CELL);
    drawPuck(ctx, x, y, cell * 0.26, p.color, lw);
  }
  // gates
  for (const g of b.gates) {
    const [x, y] = rect(g.c, g.r);
    const open = arena.gateOpen;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, cell, cell); ctx.clip();
    if (!open) {
      ctx.fillStyle = '#ffd166'; ctx.fillRect(x, y + cell * 0.3, cell, cell * 0.4);
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = Math.max(2, cell * 0.09);
      ctx.beginPath();
      for (let k = -cell; k < cell * 2; k += cell * 0.3) { ctx.moveTo(x + k, y + cell * 0.72); ctx.lineTo(x + k + cell * 0.4, y + cell * 0.28); }
      ctx.stroke();
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = lw * 2; ctx.strokeRect(x, y + cell * 0.3, cell, cell * 0.4);
    } else {
      ctx.strokeStyle = '#c9ced3'; ctx.lineWidth = lw * 2; ctx.setLineDash([cell * 0.1, cell * 0.1]);
      ctx.strokeRect(x + cell * 0.1, y + cell * 0.3, cell * 0.8, cell * 0.4); ctx.setLineDash([]);
    }
    ctx.restore();
    // lamp in the corner
    ctx.fillStyle = open ? COLORS.green : COLORS.red; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = lw * 1.5;
    ctx.beginPath(); ctx.arc(x + cell * 0.82, y + cell * 0.18, cell * 0.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // ticks on filled boxes
  for (const bx of arena.boxes) {
    if (!bx.done) continue;
    const [x, y] = toPx((bx.c + 0.5) * CELL, (bx.r + 0.5) * CELL);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, cell * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - cell * 0.16, y); ctx.lineTo(x - cell * 0.04, y + cell * 0.12); ctx.lineTo(x + cell * 0.18, y - cell * 0.14); ctx.stroke();
  }
}

export function drawPuck(ctx, x, y, r, color, lw = 2) {
  ctx.fillStyle = COLORS[color] || '#9aa5b1'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = lw * 1.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
}

export function drawStar(ctx, x, y, r, fill, stroke, lw = 2) {
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = lw * 1.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

export const ChallengeColors = COLORS;
