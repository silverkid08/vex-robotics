// Top-down picture of the pretend robot (SimBrain) plus buttons so a child can
// "press the bumper" or "show the eye a colour" without real hardware.
//
// * Speed: turtle / rabbit buttons change how fast the pretend robot moves.
// * Framing: before a program runs, `fitProgram()` walks the pieces to predict
//   the path and zooms the picture so the whole route fits; while running the
//   view grows if the robot goes further than predicted.
// * Size: bigger / smaller buttons change the window width (remembered).

import { Icons } from './icons.js';
import { PieceById, STEP_MM } from './pieces.js';
import { drawBoard, drawPuck, CELL } from './challenge.js';

const SPEEDS = [0.5, 1, 2, 4];
const CHALLENGE_SPEED = 2; // challenge boards always run at this multiplier (timers are real seconds)
const WIDTHS = [220, 300, 420, 560];
const SIZE_KEY = 'vexgo.simview.size';
const SPEED_KEY = 'vexgo.simview.speed';

/** Predict the robot's path (mm, heading 0 = up) for a program. Returns { xs, ys, bounds }. */
export function predictPath(program) {
  let x = 0, y = 0, h = 0;
  const pts = [[0, 0]];
  const step = (mm) => { const r = (h * Math.PI) / 180; x += Math.sin(r) * mm; y -= Math.cos(r) * mm; pts.push([x, y]); };
  const walk = (list, depth = 0) => {
    for (const p of list) {
      const def = PieceById[p.id];
      if (!def) continue;
      switch (p.id) {
        case 'forward': step(STEP_MM * (p.param || 1)); break;
        case 'backward': step(-STEP_MM * (p.param || 1)); break;
        case 'turnRight90': h += p.param || 90; break;
        case 'turnLeft90': h -= p.param || 90; break;
        case 'turn180': h += 180; break;
        case 'turn360': h += 360; break;
        case 'repeat': {
          const n = p.param === Infinity ? 3 : Math.min(p.param || 1, 20);
          for (let i = 0; i < n && depth < 3; i++) walk(p.children || [], depth + 1);
          break;
        }
        default: break;
      }
    }
  };
  walk(program?.pieces || []);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { pts, bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) } };
}

export class SimView {
  constructor({ root, sim }) {
    this.root = root;
    this.sim = sim;
    this.sizeIndex = Math.min(WIDTHS.length - 1, Math.max(0, Number(localStorage.getItem(SIZE_KEY) ?? 1)));
    this.speedIndex = Math.max(0, SPEEDS.indexOf(Number(localStorage.getItem(SPEED_KEY)) || 1));
    this.root.innerHTML = `
      <div class="sim-head">
        <button class="sim-tool" data-act="smaller" title="Smaller window">${Icons.zoomOut()}</button>
        <button class="sim-tool" data-act="bigger" title="Bigger window">${Icons.zoomIn()}</button>
        <span class="spacer"></span>
        <button class="sim-toggle" title="Show / hide the pretend robot">${Icons.toy()}</button>
      </div>
      <canvas class="sim-canvas" width="420" height="300"></canvas>
      <div class="sim-speed">
        <button class="sim-tool" data-act="slower" title="Slower">${Icons.turtle()}</button>
        <div class="sim-speed-dots"></div>
        <button class="sim-tool" data-act="faster" title="Faster">${Icons.rabbit()}</button>
      </div>
      <div class="sim-buttons">
        <button class="sim-btn" data-act="bump" title="Press bumper">${Icons.waitBump()}</button>
        <button class="sim-btn" data-act="red" title="Show red">${Icons.waitSee('red')}</button>
        <button class="sim-btn" data-act="green" title="Show green">${Icons.waitSee('green')}</button>
        <button class="sim-btn" data-act="blue" title="Show blue">${Icons.waitSee('blue')}</button>
        <button class="sim-btn" data-act="object" title="Put something in front">${Icons.waitObject()}</button>
      </div>`;
    this.root.classList.toggle('collapsed', localStorage.getItem('vexgo.simview') === 'closed');
    this.root.querySelector('.sim-toggle').addEventListener('click', () => {
      const closed = this.root.classList.toggle('collapsed');
      localStorage.setItem('vexgo.simview', closed ? 'closed' : 'open');
      this._resize();
    });
    for (const b of this.root.querySelectorAll('.sim-tool')) {
      b.addEventListener('click', () => {
        const act = b.dataset.act;
        if (act === 'bigger') this.setSize(this.sizeIndex + 1);
        else if (act === 'smaller') this.setSize(this.sizeIndex - 1);
        else if (act === 'faster') this.setSpeed(this.speedIndex + 1);
        else if (act === 'slower') this.setSpeed(this.speedIndex - 1);
      });
    }
    this.canvas = this.root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    for (const b of this.root.querySelectorAll('.sim-btn')) {
      const act = b.dataset.act;
      if (act === 'bump') {
        b.addEventListener('pointerdown', () => sim.pressBumper(true));
        b.addEventListener('pointerup', () => sim.pressBumper(false));
        b.addEventListener('pointercancel', () => sim.pressBumper(false));
        b.addEventListener('pointerleave', () => sim.pressBumper(false));
      } else if (act === 'object') {
        b.addEventListener('click', () => { sim.setEyeProximity(sim.world.eye.proximity >= 50 ? 0 : 120); b.classList.toggle('on', sim.world.eye.proximity >= 50); });
      } else {
        const hue = { red: 0, green: 120, blue: 220 }[act];
        b.addEventListener('click', () => {
          const same = sim.world.eye.hue === hue && sim.world.eye.proximity >= 50;
          sim.setEyeColor(same ? 0 : hue, same ? 0 : 80);
          sim.setEyeProximity(same ? 0 : 120);
          this.root.querySelectorAll('.sim-btn').forEach((x) => x.classList.remove('on'));
          if (!same) b.classList.add('on');
        });
      }
    }
    this.trail = [];
    this.predicted = [];
    this.arena = null;
    // view: world bounds (mm) to show
    this.bounds = { minX: -300, maxX: 300, minY: -300, maxY: 300 };
    this.setSize(this.sizeIndex, false);
    this.setSpeed(this.speedIndex, false);
    sim.addEventListener('ports', () => this.draw());
    new ResizeObserver(() => this._resize()).observe(this.root);
  }

