// Builds the single-file, no-server edition of the app: dist/vex-go-kid-coder.html.
//
// Why: Chrome refuses to load `<script type="module">` from a file:// page (module
// scripts are fetched with CORS and file:// has no origin), so app/index.html cannot be
// double-clicked. This tool concatenates the ES modules under app/js into one classic
// script, inlines it together with app/css/style.css into index.html, and writes a page
// that opens straight from disk. The dev server and the ESM sources stay as they are.
//
// Zero dependencies on purpose. It understands exactly the module syntax this project
// uses and refuses anything else loudly:
//   import { a, b as c } from './x.js';          (also spread over several lines)
//   export const|let|var NAME = …
//   export function|async function|class NAME …
// No default exports, no `export { … }` lists, no re-exports, no dynamic import(), no
// import.meta. Each module becomes `const __m_<name> = (() => { … return { a, b }; })();`
// in dependency order, imports become destructuring from that object, and the whole
// bundle sits in one strict-mode IIFE so nothing leaks onto window.
//
// Usage: npm run build   (or: node tools/build.mjs)
// The output is deterministic, so tests/build.test.mjs can check dist/ is up to date.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const APP_DIR = join(here, '..', 'app');
export const DIST_FILE = join(here, '..', 'dist', 'vex-go-kid-coder.html');
export const ENTRY = 'js/app.js';

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*['"](\.\/[^'"]+)['"];?[ \t]*$/gm;
const EXPORT_RE = /^export\s+(async\s+function\s*\*?|function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
const FORBIDDEN = [
  [/^\s*import\b/m, 'an import form other than `import { … } from \'./x.js\'`'],
  [/^\s*export\b/m, 'an export form other than `export const|let|var|function|class NAME`'],
  [/\bimport\.meta\b/, 'import.meta'],
  [/\bimport\s*\(/, 'dynamic import()'],
];

const varName = (file) => '__m_' + basename(file, '.js').replace(/[^\w$]/g, '_');

/** Parse one module's source into its dependencies, exports and export-stripped body. */
export function analyseModule(file, source) {
  const imports = [];
  let body = source.replace(IMPORT_RE, (_, names, spec) => {
    const bindings = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(s);
      if (!m) throw new Error(`${file}: cannot parse import binding "${s}"`);
      return { name: m[1], local: m[2] || m[1] };
    });
    imports.push({ file: join(dirname(file), spec).replace(/\\/g, '/'), bindings });
    return '';
  });
  const exports = [];
  body = body.replace(EXPORT_RE, (_, kind, name) => { exports.push(name); return `${kind} ${name}`; });
  for (const [re, what] of FORBIDDEN) {
    const m = re.exec(body);
    if (m) throw new Error(`${file}: the bundler does not support ${what} (near "${body.slice(m.index, m.index + 60).split('\n')[0]}")`);
  }
  return { file, imports, exports, body };
}

/** Load the module graph from the entry and return it in dependency order (deps first). */
export async function loadGraph(entry = ENTRY, appDir = APP_DIR) {
  const mods = new Map();
  async function visit(file, stack) {
    if (mods.has(file)) return;
    if (stack.includes(file)) throw new Error(`circular import: ${[...stack, file].join(' -> ')}`);
    const source = await readFile(join(appDir, file), 'utf8');
    const mod = analyseModule(file, source);
    for (const imp of mod.imports) await visit(imp.file, [...stack, file]);
    mods.set(file, mod); // inserted after its dependencies => Map order is topological
  }
  await visit(entry, []);
  for (const mod of mods.values()) {
    for (const imp of mod.imports) {
      const dep = mods.get(imp.file);
      for (const b of imp.bindings) {
        if (!dep.exports.includes(b.name)) throw new Error(`${mod.file} imports "${b.name}" but ${imp.file} does not export it`);
      }
    }
  }
  return [...mods.values()];
}

/** Turn the ordered module list into one classic script. Returns the script and its parts. */
export function bundleModules(mods, entry = ENTRY) {
  const parts = mods.map((mod) => {
    const head = mod.imports.map((imp) => {
      const names = imp.bindings.map((b) => (b.local === b.name ? b.name : `${b.name}: ${b.local}`)).join(', ');
      return `const { ${names} } = ${varName(imp.file)};`;
    }).join('\n');
    const isEntry = mod.file === entry;
    const open = isEntry ? '(() => {' : `const ${varName(mod.file)} = (() => {`;
    const close = isEntry ? '})();' : `return { ${mod.exports.join(', ')} };\n})();`;
    const code = `// ---- ${mod.file} ----\n${open}\n${head}${head ? '\n' : ''}${mod.body.trim()}\n${close}`;
    return { file: mod.file, varName: isEntry ? null : varName(mod.file), exports: mod.exports, code };
  });
  const js = [
    '/* VEX GO Kid Coder, single-file build. Generated by tools/build.mjs from app/; edit the sources there, then run `npm run build`. */',
    '(() => {',
    "'use strict';",
    ...parts.map((p) => p.code),
    '})();',
  ].join('\n');
  return { js, parts };
}

/** Build the standalone page. Pure: reads app/, returns strings, writes nothing. */
export async function build({ appDir = APP_DIR, entry = ENTRY } = {}) {
  const [html, css, mods] = await Promise.all([
    readFile(join(appDir, 'index.html'), 'utf8'),
    readFile(join(appDir, 'css/style.css'), 'utf8'),
    loadGraph(entry, appDir),
  ]);
  const { js, parts } = bundleModules(mods, entry);
  // Inline content must not close its own tag early.
  const safeJs = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const safeCss = css.replace(/<\/style/gi, '<\\/style');

  const linkTag = '<link rel="stylesheet" href="css/style.css">';
  const scriptTag = `<script type="module" src="${entry}"></script>`;
  if (!html.includes(linkTag)) throw new Error(`index.html: expected ${linkTag}`);
  if (!html.includes(scriptTag)) throw new Error(`index.html: expected ${scriptTag}`);
  const out = html
    .replace(linkTag, `<style>\n${safeCss.trim()}\n</style>`)
    .replace(scriptTag, `<script>\n${safeJs}\n</script>`)
    .replace('<head>', '<head>\n<!-- Single-file build of app/ made by tools/build.mjs. Do not edit; change app/ and run `npm run build`. -->');
  return { html: out, js, parts };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { html, parts } = await build();
  await mkdir(dirname(DIST_FILE), { recursive: true });
  await writeFile(DIST_FILE, html);
  console.log(`built ${DIST_FILE} (${(html.length / 1024).toFixed(0)} kB, ${parts.length} modules)`);
}
