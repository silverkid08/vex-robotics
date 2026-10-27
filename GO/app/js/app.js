// Wires everything together: transport (real brain or pretend brain), the puzzle editor, the
// runner, the drive tab, saved-program stickers, Challenge mode (boards on the pretend robot with
// a star grade), child profiles (each child owns programs, stickers and challenge stars), the
// grown-up panel and the parent guide.

import { VexGoBle } from './ble.js';
import { SimBrain } from './sim.js';
import { GoRobot } from './robot.js';
import { Editor, pieceDots } from './editor.js';
import { Runner } from './runner.js';
import { DriveTab } from './drive.js';
import { GamepadInput } from './gamepad.js';
import { SimView } from './simview.js';
import { Icons } from './icons.js';
import { Pieces, Groups, serializeProgram, deserializeProgram, labelFor } from './pieces.js';
import { Sound } from './sound.js';
import { Challenges, gradeSolution } from './challenges.js';
import { Arena, drawBoard, CELL, BoardLegend } from './challenge.js';

const $ = (sel) => document.querySelector(sel);
const LABELS_KEY = 'vexgo.labels';
const TAB_KEY = 'vexgo.tab';
const PROFILES_KEY = 'vexgo.profiles';
const PROFILE_KEY = 'vexgo.profile';
// avatars a child can pick; each gets the matching colour
const AVATARS = ['rabbit', 'turtle', 'cat', 'frog', 'rocket', 'star', 'heart', 'robot'];
const AVATAR_COLORS = { rabbit: '#dbeeff', turtle: '#d7f5dc', cat: '#ffe4c7', frog: '#e3f7e5', rocket: '#e9e4ff', star: '#fff3c4', heart: '#ffd9e1', robot: '#e9eef3' };

const state = {
  mode: 'sim', // 'sim' | 'ble'
  transport: null, robot: null, runner: null, editor: null, drive: null, simView: null,
  gamepad: new GamepadInput(),
  sound: new Sound(),
  tab: 'build',
  profile: null, // { id, avatar }
  challenge: { active: false, index: 0, arena: null },
};

function log(msg) {
  const el = $('#log');
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
  el.prepend(line);
  while (el.children.length > 200) el.lastChild.remove();
}

// ---------------- profiles: every child has their own keys ----------------

/** Key in the current child's space. */
const pk = (name) => `vexgo.${state.profile.id}.${name}`;
const KEY = (slot) => pk(`program.${slot}`);
const ORDER_KEY = () => pk('order');

function loadProfiles() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); } catch (e) { list = []; }
  if (!list.length) {
    // first run: the child who was already playing becomes profile p1 and keeps their programs
    list = [{ id: 'p1', avatar: 'rabbit' }];
    for (const name of ['program.autosave', 'program.star', 'program.heart', 'program.rocket', 'order']) {
      const v = localStorage.getItem(`vexgo.${name}`);
      if (v != null) localStorage.setItem(`vexgo.p1.${name}`, v);
    }
    localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  }
  const current = localStorage.getItem(PROFILE_KEY);
  state.profile = list.find((p) => p.id === current) || list[0];
  localStorage.setItem(PROFILE_KEY, state.profile.id);
  return list;
}
const profiles = () => JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
const avatarIcon = (name) => (name === 'robot' ? Icons.robotFace(true) : (Icons[name] || Icons.star)());

function paintProfileButton() {
  const b = $('#btn-profile');
  b.innerHTML = avatarIcon(state.profile.avatar);
  b.style.background = AVATAR_COLORS[state.profile.avatar] || '#e9eef3';
}

