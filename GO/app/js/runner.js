// Executes a puzzle program on a GoRobot, one piece at a time, highlighting
// the piece that is running (like VEXcode's block highlighting).

import { PieceById } from './pieces.js';

export class Runner extends EventTarget {
  constructor(robot) {
    super();
    this.robot = robot;
    this.running = false;
    this._abort = null;
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  async run(program) {
    if (this.running) return;
    this.running = true;
    this._abort = new AbortController();
    const signal = this._abort.signal;
    this._emit('start');
    let result = { ok: true };
    try {
      await this.robot.prepare();
      await this._runList(program.pieces, signal);
    } catch (e) {
      result = { ok: false, error: e.message };
    }
    try { await this.robot.stopAll(); } catch (e) { /* ignore */ }
    this.running = false;
    this._emit('stop');
    // 'finish' is emitted last so listeners can immediately start a new run
    this._emit('finish', result);
  }

  async _runList(pieces, signal) {
    for (const piece of pieces) {
      if (signal.aborted) throw new Error('stopped');
      const def = PieceById[piece.id];
      if (!def) continue;
      this._emit('piece', { uid: piece.uid, state: 'active' });
      try {
        if (def.container) {
          const times = piece.param === Infinity ? Infinity : (piece.param || 1);
          for (let i = 0; i < times; i++) {
            if (signal.aborted) throw new Error('stopped');
            await this._runList(piece.children || [], signal);
            if (!piece.children?.length) await new Promise((r) => setTimeout(r, 200));
          }
        } else {
          await def.run({ robot: this.robot, piece, signal, log: (m) => this._emit('log', m) });
        }
      } finally {
        this._emit('piece', { uid: piece.uid, state: 'done' });
      }
    }
  }

  async stop() {
    if (!this.running) return;
    this._abort?.abort();
    this.robot.cancelWaits();
    await this.robot.stopAll();
  }
}
