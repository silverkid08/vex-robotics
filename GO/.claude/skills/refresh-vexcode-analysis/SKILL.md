---
name: refresh-vexcode-analysis
description: Procedure to re-extract VEXcode GO internals from codego.vex.com (bundle download, chunk map, BLE protocol modules, GO controller, Python `go` package, block → Python dump) and regenerate the encoder golden vectors. Use when VEX ships a new VEXcode GO version, when a command stops working, or when documenting a feature not yet covered in docs/.
---

# Refresh the VEXcode GO analysis

All work happens in a scratch folder; nothing from VEX is committed except numeric golden vectors.

## 1. Find the current version and bundle
```
curl -sL https://codego.vex.com/ -o index.html      # look for main.bundle.js?v=<version>
curl -sL "https://codego.vex.com/dist/main.bundle.js?v=<version>" -o main.bundle.js   # ~51 MB, unminified
```
(`lib/pyodide-0.17.0/*` is behind Cloudflare bot protection for curl — fetch those from inside the page, see step 5.)

## 2. Chunk map → download the interesting chunks
In Python: regex `__webpack_require__\.u = \(chunkId\) => \{.*?return "" \+ (\{.*?\})\[chunkId\]` (DOTALL) on the bundle, `json.loads` the object. URL = `https://codego.vex.com/dist/<hash>.<chunkName>.bundle.js`. Chunks that matter:
* `vendors-node_modules_vexcode_vex-ble-device-manager_dist_lib_src_index_js-…` — split by `/***/ "./node_modules/…"` headers into `ProgramUtil.js` (encoder), `VEXBLEDeviceManager.js` (GATT, notifications, controller), `types/*.js` (enums).
* `src_HardwareInterface_GO123_GO123WebBLE_ts`, `…_GOWebBLE_ts`, `…_GO123Interface_ts` (minified; grep for method names like `executeScriptCommand`).
* `src_Blockly_Extensions_GOBlocks_ts`, `src_texteditor_db_apidb_go_python_json` (API DB; `JSON.parse('…')` inside), `static_sample_files_sampleFilesDataGO_json` (sample projects incl. `rconfig`).
* `PyodideVMWebWorker.bundle.js?v=<version>` (contains `./src/PyodideVM/PyodideGOInterface.ts`).

## 3. Main-bundle modules (not chunked)
Find a module with `src.find('/***/ "./src/HardwareInterface/controllers/VEXGOController.ts"')` and cut to the next `\n/***/ }),`. Also `VEX123GOSensors.ts` (derived sensor values), `GoConfigController` (search `function _sendCurrentConfigToBrain`), code generation (`function genGOHeaders(`). Strip `_X__WEBPACK_IMPORTED_MODULE_N__.` prefixes with a regex for readability; the code is Babel-regenerator output, so grep for `goController.` calls and `key: "…"` method names rather than reading linearly.

## 4. Regenerate golden vectors
Concatenate `BitManipulations.js` + `ProgramUtil.js` bodies into a CommonJS file (remove webpack export lines, replace the logger with a no-op object), append `module.exports = { scriptLineToCommand, uint32ToByteArray }`, run the script list from `tests/fixtures/vex-command-golden.json` keys and write `{script: {value, bytes}}`. Then `npm test`.

## 5. Python `go` package and block → Python mapping (needs the live page)
With Claude in Chrome on https://codego.vex.com:
* Load a Code Base config: `webapp.projectManager.loadProjectDataJSON({mode:'Blocks', workspace:'<xml …when_started…>', rconfig:[{port:[1,2,3,4],name:'Code Base',customName:false,deviceType:'Code Base',setting:{},triportSourcePort:22}], slot:0, platform:'GO', fileFormat:'1.0.1'}, undefined, true)`.
* Dump blocks: for each `Object.keys(Blockly.Blocks).filter(k=>k.startsWith('go_'))` create it in `new Blockly.Workspace()` (wrap in `Blockly.Events.disable()`), record `b.toString()` and `Blockly.Python.blockToCode(b)`.
* Python source: inject `/lib/pyodide-0.17.0/pyodide.js`, `await loadPyodide({indexURL:'/lib/pyodide-0.17.0/'})`, `await pyodide.loadPackage('go')`, then `pyodide._module.FS.readFile('/lib/python3.8/site-packages/go/devices.py', {encoding:'utf8'})`.
* Getting big text out of the page: the JS tool truncates/blocks long outputs (strings with `=`/`;` look like cookies). Put the text in a `<pre>` inside an `<article>` that replaces `document.body`, then call `get_page_text` (≈50 KB per read) and reload the page afterwards.

## 6. Update docs
`docs/01` (architecture/locations), `docs/02` (protocol tables), `docs/03` (blocks), `docs/04` (Python), and bump the version noted in `docs/README.md`.