function paintProfiles() {
  const list = profiles();
  $('#profile-list').innerHTML = list.map((p) => `<button class="profile-pick ${p.id === state.profile.id ? 'on' : ''}" data-id="${p.id}" style="background:${AVATAR_COLORS[p.avatar] || '#e9eef3'}" title="Switch child">${avatarIcon(p.avatar)}</button>`).join('')
    + `<button class="profile-pick" id="profile-add" title="Add a child">${Icons.plus()}</button>`;
  $('#avatar-pick').innerHTML = AVATARS.map((a) => `<button class="avatar-btn" data-avatar="${a}" style="background:${AVATAR_COLORS[a]}" title="${a}">${avatarIcon(a)}</button>`).join('');
  $('#avatar-pick').classList.add('hidden');
  for (const el of $('#profile-list').querySelectorAll('[data-id]')) el.addEventListener('click', () => { switchProfile(el.dataset.id); closeProfiles(); });
  $('#profile-add').addEventListener('click', () => { state.sound.pop(); $('#avatar-pick').classList.remove('hidden'); });
  for (const el of $('#avatar-pick').querySelectorAll('[data-avatar]')) el.addEventListener('click', () => { addProfile(el.dataset.avatar); closeProfiles(); });
}

function openProfiles() { state.sound.pop(); paintProfiles(); $('#profiles').classList.remove('hidden'); }
function closeProfiles() { $('#profiles').classList.add('hidden'); }

/** Everything the current child is working on, written to their keys. */
function saveWork() {
  if (!state.editor) return;
  if (state.challenge.active) saveChallengeProgram();
  else localStorage.setItem(KEY('autosave'), serializeProgram(state.editor.program));
  localStorage.setItem(ORDER_KEY(), state.editor.program.order);
}

/** Load the current child's work into the editor (and their challenge, if in Challenge mode). */
function loadWork() {
  const order = localStorage.getItem(ORDER_KEY()) || 'ltr';
  if (state.challenge.active) {
    loadChallenge(Number(localStorage.getItem(pk('challenge.index')) || 0), false);
  } else {
    const auto = localStorage.getItem(KEY('autosave'));
    let program = { order, pieces: [] };
    if (auto) { try { program = deserializeProgram(auto); } catch (e) { /* ignore */ } }
    state.editor.setProgram(program);
  }
  state.editor.setOrder(order);
  paintProfileButton();
  paintCards();
}

function switchProfile(id) {
  if (id === state.profile.id) return;
  const p = profiles().find((x) => x.id === id);
  if (!p) return;
  saveWork();
  state.runner.stop();
  state.profile = p;
  localStorage.setItem(PROFILE_KEY, p.id);
  state.sound.finish();
  loadWork();
  log(`now playing: ${p.avatar} (${p.id})`);
}

function addProfile(avatar) {
  const list = profiles();
  const id = `p${Date.now().toString(36)}`;
  list.push({ id, avatar });
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  switchProfile(id);
}

/** Grown-up panel: remove the current child (two taps within three seconds). */
function removeProfile() {
  const list = profiles();
  if (list.length <= 1) { log('cannot remove the only profile'); state.sound.nope(); return; }
  const btn = $('#btn-profile-remove');
  if (!btn.dataset.armed) {
    btn.dataset.armed = '1'; btn.textContent = 'Really remove? Tap again';
    setTimeout(() => { delete btn.dataset.armed; btn.textContent = "Remove this child's profile"; }, 3000);
    return;
  }
  const gone = state.profile;
  const rest = list.filter((p) => p.id !== gone.id);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(rest));
  for (const k of Object.keys(localStorage)) if (k.startsWith(`vexgo.${gone.id}.`)) localStorage.removeItem(k);
  delete btn.dataset.armed; btn.textContent = "Remove this child's profile";
  state.profile = rest[0];
  localStorage.setItem(PROFILE_KEY, state.profile.id);
  loadWork();
  log(`removed profile ${gone.id}`);
}

// ---------------- transport ----------------