  /**
   * Challenge mode: show a board instead of the open floor. The window is forced open, the speed
   * buttons and the eye-colour buttons are hidden (timers are real seconds and the board drives
   * the eye) and the view frames the whole board.
   */
  setArena(arena) {
    this.arena = arena;
    this.root.classList.toggle('arena', !!arena);
    if (arena) {
      this.root.classList.remove('collapsed');
      this.sim.speed = CHALLENGE_SPEED;
      arena.addEventListener('reset', () => { this.trail = []; this.draw(); });
      arena.addEventListener('progress', () => this.draw());
    } else {
      this.setSpeed(this.speedIndex, false);
      this.root.classList.toggle('collapsed', localStorage.getItem('vexgo.simview') === 'closed');
    }
    this.trail = []; this.predicted = [];
    this._frameArena();
    this._resize();
  }

  _frameArena() {
    if (!this.arena) return;
    const pad = 30;
    this.bounds = { minX: -pad, maxX: this.arena.widthMm + pad, minY: -pad, maxY: this.arena.heightMm + pad };
  }

  setSize(i, persist = true) {
    this.sizeIndex = Math.min(WIDTHS.length - 1, Math.max(0, i));
    this.root.style.setProperty('--sim-width', `${WIDTHS[this.sizeIndex]}px`);
    if (persist) localStorage.setItem(SIZE_KEY, String(this.sizeIndex));
    this._resize();
  }

  setSpeed(i, persist = true) {
    this.speedIndex = Math.min(SPEEDS.length - 1, Math.max(0, i));
    this.sim.speed = SPEEDS[this.speedIndex];
    if (persist) localStorage.setItem(SPEED_KEY, String(this.sim.speed));
    const dots = this.root.querySelector('.sim-speed-dots');
    dots.innerHTML = SPEEDS.map((s, k) => `<span class="${k <= this.speedIndex ? 'on' : ''}"></span>`).join('');
  }

  _resize() {
    const w = this.canvas.clientWidth || WIDTHS[this.sizeIndex] - 16;
    const h = Math.round(w * 0.72);
    if (this.canvas.width !== Math.round(w * 2) || this.canvas.height !== Math.round(h * 2)) {
      this.canvas.width = Math.round(w * 2); this.canvas.height = Math.round(h * 2); // 2x for crisp lines
    }
    this.canvas.style.height = `${h}px`;
    this.draw();
  }

  /** Reset the trail and frame the view around the predicted path of a program. */
  fitProgram(program) {
    if (this.arena) { this.trail = []; this.predicted = []; this._frameArena(); this.draw(); return; }
    const { pts, bounds } = predictPath(program);
    this.predicted = pts;
    this.trail = [];
    const w = this.sim.world;
    // the pretend robot starts wherever it currently is; shift the prediction there
    const pred = { minX: bounds.minX + w.x, maxX: bounds.maxX + w.x, minY: bounds.minY + w.y, maxY: bounds.maxY + w.y };
    this.predicted = pts.map(([x, y]) => [x + w.x, y + w.y]);
    // this assumes the robot is facing "up"; reset heading so the picture matches
    this.sim.world.heading = 0;
    const pad = 160; // mm, room for the robot body itself
    this.bounds = { minX: pred.minX - pad, maxX: pred.maxX + pad, minY: pred.minY - pad, maxY: pred.maxY + pad };
    this.draw();
  }

