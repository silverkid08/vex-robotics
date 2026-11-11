// Guards the single-file build (tools/build.mjs): the bundler must turn every ES module
// into plain script, every library module must evaluate and export what the sources
// export, and the committed dist/ page must match what the sources produce today.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { build, analyseModule, DIST_FILE } from '../tools/build.mjs';

const built = await build();

test('bundle is a classic script: no module syntax, inlined into the page', () => {
  assert.doesNotMatch(built.js, /^\s*(import|export)\b/m);
  assert.doesNotMatch(built.js, /\bimport\.meta\b/);
  new vm.Script(built.js); // throws on a syntax error
  assert.ok(built.html.includes('<style>'), 'CSS inlined');
  assert.ok(built.html.includes('<script>\n'), 'JS inlined');
  assert.doesNotMatch(built.html, /type="module"|src="js\/|href="css\//);
  assert.equal(built.parts.at(-1).file, 'js/app.js', 'entry module runs last');
});

test('every library module evaluates and exposes exactly its exports', () => {
  const lib = built.parts.filter((p) => p.varName);
  const code = `'use strict';\n${lib.map((p) => p.code).join('\n')}\n({ ${lib.map((p) => p.varName).join(', ')} })`;
  const sandbox = { console, setTimeout, clearTimeout, setInterval, clearInterval, performance, TextEncoder, TextDecoder, EventTarget, Event, CustomEvent, URL };
  const mods = vm.runInNewContext(code, sandbox, { filename: 'bundle.js' });
  for (const p of lib) {
    const got = Object.keys(mods[p.varName]).sort();
    assert.deepEqual(got, [...p.exports].sort(), `${p.file} exports`);
    for (const name of p.exports) assert.notEqual(mods[p.varName][name], undefined, `${p.file}: ${name} is undefined`);
  }
  assert.equal(typeof mods.__m_encoder.scriptLineToCommand, 'function');
  assert.equal(typeof mods.__m_sim.SimBrain, 'function');
});

test('bundler rejects module syntax it cannot translate', () => {
  assert.throws(() => analyseModule('x.js', 'export default 1;'), /export form/);
  assert.throws(() => analyseModule('x.js', "export { a } from './y.js';"), /export form/);
  assert.throws(() => analyseModule('x.js', "import y from './y.js';"), /import form/);
  assert.throws(() => analyseModule('x.js', "const u = import.meta.url;"), /import\.meta/);
  assert.throws(() => analyseModule('x.js', "const m = import('./y.js');"), /dynamic import/);
  const ok = analyseModule('a/x.js', "import { a,\n b as c } from './y.js';\nexport const z = 1;\nexport async function f() {}\n");
  assert.deepEqual(ok.imports, [{ file: 'a/y.js', bindings: [{ name: 'a', local: 'a' }, { name: 'b', local: 'c' }] }]);
  assert.deepEqual(ok.exports, ['z', 'f']);
  assert.doesNotMatch(ok.body, /export|import/);
});

test('dist/vex-go-kid-coder.html is up to date (run `npm run build` after editing app/)', async () => {
  const raw = await readFile(DIST_FILE, 'utf8').catch(() => null);
  assert.ok(raw !== null, 'dist/vex-go-kid-coder.html is missing: run `npm run build`');
  const onDisk = raw.replace(/\r\n?/g, '\n'); // git may have checked it out with CRLF
  assert.equal(onDisk.length, built.html.length, 'dist page is stale: run `npm run build`');
  assert.ok(onDisk === built.html, 'dist page is stale: run `npm run build`');
});