function setTransport(mode) {
  if (state.transport) { try { state.transport.disconnect(); } catch (e) { /* ignore */ } }
  state.mode = mode;
  state.transport = mode === 'ble' ? new VexGoBle() : new SimBrain();
  state.transport.addEventListener('log', (e) => log(e.detail));
  state.transport.addEventListener('state', (e) => paintConnection(e.detail));
  state.transport.addEventListener('deviceinfo', (e) => log(`brain: ${JSON.stringify(e.detail)}`));
  state.robot = new GoRobot(state.transport);
  state.runner = new Runner(state.robot);
  bindRunner();
  if (state.drive) state.drive.stop();
  state.drive = new DriveTab({ root: $('#drive'), robot: state.robot, gamepad: state.gamepad });
  state.drive.addEventListener('error', (e) => log('drive: ' + e.detail));
  $('#simview').classList.toggle('hidden', mode !== 'sim');
  if (mode === 'sim') {
    state.simView = new SimView({ root: $('#simview'), sim: state.transport });
    if (state.challenge.active && state.challenge.arena) attachArena(state.challenge.arena);
    state.transport.connect();
  }
  $('#btn-mode').innerHTML = mode === 'sim' ? Icons.toy() : Icons.robotFace(true);
  $('#btn-mode').title = mode === 'sim' ? 'Pretend robot (tap for real robot)' : 'Real robot (tap for pretend robot)';
  paintConnection(state.transport.state);
  if (state.tab === 'drive') state.drive.start();
}

function paintConnection(s) {
  const btn = $('#btn-connect');
  btn.innerHTML = Icons.bluetooth(s === 'connected');
  btn.classList.toggle('busy', s === 'scanning' || s === 'connecting');
  btn.classList.toggle('on', s === 'connected');
  btn.title = s === 'connected' ? 'Connected (tap to disconnect)' : 'Connect to the robot';
  $('#face').innerHTML = Icons.robotFace(s === 'connected');
  $('#face').classList.toggle('sad', s !== 'connected');
  if (s === 'connected' && state.tab === 'drive') state.drive.onConnected();
}

function bindRunner() {
  const r = state.runner;
  r.addEventListener('start', () => { $('#btn-play').classList.add('running'); state.editor.locked = true; state.sound.start(); if (state.mode === 'sim' && state.simView) state.simView.fitProgram(state.editor.program); });
  r.addEventListener('stop', () => { $('#btn-play').classList.remove('running'); state.editor.locked = false; document.querySelectorAll('.piece.active').forEach((el) => el.classList.remove('active')); });
  r.addEventListener('finish', (e) => {
    log(e.detail.ok ? 'program finished' : `program stopped: ${e.detail.error}`);
    if (state.challenge.active) { if (!state.challenge.arena?.won) state.sound.nope(); return; } // a win plays its own chime
    if (e.detail.ok) state.sound.finish(); else state.sound.stop();
  });
  r.addEventListener('piece', (e) => { state.editor.setActive(e.detail.uid, e.detail.state === 'active'); if (e.detail.state === 'active') state.sound.tick(); });
  r.addEventListener('log', (e) => log(e.detail));
}

// ---------------- stickers ----------------

function saveSlot(slot) {
  localStorage.setItem(KEY(slot), serializeProgram(state.editor.program));
  flash($(`[data-slot="${slot}"]`));
  log(`saved to ${slot}`);
}

function loadSlot(slot) {
  const text = localStorage.getItem(KEY(slot));
  if (!text) return false;
  try { state.editor.setProgram(deserializeProgram(text)); flash($(`[data-slot="${slot}"]`)); return true; } catch (e) { log('load failed ' + e.message); return false; }
}

function flash(el) { if (!el) return; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 400); }

// ---------------- tabs ----------------

function showTab(tab) {
  if (tab === 'challenge' && state.tab !== 'challenge') enterChallenge();
  if (tab !== 'challenge' && state.tab === 'challenge') leaveChallenge();
  state.tab = tab;
  localStorage.setItem(TAB_KEY, tab);
  $('#build').classList.toggle('hidden', tab === 'drive');
  $('#drive-wrap').classList.toggle('hidden', tab !== 'drive');
  $('#tab-build').classList.toggle('on', tab === 'build');
  $('#tab-drive').classList.toggle('on', tab === 'drive');
  $('#tab-challenge').classList.toggle('on', tab === 'challenge');
  if (tab === 'drive') { state.runner.stop(); state.drive.start(); } else { state.drive.stop(); }
}

