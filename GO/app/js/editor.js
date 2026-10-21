// Puzzle-piece program editor.
//
// * A palette of pieces (list / grid / tray layouts, three sizes, three sort
//   orders) and the program strip.
// * Pieces are real jigsaw shapes: a mushroom knob on the trailing edge and a
//   matching hole on the leading edge, so the knob of one piece sits inside
//   the next piece's hole (left-to-right or top-to-bottom).
// * A "repeat" is one large piece: its frame wraps the pieces placed inside it
//   (they click onto a knob inside the frame) and the frame's own knob connects
//   to the next piece. Repeats cannot be nested.
// * Left-to-right programs wrap to new rows; a grey snaking arrow shows where
//   a row continues. The strip can be zoomed.
// * Drag with mouse, pen or finger (pointer events). Drop onto the strip to
//   insert, drag onto the trash to delete, tap a piece to cycle its picture
//   parameter, hold a piece (0.5 s) to open a - / + stepper or a picker.
// * Optional helper labels (for grown-ups) are rendered inside the pieces.

import { Pieces, PieceById, Groups, makePiece, nextParam, stepParam, labelFor } from './pieces.js';
import { Icons } from './icons.js';

export const SIZE = 124; // px, square body of a piece
export const KNOB = 36;  // px, how far the knob sticks out of the body
const NECK = 9;          // half-width of the knob's neck
const NECK_LEN = 6;      // straight part before the round head
const HEAD_R = 15;       // radius of the round head
const CORNER = 14;
export const FRAME_PAD = 14; // inner padding of a repeat frame around its contents
export const HOLE_DEPTH = NECK_LEN + 2 * HEAD_R + 4; // how far a hole reaches into the body (36 px)
const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.2, 1.45, 1.75];

const knobOut = (axis, sign) => (axis === 'x'
  ? `h${sign * NECK_LEN} a${HEAD_R} ${HEAD_R} 0 1 ${sign > 0 ? 1 : 0} 0 ${sign * 2 * NECK} h${-sign * NECK_LEN}`
  : `v${sign * NECK_LEN} a${HEAD_R} ${HEAD_R} 0 1 ${sign > 0 ? 1 : 0} ${-sign * 2 * NECK} 0 v${-sign * NECK_LEN}`);

/**
 * Jigsaw outline for a W x H body. ltr: hole on the left (unless first) and knob on
 * the right (unless last), both centred at `y`; ttb: hole on top / knob at bottom centred at `x`.
 */
export function framePath(order, W, H, first, last, at = SIZE / 2) {
  const r = CORNER, n = NECK;
  if (order === 'ltr') {
    return [
      `M${r} 0 H${W - r} a${r} ${r} 0 0 1 ${r} ${r}`,
      `V${at - n}`, last ? '' : knobOut('x', 1),
      `V${H - r} a${r} ${r} 0 0 1 -${r} ${r} H${r} a${r} ${r} 0 0 1 -${r} -${r}`,
      `V${at + n}`, first ? '' : `h${NECK_LEN} a${HEAD_R} ${HEAD_R} 0 1 0 0 ${-2 * n} h${-NECK_LEN}`,
      `V${r} a${r} ${r} 0 0 1 ${r} -${r} Z`,
    ].join(' ');
  }
  return [
    `M0 ${r} a${r} ${r} 0 0 1 ${r} -${r}`,
    `H${at - n}`, first ? '' : `v${NECK_LEN} a${HEAD_R} ${HEAD_R} 0 1 0 ${2 * n} 0 v${-NECK_LEN}`,
    `H${W - r} a${r} ${r} 0 0 1 ${r} ${r} V${H - r} a${r} ${r} 0 0 1 -${r} ${r}`,
    `H${at + n}`, last ? '' : knobOut('y', 1),
    `H${r} a${r} ${r} 0 0 1 -${r} -${r} Z`,
  ].join(' ');
}

export const puzzlePath = (order, first = false, last = false) => framePath(order, SIZE, SIZE, first, last);

