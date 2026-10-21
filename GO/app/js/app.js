// Wires everything together: transport (real brain or pretend brain),
// the puzzle editor, the runner, the drive tab, saved-program stickers, the
// grown-up panel (mode, helper words, palette view) and the parent guide.

import { VexGoBle } from './ble.js';
import { SimBrain } from './sim.js';
import { GoRobot } from './robot.js';
import { Editor } from './editor.js';
import { Runner } from './runner.js';
import { DriveTab } from './drive.js';
import { GamepadInput } from './gamepad.js';
import { SimView } from './simview.js';
import { Icons } from './icons.js';
import { Pieces, Groups, serializeProgram, deserializeProgram, labelFor } from './pieces.js';
import { Sound } from './sound.js';

const $ = (sel) => document.querySelector(sel);
const KEY = (slot) => `vexgo.program.${slot}`;
const ORDER_KEY = 'vexgo.order';
const LABELS_KEY = 'vexgo.labels';

const state = {
  mode: 'sim', // 'sim' | 'ble'
  transport: null, robot: null, runner: null, editor: null, drive: null, simView: null,
  gamepad: new GamepadInput(),
  sound: new Sound(),
  tab: 'build',
};

function log(msg) {
  const el = $('#log');
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
  el.prepend(line);
  while (el.children.length > 200) el.lastChild.remove();
}

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
  r.addEventListener('finish', (e) => { log(e.detail.ok ? 'program finished' : `program stopped: ${e.detail.error}`); if (e.detail.ok) state.sound.finish(); else state.sound.stop(); });
  r.addEventListener('piece', (e) => { state.editor.setActive(e.detail.uid, e.detail.state === 'active'); if (e.detail.state === 'active') state.sound.tick(); });
  r.addEventListener('log', (e) => log(e.detail));
}

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

function showTab(tab) {
  state.tab = tab;
  $('#build').classList.toggle('hidden', tab !== 'build');
  $('#drive-wrap').classList.toggle('hidden', tab !== 'drive');
  $('#tab-build').classList.toggle('on', tab === 'build');
  $('#tab-drive').classList.toggle('on', tab === 'drive');
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
    return `<div class="guide-piece"><div class="gp-icon" style="background:${g.color}">${def.icon(def.defaultParam)}</div><div><b>${labelFor({ id: def.id, param: def.defaultParam })}</b><span>${def.help || ''}</span></div></div>`;
  }).join('');
}

function init() {
  $('#tab-build').innerHTML = Icons.puzzle();
  $('#tab-drive').innerHTML = Icons.steer();
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

  state.editor = new Editor({ paletteEl: $('#palette'), stripEl: $('#strip'), stripWrapEl: $('#strip-wrap'), trashEl: $('#trash'), popoverEl: $('#popover') });
  state.editor.addEventListener('change', () => {
    localStorage.setItem(KEY('autosave'), serializeProgram(state.editor.program));
    localStorage.setItem(ORDER_KEY, state.editor.program.order);
    $('#btn-order').innerHTML = state.editor.program.order === 'ltr' ? Icons.ltr() : Icons.ttb();
  });
  state.editor.addEventListener('tap', () => state.sound.pop());
  state.editor.addEventListener('hold', () => state.sound.pop());
  state.editor.addEventListener('trash', () => state.sound.stop());
  state.editor.addEventListener('settings', paintPaletteTools);
  const order = localStorage.getItem(ORDER_KEY);
  const auto = localStorage.getItem(KEY('autosave'));
  if (auto) { try { state.editor.setProgram(deserializeProgram(auto)); } catch (e) { /* ignore */ } }
  if (order) state.editor.setOrder(order);
  setLabels(localStorage.getItem(LABELS_KEY) === '1');
  paintPaletteTools();
  buildGuide();

  setTransport(VexGoBle.isSupported && localStorage.getItem('vexgo.mode') === 'ble' ? 'ble' : 'sim');

  $('#btn-play').addEventListener('click', async () => {
    state.sound.unlock();
    if (state.runner.running) { await state.runner.stop(); return; }
    if (!state.robot.connected) { flash($('#btn-connect')); state.sound.nope(); return; }
    state.runner.run(state.editor.program);
  });
  $('#btn-stop').addEventListener('click', async () => { state.sound.unlock(); await state.runner.stop(); if (state.tab === 'drive') state.drive.stop().then(() => state.drive.start()); });
  $('#btn-order').addEventListener('click', () => { state.sound.pop(); state.editor.toggleOrder(); });
  $('#btn-zoom-in').addEventListener('click', () => { state.sound.pop(); state.editor.zoomBy(1); });
  $('#btn-zoom-out').addEventListener('click', () => { state.sound.pop(); state.editor.zoomBy(-1); });
  $('#btn-connect').addEventListener('click', async () => {
    state.sound.unlock();
    if (state.mode !== 'ble') { if (!VexGoBle.isSupported) { log('Web Bluetooth not available (use Chrome/Edge on http://localhost or https)'); state.sound.nope(); return; } localStorage.setItem('vexgo.mode', 'ble'); setTransport('ble'); }
    if (state.transport.connected) { await state.transport.disconnect(); return; }
    try { await state.transport.connect(); await state.robot.prepare(); state.sound.finish(); } catch (e) { log('connect failed: ' + e.message); state.sound.nope(); }
  });
  $('#btn-mode').addEventListener('click', () => {
    const next = state.mode === 'sim' ? 'ble' : 'sim';
    if (next === 'ble' && !VexGoBle.isSupported) { log('Web Bluetooth not available in this browser'); return; }
    localStorage.setItem('vexgo.mode', next);
    setTransport(next);
  });
  $('#tab-build').addEventListener('click', () => showTab('build'));
  $('#tab-drive').addEventListener('click', () => showTab('drive'));
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
    if (state.tab !== 'build') return;
    if (e.detail.pressed.start) $('#btn-play').click();
    if (e.detail.pressed.back) $('#btn-stop').click();
  });
  state.gamepad.start();
  showTab('build');
  log('ready');
}

init();