function setLabels(on) {
  document.body.classList.toggle('labels', on);
  $('#chk-labels').checked = on;
  $('#pal-labels').classList.toggle('on', on);
  $('#pal-labels').innerHTML = Icons.label(on);
  state.editor.setLabels(on);
  localStorage.setItem(LABELS_KEY, on ? '1' : '0');
}

function paintPaletteTools() {
  const s = state.editor.settings;
  $('#pal-size').innerHTML = { small: Icons.sizeSmall(), medium: Icons.sizeMedium(), large: Icons.sizeLarge() }[s.size];
  $('#pal-layout').innerHTML = { list: Icons.layoutList(), grid: Icons.layoutGrid(), tray: Icons.layoutTray() }[s.layout];
  $('#pal-sort').innerHTML = { family: Icons.sortFamily(), az: Icons.sortAz(), recent: Icons.sortRecent() }[s.sort];
  $('#sel-size').value = s.size; $('#sel-layout').value = s.layout; $('#sel-sort').value = s.sort;
  $('#build').classList.toggle('tray', s.layout === 'tray');
}

function buildGuide() {
  const host = $('#guide-pieces');
  host.innerHTML = Pieces.map((def) => {
    const g = Groups[def.group];
    return `<div class="guide-piece"><div class="gp-icon" style="background:${g.color}"><div class="gp-dots">${pieceDots(def, def.defaultParam)}</div>${def.icon(def.defaultParam)}</div><div><b>${labelFor({ id: def.id, param: def.defaultParam })}</b><span>${def.help || ''}</span></div></div>`;
  }).join('');
}

/** Parent guide: every board picture drawn by the real board code, with what it is and what to do. */
function buildBoardGuide() {
  const host = $('#guide-board');
  host.innerHTML = BoardLegend.map((item, i) => `<div class="guide-piece"><canvas class="gp-board" data-i="${i}" width="192" height="128"></canvas><div><b>${item.title}</b><span>${item.text}</span></div></div>`).join('');
  for (const canvas of host.querySelectorAll('canvas')) {
    const item = BoardLegend[Number(canvas.dataset.i)];
    const arena = new Arena({ id: `legend${canvas.dataset.i}`, sample: true, grid: item.grid, dir: item.dir, gate: item.gate });
    if (item.setup) item.setup(arena);
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, pad = 8;
    const scale = Math.min((W - 2 * pad) / arena.widthMm, (H - 2 * pad) / arena.heightMm);
    const ox = (W - arena.widthMm * scale) / 2, oy = (H - arena.heightMm * scale) / 2;
    ctx.fillStyle = '#eef2f7'; ctx.fillRect(0, 0, W, H);
    drawBoard(ctx, arena, (x, y) => [ox + x * scale, oy + y * scale], scale);
  }
}

// ---------------- challenge mode ----------------

const doneMap = () => { try { return JSON.parse(localStorage.getItem(pk('challenge.done')) || '{}'); } catch (e) { return {}; } };

function enterChallenge() {
  if (state.challenge.active) return;
  state.runner.stop();
  localStorage.setItem(KEY('free'), serializeProgram(state.editor.program)); // stash free play
  state.challenge.active = true;
  if (state.mode !== 'sim') setTransport('sim');
  document.body.classList.add('challenge');
  $('#challenge-bar').classList.remove('hidden');
  loadChallenge(Number(localStorage.getItem(pk('challenge.index')) || 0), false);
}