/** Render one simple piece as SVG (shape + picture + optional label). */
export function pieceSvg(def, piece, order, first, last, { dark = false, labels = false } = {}) {
  const g = Groups[def.group];
  // top-to-bottom pieces are taller: the hole at the top takes HOLE_DEPTH, so the picture starts below it
  const tall = order === 'ttb';
  const bodyH = tall ? SIZE + HOLE_DEPTH : SIZE;
  const w = tall ? SIZE : SIZE + KNOB;
  const h = tall ? bodyH + KNOB : SIZE;
  const d = framePath(order, SIZE, bodyH, first, last);
  return `<svg class="piece-shape" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <path d="${d}" fill="${g.color}" stroke="${dark ? '#111' : g.dark}" stroke-width="4" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" transform="translate(2 2)" style="pointer-events:none"/>
    <foreignObject x="0" y="${tall ? HOLE_DEPTH - 4 : 0}" width="${SIZE}" height="${tall ? SIZE : SIZE}">${pieceInner(def, piece, labels)}</foreignObject>
  </svg>`;
}

/** Dot row for a piece's count parameter ('' when the piece has none). */
export function pieceDots(def, param) { return def.dots ? Icons.dots(def.dots(param)) : ''; }

/**
 * The inside of a piece is three fixed rows: dots, picture, helper words. The rows keep their size
 * whether or not the words are shown, so the picture never grows into the connectors.
 */
function pieceInner(def, piece, labels) {
  const param = piece?.param ?? def.defaultParam;
  const text = labels ? `<div class="piece-label">${labelFor(piece || { id: def.id, param })}</div>` : '';
  return `<div xmlns="http://www.w3.org/1999/xhtml" class="piece-inner"><div class="piece-dots">${pieceDots(def, param)}</div><div class="piece-icon">${def.icon(param)}</div><div class="piece-words">${text}</div></div>`;
}

const SETTINGS_KEY = 'vexgo.palette';
const USAGE_KEY = 'vexgo.usage';
const ZOOM_KEY = 'vexgo.zoom';
const TRASH_TAP_WINDOW_MS = 1200; // three taps on the trash within this window clear the program