  /** Grow the view if the robot leaves it (never shrink while moving). */
  _include(x, y) {
    const b = this.bounds, pad = 160;
    if (x - pad < b.minX) b.minX = x - pad;
    if (x + pad > b.maxX) b.maxX = x + pad;
    if (y - pad < b.minY) b.minY = y - pad;
    if (y + pad > b.maxY) b.maxY = y + pad;
  }

  draw() {
    const { ctx, canvas } = this;
    if (this.root.classList.contains('collapsed')) return;
    const w = this.sim.world;
    if (this.arena) this._frameArena(); else this._include(w.x, w.y);
    const W = canvas.width, H = canvas.height;
    const b = this.bounds;
    const spanX = Math.max(this.arena ? 300 : 600, b.maxX - b.minX), spanY = Math.max(this.arena ? 225 : 450, b.maxY - b.minY);
    const scale = Math.min(W / spanX, H / spanY);
    const cx0 = (b.minX + b.maxX) / 2, cy0 = (b.minY + b.maxY) / 2;
    const toPx = (x, y) => [W / 2 + (x - cx0) * scale, H / 2 + (y - cy0) * scale];
    ctx.clearRect(0, 0, W, H);
    if (this.arena) {
      drawBoard(ctx, this.arena, toPx, scale);
    } else {
      // floor grid: one square = one step (150 mm)
      ctx.strokeStyle = '#e3e8ee'; ctx.lineWidth = 2;
      const gx0 = Math.floor((cx0 - W / 2 / scale) / STEP_MM) * STEP_MM, gx1 = cx0 + W / 2 / scale;
      const gy0 = Math.floor((cy0 - H / 2 / scale) / STEP_MM) * STEP_MM, gy1 = cy0 + H / 2 / scale;
      for (let x = gx0; x <= gx1; x += STEP_MM) { const [px] = toPx(x, 0); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke(); }
      for (let y = gy0; y <= gy1; y += STEP_MM) { const [, py] = toPx(0, y); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke(); }
    }
    // predicted route (dashed) then the real trail
    if (this.predicted.length > 1) {
      ctx.setLineDash([10, 10]); ctx.strokeStyle = '#c6d4e3'; ctx.lineWidth = 5; ctx.beginPath();
      this.predicted.forEach(([x, y], i) => { const [px, py] = toPx(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    const [rx, ry] = toPx(w.x, w.y);
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last[0] - w.x, last[1] - w.y) > 4) this.trail.push([w.x, w.y]);
    if (this.trail.length > 2000) this.trail.shift();
    ctx.strokeStyle = '#4da3ff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    this.trail.forEach(([x, y], i) => { const [px, py] = toPx(x, y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.stroke();
    // robot (drawn at a fixed on-screen size so it is always recognisable)
    const s = Math.max(0.9, Math.min(2.2, scale * 1.2));
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate((w.heading * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.fillStyle = '#4da3ff'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-22, -26, 44, 52, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-28, -12, 6, 24); ctx.fillRect(22, -12, 6, 24);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -18, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const col = { red: '#ff4136', green: '#2ecc40', blue: '#4da3ff' };
    const hue = w.eye.hue;
    const name = w.eye.proximity >= 50 ? (hue >= 340 || hue < 20 ? 'red' : hue >= 160 && hue < 255 ? 'blue' : hue >= 75 && hue < 155 ? 'green' : null) : null;
    ctx.fillStyle = name ? col[name] : '#9aa5b1'; ctx.beginPath(); ctx.arc(0, -18, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = w.bumper.led > 0 ? '#2ecc40' : w.bumper.led < 0 ? '#ff4136' : '#cfcfcf';
    ctx.beginPath(); ctx.roundRect(-10, -4, 20, 14, 4); ctx.fill(); ctx.stroke();
    if (w.bumper.pressed) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.roundRect(-10, -4, 20, 14, 4); ctx.fill(); }
    ctx.fillStyle = w.magnet.on ? '#ff4136' : '#8a8a8a'; ctx.beginPath(); ctx.roundRect(-8, 18, 16, 8, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
    // a carried puck rides in front of the robot
    const carried = this.arena?.pucks.find((p) => p.carried);
    if (carried) {
      const rad = (w.heading * Math.PI) / 180;
      const [px, py] = toPx(w.x + Math.sin(rad) * 70, w.y - Math.cos(rad) * 70);
      drawPuck(ctx, px, py, CELL * scale * 0.22, carried.color, Math.max(1, scale * 6));
    }
    if (w.crash) { ctx.font = `${32 * s}px sans-serif`; ctx.fillText('💥', rx + 20 * s, ry - 20 * s); }
  }
}
