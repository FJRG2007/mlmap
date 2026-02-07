<div align="center">
  <h1>MLMap</h1>
  <h3>Projection Mapping Software</h3>
  <img src="https://img.shields.io/badge/Typescript-purple?style=for-the-badge&logo=typescript&logoColor=white"/>
  <a href="https://github.com/FJRG2007"> <img alt="GitHub" src="https://img.shields.io/badge/GitHub-purple?style=for-the-badge&logo=github&logoColor=white"/></a>
  <a href="https://ko-fi.com/fjrg2007"> <img alt="Kofi" src="https://img.shields.io/badge/Ko--fi-purple?style=for-the-badge&logo=ko-fi&logoColor=white"></a>
  <br />
  <br />
  <a href="https://tpe.li/dsc">Discord</a>
  <br />
  <hr />
</div>

![Preview](https://raw.githubusercontent.com/FJRG2007/mlmap/refs/heads/main/gallery/images/image.png)

MLMap is a browser-based projection mapping application built with TypeScript. It runs entirely on the client with no server required, making it easy to deploy as a static site or run directly from local files.

> [!IMPORTANT]
> The project is still in development, so there may be some bugs or errors.

## Features

- **Layer system** with shapes (square, circle, triangle), video, and iframe layers
- **Perspective transform** using CSS `matrix3d` for precise corner-pin mapping
- **Multi-selection** with Ctrl+Click and rubber band selection
- **Layer ordering** via context menu (move up/down/top/bottom)
- **Clipping masks** (Photoshop-style): shapes clip video layers, rendering video only through the mask geometry
- **Video sources**: local files, URLs, screen/tab/window capture (`getDisplayMedia`), webcam (`getUserMedia`)
- **Transport controls**: play, pause, stop, seek, next/previous, volume
- **Audio routing**: choose where audio plays (Editor, Output, or Both)
- **Playlists** with loop and ordering controls
- **Dual-window output**: editor window for control + separate fullscreen display window for projection
- **Display sync** via `BroadcastChannel` (layout, playback state, video data)
- **Multi-monitor** support with screen selection
- **Workspaces** with save/load, duplicate, rename, reset, and delete
- **Workflow import/export** as `.mlmap` files or shareable URL
- **Undo/redo** with full history
- **Snap to edges** for precise alignment
- **Zoom** with workspace scaling
- **Collapsible panels** for a clean editing view

## Getting Started

### Requirements

- Node.js (for building)
- A modern browser (Chrome, Edge, Firefox)

### Install & Build

```bash
npm install
npm run build        # Production build (minified)
npm run dev          # Development build
npm run dev:watch    # Development build with file watching
```

### Run

Open `index.html` in your browser. No web server is required (`file://` works).

To project on an external display, click **Launch Output** in the toolbar. The output window (`display.html`) opens separately and receives all layout and video data via `BroadcastChannel`.

## Controls

Press `SHIFT + Space` to toggle edit mode.

| Action | Key / Mouse |
|--------|-------------|
| Toggle edit mode | `Shift + Space` |
| Move layer | Drag |
| Precise move | `Shift + Drag` |
| Rotate / Scale | `Alt + Drag` |
| Multi-select | `Ctrl + Click` |
| Rubber band select | Drag on empty area |
| Move (arrows) | Arrow keys |
| Solo / Unsolo | `S` |
| Toggle crosshairs | `C` |
| Rotate 90 | `R` |
| Flip H / V | `H` / `V` |
| Toggle bounds | `B` |
| Toggle snap | `G` |
| Delete layer | `Delete` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` |
| Context menu | Right-click on layer |

## Architecture

```
src/
  main.ts              Core MLMap class (layers, transforms, undo/redo, snap)
  uiControls/
    index.ts            Main UI (grid layout, panels, toolbar, context menu)
    videoPanel.ts       Media library, playlists, transport bar, audio routing
  display/
    renderer.ts         Output window renderer (receives commands via BroadcastChannel)
  channel/
    index.ts            BroadcastChannel bridge (control <-> display communication)
    protocol.ts         Message types and intervals
  video/
    sources.ts          Video source manager (files, URLs, captures, webcams)
    playlist.ts         Playlist manager
    clipMaskRenderer.ts Canvas-based clip mask renderer
  utils/
    workflow.ts         Import/export workflows (.mlmap files, shareable URLs)
    storage.ts          LocalStorage workspace persistence
    transform.ts        CSS matrix3d transform utilities
  types/
    index.ts            TypeScript type definitions
  lib/
    data.ts             Version and global constants

dist/
  mlmap.js              Editor bundle
  mlmap-display.js      Output window bundle
```

Build uses esbuild via `build.js` (supports `--watch` and `--minify` flags).

## Author

- FJRG2007
- Email: [fjrg2007@tpeoficial.com](mailto:fjrg2007@tpeoficial.com)

## License

The founder of the project, [FJRG2007](https://github.com/FJRG2007/), reserves the right to modify the license at any time.
This project is licensed under the terms of the [Apache-2.0](./LICENSE).