export class Editor extends EventTarget {
  constructor({ paletteEl, stripEl, stripWrapEl, trashEl, program, popoverEl }) {
    super();
    this.paletteEl = paletteEl;
    this.stripEl = stripEl;
    this.stripWrapEl = stripWrapEl || stripEl.parentElement;
    this.trashEl = trashEl;
    this.popoverEl = popoverEl;
    this.program = program || { order: 'ltr', pieces: [] };
    this.locked = false;
    this.labels = false;
    this.zoom = Number(localStorage.getItem(ZOOM_KEY)) || 1;
    this.settings = { size: 'medium', layout: 'list', sort: 'family' };
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* ignore */ }
    try { this.usage = JSON.parse(localStorage.getItem(USAGE_KEY) || '{}'); } catch (e) { this.usage = {}; }
    this._drag = null;
    this._holdTimer = null;
    this.overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.overlay.classList.add('wrap-overlay');
    this.stripWrapEl.prepend(this.overlay);
    this.renderPalette();
    this.applyZoom();
    this.render();
    this._bindPointer();
    this._bindTrashTaps();
    this._ro = new ResizeObserver(() => this._afterLayout());
    this._ro.observe(this.stripEl);
    this._ro.observe(this.stripWrapEl);
  }

  // ---------- settings ----------

  setLabels(on) { this.labels = !!on; this.renderPalette(); this.render(); }

  setPaletteSetting(key, value) {
    this.settings[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    this.renderPalette();
    this.dispatchEvent(new CustomEvent('settings', { detail: this.settings }));
  }

  cyclePaletteSetting(key) {
    const choices = { size: ['small', 'medium', 'large'], layout: ['list', 'grid', 'tray'], sort: ['family', 'az', 'recent'] }[key];
    const i = choices.indexOf(this.settings[key]);
    this.setPaletteSetting(key, choices[(i + 1) % choices.length]);
  }

  zoomBy(delta) {
    const i = ZOOM_STEPS.findIndex((z) => Math.abs(z - this.zoom) < 0.01);
    const j = Math.max(0, Math.min(ZOOM_STEPS.length - 1, (i < 0 ? 3 : i) + delta));
    this.zoom = ZOOM_STEPS[j];
    localStorage.setItem(ZOOM_KEY, String(this.zoom));
    this.applyZoom();
  }

  applyZoom() {
    this.stripEl.style.zoom = String(this.zoom);
    this.closePopover();
    this._afterLayout();
  }

  _noteUsage(id) {
    this.usage[id] = (this.usage[id] || 0) + 1;
    localStorage.setItem(USAGE_KEY, JSON.stringify(this.usage));
    if (this.settings.sort === 'recent') this.renderPalette();
  }

  setProgram(program) { this.program = program; this.render(); this._changed(); }
  setOrder(order) { this.program.order = order; this.render(); this._changed(); }
  toggleOrder() { this.setOrder(this.program.order === 'ltr' ? 'ttb' : 'ltr'); }
  clear() { this.program.pieces = []; this.render(); this._changed(); }
  _changed() { this.dispatchEvent(new CustomEvent('change', { detail: this.program })); }

  // ---------- rendering ----------

  _sortedPieces() {
    const list = [...Pieces];
    if (this.settings.sort === 'az') list.sort((a, b) => labelFor({ id: a.id, param: a.defaultParam }).localeCompare(labelFor({ id: b.id, param: b.defaultParam })));
    else if (this.settings.sort === 'recent') list.sort((a, b) => (this.usage[b.id] || 0) - (this.usage[a.id] || 0));
    return list;
  }

  renderPalette() {
    const { size, layout, sort } = this.settings;
    this.paletteEl.dataset.size = size;
    this.paletteEl.dataset.layout = layout;
    this.paletteEl.innerHTML = '';
    let lastGroup = null;
    for (const def of this._sortedPieces()) {
      if (sort === 'family' && def.group !== lastGroup) {
        const sep = document.createElement('div');
        sep.className = 'palette-sep';
        sep.style.background = Groups[def.group].color;
        if (this.labels) { sep.textContent = Groups[def.group].name; sep.classList.add('with-text'); }
        this.paletteEl.appendChild(sep);
        lastGroup = def.group;
      }
      const el = document.createElement('div');
      el.className = 'palette-piece';
      el.dataset.pieceId = def.id;
      el.title = def.help || labelFor({ id: def.id, param: def.defaultParam });
      el.innerHTML = pieceSvg(def, { id: def.id, param: def.defaultParam }, 'ltr', true, true, { labels: this.labels });
      this.paletteEl.appendChild(el);
    }
  }

  render() {
    const order = this.program.order;
    this.stripEl.dataset.order = order;
    this.stripEl.innerHTML = '';
    const start = document.createElement('div');
    start.className = 'strip-start';
    start.innerHTML = Icons.flag();
    start.title = 'Start';
    this.stripEl.appendChild(start);
    this._renderList(this.program.pieces, this.stripEl, order, null);
    const end = document.createElement('div');
    end.className = 'strip-end';
    this.stripEl.appendChild(end);
    this.closePopover();
    this._afterLayout();
  }

  _renderList(list, host, order, parent) {
    list.forEach((piece, i) => {
      const def = PieceById[piece.id];
      if (!def) return;
      const el = document.createElement('div');
      el.className = 'piece' + (def.container ? ' piece-container' : '');
      el.dataset.uid = piece.uid;
      el.title = labelFor(piece);
      const first = i === 0 && !parent; // inside a frame the first piece keeps its hole for the inner knob
      const last = i === list.length - 1;
      if (def.container) {
        el.innerHTML = `<svg class="container-frame" xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="container-head">${pieceInner(def, piece, this.labels)}</div>
          <div class="container-body" data-container="${piece.uid}"></div>`;
        el.dataset.first = first ? '1' : '';
        el.dataset.last = last ? '1' : '';
        host.appendChild(el);
        this._renderList(piece.children || [], el.querySelector('.container-body'), order, piece);
      } else {
        el.innerHTML = pieceSvg(def, piece, order, first, last, { labels: this.labels });
        host.appendChild(el);
      }
    });
  }

  /** Draw repeat frames and wrap arrows once the browser has laid things out. */
  _afterLayout() {
    if (this._layoutRaf) return;
    this._layoutRaf = requestAnimationFrame(() => { this._layoutRaf = null; this._drawFrames(); this._drawWrapArrows(); });
  }

  _drawFrames() {
    const order = this.program.order;
    for (const el of this.stripEl.querySelectorAll('.piece-container')) {
      const W = el.offsetWidth, H = el.offsetHeight;
      const svg = el.querySelector('.container-frame');
      const head = el.querySelector('.container-head');
      const g = Groups.loop;
      const first = el.dataset.first === '1', last = el.dataset.last === '1';
      const bodyW = order === 'ltr' ? W - KNOB : W;
      const bodyH = order === 'ltr' ? H : H - KNOB;
      // the frame's own hole and knob sit on its centre line; neighbours are centred on the same line
      const d = framePath(order, bodyW, bodyH, first, last, order === 'ltr' ? bodyH / 2 : bodyW / 2);
      // inner knob: from the head into the first inner piece's hole
      const body = el.querySelector('.container-body');
      const firstKid = body.querySelector(':scope > .piece');
      // offsets of the first inner piece relative to the frame (the body is its offsetParent)
      const fx = firstKid ? body.offsetLeft + firstKid.offsetLeft : null;
      const fy = firstKid ? body.offsetTop + firstKid.offsetTop : null;
      // the knob grows out of the head's trailing edge (or the first child's leading edge, which is the same
      // line) and is shaped exactly like a piece knob, so the first child visibly clicks onto it
      const x0 = firstKid ? fx : head.offsetLeft + head.offsetWidth;
      const y0 = firstKid ? fy : head.offsetTop + head.offsetHeight;
      const ky = firstKid ? fy + firstKid.offsetHeight / 2 : bodyH / 2;
      const kx = firstKid ? fx + firstKid.offsetWidth / 2 : bodyW / 2;
      const knob = order === 'ltr'
        ? `M${x0} ${ky - NECK} ${knobOut('x', 1)}`
        : `M${kx + NECK} ${y0} ${knobOut('y', 1)}`;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.innerHTML = `<path d="${d}" fill="${g.color}" stroke="${g.dark}" stroke-width="4" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" transform="translate(2 2)"/>
        <rect class="frame-well" x="${order === 'ltr' ? head.offsetLeft + head.offsetWidth - 6 : FRAME_PAD - 6}" y="${order === 'ltr' ? FRAME_PAD - 6 : head.offsetTop + head.offsetHeight - 6}" width="${order === 'ltr' ? bodyW - head.offsetLeft - head.offsetWidth - FRAME_PAD + 6 : SIZE + 12}" height="${order === 'ltr' ? bodyH - 2 * FRAME_PAD + 12 : bodyH - head.offsetTop - head.offsetHeight - FRAME_PAD + 6}" rx="16" fill="rgba(0,0,0,.14)"/>
        <path d="${knob} Z" fill="${g.color}"/>
        <path d="${knob}" fill="none" stroke="${g.dark}" stroke-width="4" stroke-linejoin="round"/>
        <path d="${knob}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2" transform="translate(2 2)"/>`;
    }
  }

  _drawWrapArrows() {
    const ov = this.overlay;
    ov.innerHTML = '';
    const wrap = this.stripWrapEl;
    // size the overlay to the whole scrollable content (explicit px: the global svg rule would stretch it)
    const W = wrap.scrollWidth, H = wrap.scrollHeight;
    ov.setAttribute('width', W); ov.setAttribute('height', H);
    ov.setAttribute('viewBox', `0 0 ${W} ${H}`);
    ov.style.width = `${W}px`; ov.style.height = `${H}px`;
    if (this.program.order !== 'ltr') return;
    const base = wrap.getBoundingClientRect();
    const sx = wrap.scrollLeft, sy = wrap.scrollTop;
    const z = this.zoom;
    let paths = '';
    // top-level rows and the rows inside every repeat
    const hosts = [this.stripEl, ...this.stripEl.querySelectorAll('.container-body')];
    for (const host of hosts) {
      const pieces = [...host.children].filter((el) => el.classList.contains('piece'));
      for (let i = 1; i < pieces.length; i++) {
        const a = pieces[i - 1].getBoundingClientRect(), b = pieces[i].getBoundingClientRect();
        if (b.left >= a.left) continue; // same row
        // a ends a row, b starts the next one: route an arrow right, down, left, down into b
        const x1 = a.right - base.left + sx - (KNOB - 30) * z, y1 = (a.top + a.bottom) / 2 - base.top + sy;
        const x2 = b.left - base.left + sx, y2 = (b.top + b.bottom) / 2 - base.top + sy;
        const ymid = (a.bottom + b.top) / 2 - base.top + sy;
        const R = 14 * z, back = 16 * z;
        const d = `M${x1} ${y1} h${8 * z} a${R} ${R} 0 0 1 ${R} ${R} V${ymid - R} a${R} ${R} 0 0 1 -${R} ${R} H${x2 - back + R} a${R} ${R} 0 0 0 -${R} ${R} V${y2 - R} a${R} ${R} 0 0 0 ${R} ${R} h${4 * z}`;
        paths += `<path d="${d}" fill="none" stroke="#1a1a1a" stroke-width="${12 * z}" stroke-linecap="round" stroke-linejoin="round" opacity=".15"/>
          <path d="${d}" fill="none" stroke="#5b6b7b" stroke-width="${6 * z}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${2 * z} ${12 * z}"/>
          <path d="M${x2 + 6 * z} ${y2} l${-14 * z} ${-10 * z} v${20 * z} z" fill="#5b6b7b"/>`;
      }
    }
    ov.innerHTML = paths;
  }

  setActive(uid, active) {
    const el = this.stripEl.querySelector(`[data-uid="${uid}"]`);
    if (el) el.classList.toggle('active', active);
  }

  // ---------- model helpers ----------

  _findList(uid, list = this.program.pieces, parent = null) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.uid === uid) return { list, index: i, piece: p, parent };
      if (p.children) {
        const r = this._findList(uid, p.children, p);
        if (r) return r;
      }
    }
    return null;
  }

  _remove(uid) {
    const r = this._findList(uid);
    if (r) r.list.splice(r.index, 1);
    return r?.piece;
  }

  _rerenderPiece(uid) {
    const info = this._findList(uid);
    const node = this.stripEl.querySelector(`[data-uid="${uid}"]`);
    if (!info || !node) return;
    const def = PieceById[info.piece.id];
    node.title = labelFor(info.piece);
    if (def.container) {
      node.querySelector('.container-head').innerHTML = pieceInner(def, info.piece, this.labels);
      this._afterLayout();
    } else {
      node.innerHTML = pieceSvg(def, info.piece, this.program.order, info.index === 0 && !info.parent, info.index === info.list.length - 1, { labels: this.labels });
    }
  }

  // ---------- parameter popover (long press) ----------

  openPopover(uid) {
    const r = this._findList(uid);
    const def = r && PieceById[r.piece.id];
    if (!def?.params || !this.popoverEl) return;
    const piece = r.piece;
    const el = this.stripEl.querySelector(`[data-uid="${uid}"]`);
    const rect = (el.querySelector('.container-head') || el).getBoundingClientRect();
    const numeric = def.params.every((v) => typeof v === 'number');
    const pop = this.popoverEl;
    pop.classList.remove('hidden');
    pop.dataset.uid = uid;
    const paint = () => {
      if (numeric) {
        pop.innerHTML = `<button class="pop-btn" data-step="-1">${Icons.minus()}</button>
          <div class="pop-preview"><div class="pop-dots">${pieceDots(def, piece.param)}</div><div class="pop-icon">${def.icon(piece.param)}</div>${this.labels ? `<div class="pop-label">${labelFor(piece)}</div>` : ''}</div>
          <button class="pop-btn" data-step="1">${Icons.plus()}</button>`;
      } else {
        pop.innerHTML = def.params.map((v) => `<button class="pop-choice ${v === piece.param ? 'on' : ''}" data-value="${v}">${def.icon(v)}</button>`).join('');
      }
    };
    paint();
    pop.onpointerdown = (e) => {
      e.stopPropagation(); e.preventDefault();
      const stepBtn = e.target.closest('[data-step]');
      const choice = e.target.closest('.pop-choice');
      if (stepBtn) { stepParam(piece, Number(stepBtn.dataset.step)); paint(); this._emitTap(piece); }
      else if (choice) { piece.param = choice.dataset.value; this._emitTap(piece); }
      else return;
      this._changed();
      this._rerenderPiece(uid);
      if (!numeric) this.closePopover();
    };
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = rect.left + rect.width / 2 - pw / 2;
    let y = rect.top - ph - 12;
    if (y < 8) y = rect.bottom + 12;
    x = Math.max(8, Math.min(window.innerWidth - pw - 8, x));
    pop.style.left = `${x}px`; pop.style.top = `${y}px`;
  }

  closePopover() { if (this.popoverEl) { this.popoverEl.classList.add('hidden'); this.popoverEl.dataset.uid = ''; } }

  // ---------- drag & drop ----------

  _bindPointer() {
    const onDown = (e) => {
      if (this.locked) return;
      if (this.popoverEl && this.popoverEl.contains(e.target)) return;
      this.closePopover();
      const palette = e.target.closest('.palette-piece');
      const strip = e.target.closest('.piece');
      if (!palette && !strip) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const rect = (palette || strip).getBoundingClientRect();
      this._drag = {
        fromPalette: !!palette,
        pieceId: palette?.dataset.pieceId,
        uid: strip?.dataset.uid,
        startX: e.clientX, startY: e.clientY,
        offX: e.clientX - rect.left, offY: e.clientY - rect.top,
        moved: false, ghost: null, pointerId: e.pointerId, held: false,
      };
      try { (palette || strip).setPointerCapture?.(e.pointerId); } catch (err) { /* synthetic pointer */ }
      clearTimeout(this._holdTimer);
      if (strip) {
        this._holdTimer = setTimeout(() => {
          if (this._drag && !this._drag.moved) { this._drag.held = true; this.openPopover(this._drag.uid); this.dispatchEvent(new CustomEvent('hold')); }
        }, 500);
      }
    };
    const onMove = (e) => {
      const d = this._drag;
      if (!d || d.held) return;
      const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) < 8) return;
      if (!d.moved) {
        clearTimeout(this._holdTimer);
        d.moved = true;
        d.ghost = document.createElement('div');
        d.ghost.className = 'drag-ghost';
        const def = PieceById[d.pieceId || this._findList(d.uid)?.piece.id];
        const piece = d.fromPalette ? { id: def.id, param: def.defaultParam } : this._findList(d.uid)?.piece;
        d.isContainer = !!def.container;
        d.ghost.innerHTML = pieceSvg(def, piece, this.program.order, true, true, { dark: true, labels: this.labels });
        d.ghost.style.zoom = String(this.zoom);
        document.body.appendChild(d.ghost);
        if (!d.fromPalette) this.stripEl.querySelector(`[data-uid="${d.uid}"]`)?.classList.add('dragging');
        this.trashEl?.classList.add('armed');
      }
      d.ghost.style.left = `${(e.clientX - d.offX) / this.zoom}px`;
      d.ghost.style.top = `${(e.clientY - d.offY) / this.zoom}px`;
      this._showDropHint(e.clientX, e.clientY, d);
      this.trashEl?.classList.toggle('hover', this._overTrash(e.clientX, e.clientY));
    };
    const onUp = (e) => {
      clearTimeout(this._holdTimer);
      const d = this._drag;
      if (!d) return;
      this._drag = null;
      if (d.held) return;
      this.trashEl?.classList.remove('armed', 'hover');
      this._clearDropHint();
      if (!d.moved) {
        if (!d.fromPalette) {
          const r = this._findList(d.uid);
          if (r && PieceById[r.piece.id].params) { nextParam(r.piece); this._changed(); this._rerenderPiece(d.uid); this._emitTap(r.piece); }
        } else {
          this.program.pieces.push(makePiece(d.pieceId));
          this._noteUsage(d.pieceId);
          this.render(); this._changed();
        }
        return;
      }
      d.ghost?.remove();
      this.stripEl.querySelector('.dragging')?.classList.remove('dragging');
      const target = this._dropTarget(e.clientX, e.clientY, d);
      let piece;
      if (d.fromPalette) { piece = makePiece(d.pieceId); this._noteUsage(d.pieceId); }
      else piece = this._remove(d.uid);
      if (!piece) { this.render(); return; }
      if (this._overTrash(e.clientX, e.clientY)) { this.render(); this._changed(); this.dispatchEvent(new CustomEvent('trash')); return; }
      if (!target) {
        // dropped on empty editor space: palette pieces vanish, program pieces are thrown away
        this.render(); this._changed();
        if (!d.fromPalette) this.dispatchEvent(new CustomEvent('trash'));
        return;
      } else {
        // insert before the remembered piece: the numeric index may have shifted when the dragged piece was removed
        const at = target.ref ? target.list.indexOf(target.ref) : target.list.length;
        target.list.splice(at < 0 ? target.list.length : at, 0, piece);
      }
      this.render(); this._changed();
    };
    for (const el of [this.paletteEl, this.stripEl]) el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('pointerdown', (e) => { if (this.popoverEl && !this.popoverEl.contains(e.target) && !e.target.closest('.piece')) this.closePopover(); }, true);
    for (const el of [this.paletteEl, this.stripEl]) el.style.touchAction = 'none';
    this.stripWrapEl.addEventListener('scroll', () => this._afterLayout(), { passive: true });
  }

  _emitTap(piece) { this.dispatchEvent(new CustomEvent('tap', { detail: piece })); }

  // ---------- trash: triple tap clears the whole program ----------

  _bindTrashTaps() {
    if (!this.trashEl) return;
    this._trashTaps = 0;
    this._trashTapTimer = null;
    this.trashEl.addEventListener('pointerdown', (e) => {
      if (this.locked) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      clearTimeout(this._trashTapTimer);
      this._trashTaps += 1;
      // taps 1 and 2 only shake the can so the child sees it is listening
      this.trashEl.classList.remove('shake', 'tip');
      void this.trashEl.offsetWidth; // restart the animation
      if (this._trashTaps >= 3) {
        this._trashTaps = 0;
        this.trashEl.classList.add('tip');
        this.dispatchEvent(new CustomEvent('trash'));
        if (this.program.pieces.length) this.clear();
        return;
      }
      this.trashEl.classList.add('shake');
      this._trashTapTimer = setTimeout(() => { this._trashTaps = 0; }, TRASH_TAP_WINDOW_MS);
    });
    this.trashEl.addEventListener('animationend', () => this.trashEl.classList.remove('shake', 'tip'));
  }

  _overTrash(x, y) {
    if (!this.trashEl) return false;
    const r = this.trashEl.getBoundingClientRect();
    return x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 20 && y <= r.bottom + 20;
  }

  /** Decide where a drop at (x,y) goes: { list, index, host } or null when outside the strip. */
  _dropTarget(x, y, d) {
    // the drop has to be close to the program (its pieces or the start flag); empty editor space means "throw it away"
    const near = 50 * this.zoom;
    const anchors = [...this.stripEl.querySelectorAll('.piece, .strip-start')].filter((el) => el.dataset.uid !== d.uid && !el.classList.contains('dragging'));
    const within = (r, pad) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
    let close = anchors.some((el) => within(el.getBoundingClientRect(), near));
    // an empty program has nothing to be near: anywhere in the editor window is a good place for the first piece
    if (!close && !this.program.pieces.length) close = within(this.stripWrapEl.getBoundingClientRect(), 0);
    if (!close) return null;
    const order = this.program.order;
    const els = document.elementsFromPoint(x, y);
    const containerBody = els.find((el) => el.classList?.contains('container-body'));
    let list = this.program.pieces;
    let host = this.stripEl;
    // a repeat can hold pieces, but never another repeat
    if (containerBody && !d.isContainer) {
      const uid = containerBody.dataset.container;
      if (uid !== d.uid) {
        const r = this._findList(uid);
        if (r) { list = r.piece.children; host = containerBody; }
      }
    }
    const children = [...host.children].filter((el) => el.classList.contains('piece') && el.dataset.uid !== d.uid);
    let index = children.length;
    for (let i = 0; i < children.length; i++) {
      const r = children[i].getBoundingClientRect();
      const row = order === 'ltr' && host === this.stripEl;
      if (row) {
        // wrapped rows: a point above a row's band goes before that row; within the band compare x
        if (y < r.top - 8) { index = i; break; }
        if (y <= r.bottom + 8 && x < r.left + r.width / 2) { index = i; break; }
      } else {
        const mid = order === 'ltr' ? r.left + r.width / 2 : r.top + r.height / 2;
        const pos = order === 'ltr' ? x : y;
        if (pos < mid) { index = i; break; }
      }
    }
    const modelList = list.filter((p) => p.uid !== d.uid);
    const ref = modelList[index] || null; // insert before this piece (null = at the end)
    const realIndex = ref ? list.indexOf(ref) : list.length;
    return { list, index: realIndex, ref, host };
  }

  _showDropHint(x, y, d) {
    this._clearDropHint();
    const t = this._dropTarget(x, y, d);
    if (!t) return;
    const hint = document.createElement('div');
    hint.className = 'drop-hint';
    const kids = [...t.host.children].filter((el) => el.classList.contains('piece') && el.dataset.uid !== d.uid);
    const ref = kids[kids.findIndex((el) => t.list.indexOf(this._findList(el.dataset.uid)?.piece) >= t.index)];
    if (ref) t.host.insertBefore(hint, ref); else t.host.insertBefore(hint, t.host.querySelector('.strip-end'));
  }

  _clearDropHint() { this.stripEl.querySelectorAll('.drop-hint').forEach((el) => el.remove()); this._afterLayout(); }
}
