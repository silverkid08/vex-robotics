# vex-robotics

Projects for VEX robots. Each one lives in its own folder.

| Folder | What it is |
|--------|------------|
| [`GO/`](GO/) | **VEX GO Kid Coder**: a picture-only, puzzle-piece programming and driving app for VEX GO robots, made for pre-readers. Runs in the browser and talks to the GO Brain over Web Bluetooth. |

## Launching the VEX GO Kid Coder

### Quickest: open the single file (no install)

1. Open `GO/dist/vex-go-kid-coder.html` in Chrome or Edge (double-click it, or drag it onto the browser window).
2. The app starts in pretend-robot mode, so everything works immediately with no robot and no internet.

The file is the complete app with its code and styles inlined. You can copy it to a USB stick or another computer and it still works. Nothing needs to be installed.

### For the real robot: run the local server

Web Bluetooth only works from `localhost` or an HTTPS page, so use the small bundled server when connecting to a GO Brain. This needs [Node.js](https://nodejs.org) 20 or newer.

```powershell
cd GO
npm start
```

Then open http://localhost:8080 in Chrome or Edge, turn on the GO Brain, tap the round Bluetooth button in the top right and pick the brain from the list. The robot face smiles when it is connected. Leave the server window open while you use the app.

### Requirements

- Chrome or Edge. Firefox and Safari can run the pretend robot only, since they lack Web Bluetooth.
- A computer with Bluetooth for the real robot.
- Node.js 20 or newer only if you use the local server or want to change the app.

### Changing the app

The sources are in `GO/app/`. After editing them, run `npm run build` inside `GO/` to regenerate the single file, and `npm test` to run the tests. See [`GO/README.md`](GO/README.md) and [`GO/docs/`](GO/docs/README.md) for the full guide.