function leaveChallenge() {
  if (!state.challenge.active) return;
  state.runner.stop();
  saveChallengeProgram();
  state.challenge.active = false;
  state.challenge.arena = null;
  state.transport.setArena?.(null);
  state.simView?.setArena(null);
  document.body.classList.remove('challenge');
  $('#challenge-bar').classList.add('hidden');
  $('#win').classList.add('hidden');
  const free = localStorage.getItem(KEY('free'));
  let program = { order: state.editor.program.order, pieces: [] };
  if (free) { try { program = deserializeProgram(free); } catch (e) { /* ignore */ } }
  state.editor.setProgram(program);
}

function saveChallengeProgram() {
  const def = Challenges[state.challenge.index];
  if (def && state.challenge.active) localStorage.setItem(pk(`program.challenge.${def.id}`), serializeProgram(state.editor.program));
}

function attachArena(arena) {
  state.transport.setArena?.(arena);
  state.simView?.setArena(arena);
}

function loadChallenge(i, save = true) {
  if (save) saveChallengeProgram();
  state.runner.stop();
  $('#win').classList.add('hidden');
  i = Math.max(0, Math.min(Challenges.length - 1, i));
  const def = Challenges[i];
  state.challenge.index = i;
  localStorage.setItem(pk('challenge.index'), String(i));
  const arena = new Arena(def);
  state.challenge.arena = arena;
  arena.addEventListener('progress', (e) => { if (e.detail?.kind === 'gate') state.sound.pop(); else state.sound.tick(); });
  arena.addEventListener('bump', () => state.sound.nope());
  arena.addEventListener('won', () => onWin(def));
  attachArena(arena);
  const saved = localStorage.getItem(pk(`program.challenge.${def.id}`));
  let program = { order: state.editor.program.order, pieces: [] };
  if (saved) { try { program = deserializeProgram(saved); } catch (e) { /* ignore */ } }
  state.editor.setProgram(program);
  paintCards();
  log(`challenge ${i + 1}: ${def.name} (par ${def.par}) — ${def.hint}`);
}

function onWin(def) {
  if (!state.challenge.active || Challenges[state.challenge.index] !== def) return;
  const stars = gradeSolution(def, state.editor.program);
  const done = doneMap();
  if ((done[def.id] || 0) < stars) { done[def.id] = stars; localStorage.setItem(pk('challenge.done'), JSON.stringify(done)); }
  log(`won ${def.name} with ${stars} star${stars === 1 ? '' : 's'}`);
  state.sound.finish();
  setTimeout(() => state.sound.finish(), 350);
  state.runner.stop();
  $('#win-stars').innerHTML = [1, 2, 3].map((k) => `<span class="${k <= stars ? 'on' : ''}">${k <= stars ? Icons.star() : Icons.starOutline()}</span>`).join('');
  $('#win-face').innerHTML = Icons.robotFace(true);
  $('#win-next').innerHTML = Icons.arrowRight();
  $('#win-next').classList.toggle('hidden', state.challenge.index >= Challenges.length - 1);
  $('#win').classList.remove('hidden');
  paintCards();
}

function buildCards() {
  const bar = $('#challenge-bar');
  bar.innerHTML = Challenges.map((def, i) => `<button class="level-card" data-i="${i}" title="${i + 1}. ${def.name}"><canvas width="168" height="128"></canvas><span class="stars"></span></button>`).join('');
  for (const card of bar.querySelectorAll('.level-card')) {
    const i = Number(card.dataset.i);
    const arena = new Arena(Challenges[i]);
    const canvas = card.querySelector('canvas'); const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, pad = 6;
    const scale = Math.min((W - 2 * pad) / arena.widthMm, (H - 2 * pad) / arena.heightMm);
    const ox = (W - arena.widthMm * scale) / 2, oy = (H - arena.heightMm * scale) / 2;
    drawBoard(ctx, arena, (x, y) => [ox + x * scale, oy + y * scale], scale, { thumb: true });
    // the robot's start, as a small blue dot
    const s = arena.board.start;
    ctx.fillStyle = '#4da3ff'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox + (s.c + 0.5) * CELL * scale, oy + (s.r + 0.5) * CELL * scale, CELL * scale * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    card.addEventListener('click', () => { state.sound.pop(); loadChallenge(i); });
  }
}

function paintCards() {
  const done = doneMap();
  for (const card of document.querySelectorAll('.level-card')) {
    const i = Number(card.dataset.i);
    card.classList.toggle('on', state.challenge.active && i === state.challenge.index);
    const stars = done[Challenges[i].id] || 0;
    card.querySelector('.stars').innerHTML = stars ? Array.from({ length: stars }, () => Icons.star()).join('') : '';
    if (state.challenge.active && i === state.challenge.index) card.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }
}

// ---------------- init ----------------

function init() {
  $('#tab-build').innerHTML = Icons.puzzle();
  $('#tab-drive').innerHTML = Icons.steer();
  $('#tab-challenge').innerHTML = Icons.trophy();
  $('#btn-play').innerHTML = Icons.play();
  $('#btn-stop').innerHTML = Icons.stop();
  $('#trash').innerHTML = Icons.trash();
  $('#btn-order').innerHTML = Icons.ltr();
  $('#btn-gear').innerHTML = Icons.gear();
  $('#btn-guide').innerHTML = Icons.book();
  $('#btn-zoom-in').innerHTML = Icons.zoomIn();
  $('#btn-zoom-out').innerHTML = Icons.zoomOut();
  $('#guide-close').innerHTML = Icons.close();
  $('[data-slot="star"]').innerHTML = Icons.star();
  $('[data-slot="heart"]').innerHTML = Icons.heart();
  $('[data-slot="rocket"]').innerHTML = Icons.rocket();

  loadProfiles();
  paintProfileButton();

  state.editor = new Editor({ paletteEl: $('#palette'), stripEl: $('#strip'), stripWrapEl: $('#strip-wrap'), trashEl: $('#trash'), popoverEl: $('#popover') });
  state.editor.addEventListener('change', () => {
    saveWork();
    $('#btn-order').innerHTML = state.editor.program.order === 'ltr' ? Icons.ltr() : Icons.ttb();
  });
  state.editor.addEventListener('tap', () => state.sound.pop());
  state.editor.addEventListener('hold', () => state.sound.pop());
  state.editor.addEventListener('trash', () => state.sound.stop());
  state.editor.addEventListener('settings', paintPaletteTools);
  buildCards();
  loadWork();
  setLabels(localStorage.getItem(LABELS_KEY) === '1');
  paintPaletteTools();
  buildGuide();
  buildBoardGuide();

  setTransport(VexGoBle.isSupported && localStorage.getItem('vexgo.mode') === 'ble' ? 'ble' : 'sim');

  $('#btn-play').addEventListener('click', async () => {
    state.sound.unlock();
    if (state.runner.running) { await state.runner.stop(); return; }
    if (!state.robot.connected) { flash($('#btn-connect')); state.sound.nope(); return; }
    $('#win').classList.add('hidden');
    state.runner.run(state.editor.program);
  });
  $('#btn-stop').addEventListener('click', async () => { state.sound.unlock(); await state.runner.stop(); if (state.tab === 'drive') state.drive.stop().then(() => state.drive.start()); });
  $('#btn-order').addEventListener('click', () => { state.sound.pop(); state.editor.toggleOrder(); });
  $('#btn-zoom-in').addEventListener('click', () => { state.sound.pop(); state.editor.zoomBy(1); });
  $('#btn-zoom-out').addEventListener('click', () => { state.sound.pop(); state.editor.zoomBy(-1); });
  $('#btn-connect').addEventListener('click', async () => {
    state.sound.unlock();
    if (state.challenge.active) { log('challenges run on the pretend robot; go to the Build tab to connect a real brain'); state.sound.nope(); return; }
    if (state.mode !== 'ble') { if (!VexGoBle.isSupported) { log('Web Bluetooth not available (use Chrome/Edge on http://localhost or https)'); state.sound.nope(); return; } localStorage.setItem('vexgo.mode', 'ble'); setTransport('ble'); }
    if (state.transport.connected) { await state.transport.disconnect(); return; }
    try { await state.transport.connect(); await state.robot.prepare(); state.sound.finish(); } catch (e) { log('connect failed: ' + e.message); state.sound.nope(); }
  });
  $('#btn-mode').addEventListener('click', () => {
    if (state.challenge.active) { log('challenges always use the pretend robot'); return; }
    const next = state.mode === 'sim' ? 'ble' : 'sim';
    if (next === 'ble' && !VexGoBle.isSupported) { log('Web Bluetooth not available in this browser'); return; }
    localStorage.setItem('vexgo.mode', next);
    setTransport(next);
  });
  $('#tab-build').addEventListener('click', () => showTab('build'));
  $('#tab-drive').addEventListener('click', () => showTab('drive'));
  $('#tab-challenge').addEventListener('click', () => { state.sound.unlock(); showTab('challenge'); });
  $('#win').addEventListener('click', (e) => { if (e.target.id === 'win') $('#win').classList.add('hidden'); });
  $('#win-next').addEventListener('click', () => { state.sound.pop(); $('#win').classList.add('hidden'); loadChallenge(state.challenge.index + 1); });
  $('#btn-profile').addEventListener('click', openProfiles);
  $('#profiles').addEventListener('click', (e) => { if (e.target.id === 'profiles') closeProfiles(); });
  $('#btn-profile-remove').addEventListener('click', removeProfile);
  $('#btn-gear').addEventListener('click', () => $('#grownup').classList.toggle('hidden'));
  $('#btn-clear').addEventListener('click', () => state.editor.clear());
  $('#chk-labels').addEventListener('change', (e) => setLabels(e.target.checked));
  $('#pal-labels').addEventListener('click', () => setLabels(!document.body.classList.contains('labels')));
  $('#pal-size').addEventListener('click', () => state.editor.cyclePaletteSetting('size'));
  $('#pal-layout').addEventListener('click', () => state.editor.cyclePaletteSetting('layout'));
  $('#pal-sort').addEventListener('click', () => state.editor.cyclePaletteSetting('sort'));
  $('#sel-size').addEventListener('change', (e) => state.editor.setPaletteSetting('size', e.target.value));
  $('#sel-layout').addEventListener('change', (e) => state.editor.setPaletteSetting('layout', e.target.value));
  $('#sel-sort').addEventListener('change', (e) => state.editor.setPaletteSetting('sort', e.target.value));
  const openGuide = () => $('#guide').classList.remove('hidden');
  $('#btn-guide').addEventListener('click', openGuide);
  $('#btn-guide2').addEventListener('click', openGuide);
  $('#guide-close').addEventListener('click', () => $('#guide').classList.add('hidden'));
  $('#guide').addEventListener('click', (e) => { if (e.target.id === 'guide') $('#guide').classList.add('hidden'); });
  for (const el of document.querySelectorAll('[data-slot]')) {
    const slot = el.dataset.slot;
    let timer = null;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); timer = setTimeout(() => { timer = null; saveSlot(slot); state.sound.finish(); }, 800); });
    const end = () => { if (timer) { clearTimeout(timer); timer = null; if (!loadSlot(slot)) state.sound.nope(); else state.sound.pop(); } };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', () => { if (timer) { clearTimeout(timer); timer = null; } });
  }
  state.gamepad.addEventListener('input', (e) => {
    if (state.tab === 'drive') return;
    if (e.detail.pressed.start) $('#btn-play').click();
    if (e.detail.pressed.back) $('#btn-stop').click();
  });
  state.gamepad.start();
  showTab(localStorage.getItem(TAB_KEY) === 'challenge' ? 'challenge' : 'build'); // come back where the child left off
  log('ready');
}

init();
