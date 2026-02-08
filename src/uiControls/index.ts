import { MLMap } from "../main";
import * as Types from "../types";
import { VERSION, DISPLAY_URL } from "../lib/data";
import * as utils from "../utils/basics";
import * as storage from "../utils/storage";
import { checkLatestVersion } from "../utils/remote";
import { ChannelBridge } from "../channel";
import { initVideoUI } from "./videoPanel";
import { exportWorkflow, importWorkflow, downloadWorkflow, uploadWorkflow, generateShareUrl } from "../utils/workflow";
import { ClipMaskRenderer, ClipGroup } from "../video/clipMaskRenderer";

export function initUIControls(baseMLMap: MLMap) {
    // ---- DEVICE / SCREEN CHECK ----
    const tooSmall = window.innerWidth < 900 || window.innerHeight < 500;
    const touchOnly = window.matchMedia("(pointer: coarse)").matches
        && !window.matchMedia("(pointer: fine)").matches;

    if (tooSmall || touchOnly) {
        const overlay = document.createElement("div");
        overlay.id = "mlmap-device-warning";
        overlay.style.cssText = "position:fixed;inset:0;z-index:9999999;background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#ccc;padding:32px;";
        overlay.innerHTML = `
            <div style="font-size:48px;margin-bottom:16px;">\uD83D\uDDA5\uFE0F</div>
            <h2 style="color:#fff;margin:0 0 12px;font-size:20px;">Screen too small</h2>
            <p style="max-width:400px;line-height:1.6;margin:0 0 24px;color:#999;">
                MLMap requires a computer or tablet with a keyboard and mouse.<br>
                Minimum screen size: 900 &times; 500 px.
            </p>
            <p style="font-size:12px;color:#555;">Current: ${window.innerWidth} &times; ${window.innerHeight} px</p>
        `;
        document.body.appendChild(overlay);

        // Re-check on resize (user might rotate tablet or resize window)
        window.addEventListener("resize", () => {
            const ok = window.innerWidth >= 900 && window.innerHeight >= 500;
            if (ok && overlay.parentElement) {
                overlay.remove();
            }
        });

        return;
    }

    // ---- INJECT STYLES ----
    const style = document.createElement("style");
    style.textContent = `
        #mlmap-app {
            position: fixed;
            inset: 0;
            display: grid;
            grid-template-rows: 38px 1fr 48px;
            grid-template-columns: 210px 1fr 270px;
            grid-template-areas:
                "toolbar toolbar toolbar"
                "left center right"
                "transport transport transport";
            z-index: 1000001;
            pointer-events: none;
            font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            color: #ccc;
            user-select: none;
        }
        #mlmap-toolbar {
            grid-area: toolbar;
            pointer-events: auto;
            background: #1a1a1a;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
        }
        #mlmap-left {
            grid-area: left;
            pointer-events: auto;
            background: #222;
            border-right: 1px solid #333;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        #mlmap-right {
            grid-area: right;
            pointer-events: auto;
            background: #222;
            border-left: 1px solid #333;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        #mlmap-transport {
            grid-area: transport;
            pointer-events: auto;
            background: #1a1a1a;
            border-top: 1px solid #333;
            display: flex;
            align-items: center;
            padding: 0 10px;
            gap: 8px;
        }
        .mlmap-section {
            padding: 8px;
            border-bottom: 1px solid #333;
        }
        .mlmap-section-title {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888;
            margin-bottom: 6px;
        }
        .mlmap-btn {
            background: #383838;
            color: #ccc;
            border: none;
            border-radius: 3px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            font-family: inherit;
        }
        .mlmap-btn:hover { background: #484848; color: #fff; }
        .mlmap-btn:active { background: #555; }
        .mlmap-btn-primary { background: #2a6cb5; color: #fff; }
        .mlmap-btn-primary:hover { background: #3580d0; }
        .mlmap-input {
            background: #1a1a1a;
            color: #ccc;
            border: 1px solid #444;
            border-radius: 3px;
            padding: 4px 6px;
            font-size: 11px;
            font-family: inherit;
            outline: none;
        }
        .mlmap-input:focus { border-color: #2a6cb5; }
        .mlmap-select {
            background: #1a1a1a;
            color: #ccc;
            border: 1px solid #444;
            border-radius: 3px;
            padding: 4px 6px;
            font-size: 11px;
            font-family: inherit;
            outline: none;
        }
        .mlmap-layer-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 3px 6px;
            border-radius: 3px;
            cursor: default;
        }
        .mlmap-layer-item:hover { background: #2a2a2a; }
        .mlmap-layer-item .name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 11px;
        }
        .mlmap-layer-item .icon {
            width: 14px;
            text-align: center;
            flex-shrink: 0;
            font-size: 10px;
        }
        .mlmap-layer-item .del-btn {
            opacity: 0;
            cursor: pointer;
            color: #f55;
            background: none;
            border: none;
            font-size: 11px;
            padding: 0 2px;
        }
        .mlmap-layer-item:hover .del-btn { opacity: 1; }
        .mlmap-media-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 3px 6px;
            border-radius: 3px;
        }
        .mlmap-media-item:hover { background: #2a2a2a; }
        .mlmap-media-item .name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 11px;
        }
        .mlmap-pl-item {
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 3px 4px;
            border-radius: 3px;
            font-size: 11px;
        }
        .mlmap-pl-item:hover { background: #2a2a2a; }
        .mlmap-pl-item .name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .transport-btn {
            background: #333;
            color: #ccc;
            border: none;
            width: 30px;
            height: 26px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .transport-btn:hover { background: #444; color: #fff; }
        .mlmap-range {
            -webkit-appearance: none;
            appearance: none;
            background: #333;
            height: 6px;
            border-radius: 3px;
            outline: none;
            cursor: pointer;
        }
        .mlmap-range::-webkit-slider-runnable-track {
            height: 6px;
            border-radius: 3px;
        }
        .mlmap-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #aaa;
            cursor: pointer;
            margin-top: -4px;
        }
        .mlmap-range::-webkit-slider-thumb:hover { background: #fff; }
        .mlmap-range::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #aaa;
            cursor: pointer;
            border: none;
        }
        .mlmap-range::-moz-range-track {
            height: 6px;
            border-radius: 3px;
            background: #333;
        }
        .toolbar-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .app-title {
            font-weight: 700;
            font-size: 14px;
            color: #fff;
            letter-spacing: -0.5px;
            margin-right: 8px;
        }
        .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            display: inline-block;
        }
        .status-dot.connected { background: #4CAF50; }
        .status-dot.disconnected { background: #555; }
        #mlmap-left::-webkit-scrollbar,
        #mlmap-right::-webkit-scrollbar { width: 5px; }
        #mlmap-left::-webkit-scrollbar-track,
        #mlmap-right::-webkit-scrollbar-track { background: #1a1a1a; }
        #mlmap-left::-webkit-scrollbar-thumb,
        #mlmap-right::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        .add-layer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px;
        }
        .ws-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 3px;
            margin-top: 4px;
        }
        /* Context menu */
        #mlmap-context-menu {
            position: fixed;
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 0;
            min-width: 180px;
            z-index: 1000010;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            color: #ccc;
            display: none;
            pointer-events: auto;
        }
        .ctx-item {
            padding: 6px 16px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ctx-item:hover { background: #3a3a3a; color: #fff; }
        .ctx-item .shortcut { color: #666; font-size: 10px; margin-left: 16px; }
        .ctx-sep { height: 1px; background: #444; margin: 3px 8px; }
        .ctx-item.disabled { color: #555; pointer-events: none; }
        .ctx-has-sub {
            position: relative;
        }
        .ctx-has-sub > .ctx-item { cursor: default; }
        .ctx-arrow { margin-left: auto; padding-left: 12px; font-size: 10px; color: #666; }
        .ctx-submenu {
            position: absolute;
            left: 100%;
            top: -4px;
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 0;
            min-width: 170px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: none;
        }
        .ctx-has-sub:hover > .ctx-submenu { display: block; }
    `;
    document.head.appendChild(style);

    // ---- CHANNEL BRIDGE ----
    const bridge = new ChannelBridge("control");
    let displayWindow: Window | null = null;

    // ---- STATE ----
    let managedLayers: Types.ManagedLayer[] = [];
    const MANAGED_LAYERS_KEY = "mlmap.managedLayers";
    const RES_KEY = "mlmap:outputResolution";
    let outputResolution: { width: number; height: number } | null = null;
    let autoDisplaySize: { width: number; height: number } | null = null;
    // ---- CLIP MASK RENDERER ----
    const clipMaskRenderer = new ClipMaskRenderer(() => getClipGroups());

    function getClipGroups(): ClipGroup[] {
        const groups: ClipGroup[] = [];
        const allLayers = baseMLMap.getLayers();
        const grouped = new Map<string, { video: HTMLVideoElement; baseTargetPoints: number[][]; masks: Array<{ targetPoints: number[][] }> }>();

        for (const ml of managedLayers) {
            if (!ml.clipTo) continue;
            const baseMl = managedLayers.find(b => b.id === ml.clipTo);
            if (!baseMl) continue;

            const baseInternalLayer = allLayers.find(l => l.element.id === baseMl.id);
            const maskInternalLayer = allLayers.find(l => l.element.id === ml.id);
            if (!baseInternalLayer || !maskInternalLayer) continue;

            const baseEl = document.getElementById(baseMl.id);
            if (!baseEl) continue;
            const video = baseEl.querySelector("video");
            if (!video) continue;

            if (!grouped.has(baseMl.id)) {
                grouped.set(baseMl.id, {
                    video,
                    baseTargetPoints: baseInternalLayer.targetPoints.map(p => [p[0], p[1]]),
                    masks: []
                });
            }
            grouped.get(baseMl.id)!.masks.push({
                targetPoints: maskInternalLayer.targetPoints.map(p => [p[0], p[1]])
            });
        }

        for (const g of grouped.values()) groups.push(g);
        return groups;
    }

    function hasAnyClipMasks(): boolean {
        return managedLayers.some(ml => !!ml.clipTo);
    }

    function updateClipMaskRendererState(): void {
        if (hasAnyClipMasks()) clipMaskRenderer.start();
        else clipMaskRenderer.stop();
    }

    // ---- WORKSPACE CONTAINER (holds all layer elements, supports zoom) ----
    const workspace = document.createElement("div");
    workspace.id = "mlmap-workspace";
    workspace.style.cssText = "position:fixed;inset:0;transform-origin:center center;";
    document.body.appendChild(workspace);

    // ---- CREATE APP LAYOUT ----
    const app = document.createElement("div");
    app.id = "mlmap-app";
    app.innerHTML = `
        <div id="mlmap-toolbar">
            <div class="toolbar-group">
                <span class="app-title">MLMap</span>
                <span style="font-size:10px;color:#666;">v${VERSION}</span>
                <button id="tb-toggleLeft" class="mlmap-btn" title="Toggle layers panel" style="font-size:10px;padding:4px 5px;">&laquo;</button>
            </div>
            <div class="toolbar-group">
                <span style="font-size:10px;color:#666;">Zoom</span>
                <input id="tb-zoom" type="range" min="25" max="100" value="100" class="mlmap-range" style="width:80px;" title="Workspace zoom">
                <span id="tb-zoomLabel" style="font-size:10px;color:#888;min-width:30px;">100%</span>
            </div>
            <div class="toolbar-group">
                <span style="font-size:10px;color:#666;">Output</span>
                <select id="tb-resolution" class="mlmap-select" title="Output resolution" style="max-width:130px;">
                    <option value="auto">Auto</option>
                    <option value="1920x1080">1920x1080</option>
                    <option value="1280x720">1280x720</option>
                    <option value="3840x2160">3840x2160</option>
                    <option value="1024x768">1024x768</option>
                    <option value="custom">Custom...</option>
                </select>
                <input id="tb-resW" class="mlmap-input" type="number" style="width:50px;display:none;" placeholder="W">
                <input id="tb-resH" class="mlmap-input" type="number" style="width:50px;display:none;" placeholder="H">
            </div>
            <div class="toolbar-group">
                <select id="tb-monitor" class="mlmap-select" title="Select output monitor" style="max-width:140px;">
                    <option value="">Monitor...</option>
                </select>
                <button id="tb-launch" class="mlmap-btn mlmap-btn-primary">Launch Output</button>
                <button id="tb-exportTpl" class="mlmap-btn" title="Export layout template as image">TPL</button>
                <button id="tb-fullscreen" class="mlmap-btn" title="Fullscreen output">FS</button>
                <span class="status-dot disconnected" id="tb-status" title="Display disconnected"></span>
                <button id="tb-toggleRight" class="mlmap-btn" title="Toggle media panel" style="font-size:10px;padding:4px 5px;">&raquo;</button>
            </div>
        </div>
        <div id="mlmap-left"></div>
        <div id="mlmap-right"></div>
        <div id="mlmap-transport"></div>
    `;
    document.body.appendChild(app);
    // Prevent mouse events on UI from reaching MLMap's window-level handlers
    app.addEventListener("mousedown", (e) => e.stopPropagation());

    // ---- CONTEXT MENU ----
    const ctxMenu = document.createElement("div");
    ctxMenu.id = "mlmap-context-menu";
    document.body.appendChild(ctxMenu);
    ctxMenu.addEventListener("mousedown", (e) => e.stopPropagation());

    const leftPanel = document.getElementById("mlmap-left")!;
    const rightPanel = document.getElementById("mlmap-right")!;
    const transportBar = document.getElementById("mlmap-transport")!;

    // ---- LEFT PANEL ----
    leftPanel.innerHTML = `
        <div class="mlmap-section">
            <div class="mlmap-section-title">Layers</div>
            <div id="lp-layerList"></div>
            <div class="mlmap-section-title" style="margin-top:8px;">Add Layer</div>
            <div class="add-layer-grid">
                <button id="lp-addSquare" class="mlmap-btn">&#9633; Square</button>
                <button id="lp-addCircle" class="mlmap-btn">&#9675; Circle</button>
                <button id="lp-addTriangle" class="mlmap-btn">&#9651; Triangle</button>
                <button id="lp-addIframe" class="mlmap-btn">&#8865; iframe</button>
            </div>
            <div class="mlmap-section-title" style="margin-top:8px;">Options</div>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
                <input type="checkbox" id="lp-snap" checked> Snap to edges (G)
            </label>
        </div>
        <div class="mlmap-section">
            <div class="mlmap-section-title">Workspaces</div>
            <select id="lp-wsSelect" class="mlmap-select" style="width:100%;"></select>
            <div class="ws-grid">
                <button id="lp-wsAdd" class="mlmap-btn" title="New">+</button>
                <button id="lp-wsDup" class="mlmap-btn" title="Duplicate">&#128203;</button>
                <button id="lp-wsRen" class="mlmap-btn" title="Rename">&#9998;</button>
                <button id="lp-wsReset" class="mlmap-btn" title="Reset">&#8634;</button>
                <button id="lp-wsDel" class="mlmap-btn" title="Delete">&#128465;</button>
            </div>
            <div class="mlmap-section-title" style="margin-top:8px;">Import / Export</div>
            <div style="display:flex;flex-direction:column;gap:3px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
                    <button id="lp-wfExport" class="mlmap-btn" title="Export workflow to .mlmap file">Export File</button>
                    <button id="lp-wfImport" class="mlmap-btn" title="Import workflow from .mlmap file">Import File</button>
                </div>
                <button id="lp-wfShare" class="mlmap-btn mlmap-btn-primary" title="Copy share URL to clipboard" style="width:100%;">Copy Share URL</button>
            </div>
        </div>
        <div class="mlmap-section" style="border-bottom:none;">
            <div class="mlmap-section-title">Shortcuts</div>
            <pre style="font-size:10px;color:#666;margin:0;white-space:pre-wrap;line-height:1.5;">SHIFT+Space: Toggle edit mode
Space: Play/Pause video
Drag: Move | SHIFT+Drag: Precise
ALT+Drag: Rotate/Scale
Ctrl+Click: Multi-select layers
Drag empty: Rubber band select
Arrows: Move | S: Solo | C: Cross
R: Rotate | H/V: Flip | B: Bounds
DEL: Delete | Ctrl+Z/Y: Undo/Redo
G: Toggle snap | Right-click: Menu</pre>
        </div>
    `;

    // ---- INITIALIZE VIDEO UI ----
    const videoCtrl = initVideoUI(rightPanel, transportBar, bridge, onAddVideoLayer);

    // ---- VIDEO DATA TRANSFER ----
    // Blob URLs (local files) can't be loaded cross-window when origin is null (file:// protocol).
    // We fetch the blob, send the ArrayBuffer via BroadcastChannel, and the display creates its own blob URL.
    function sendVideoDataToDisplay(layerId: string, url: string): void {
        if (!url || !url.startsWith("blob:")) return;
        fetch(url)
            .then(r => r.arrayBuffer())
            .then(buf => {
                bridge.send("SEND_VIDEO_DATA", { layerId, data: buf, mimeType: "video/mp4" });
            })
            .catch(() => {});
    }

    // ---- LAYOUT REMAPPING (editor coords → display coords) ----
    function getDisplayLayout(): any[] {
        const layout = baseMLMap.getLayout();
        const frame = baseMLMap.outputFrame;
        if (!frame || frame.w <= 0 || frame.h <= 0) return layout;
        // Remap targetPoints from editor frame space to output resolution space
        const sx = frame.resW / frame.w;
        const sy = frame.resH / frame.h;
        return layout.map((item: any) => ({
            ...item,
            targetPoints: item.targetPoints.map((p: number[]) => [
                (p[0] - frame.x) * sx,
                (p[1] - frame.y) * sy,
            ]),
        }));
    }

    function sendLayoutToDisplay(): void {
        bridge.send("UPDATE_LAYOUT", { layout: getDisplayLayout() });
    }

    // ---- LAYER MANAGEMENT ----
    function getVideoLayerSize(): { w: number; h: number } {
        // Use output resolution for native-quality rendering; fallback to 1920x1080
        const res = outputResolution || autoDisplaySize;
        return res ? { w: res.width, h: res.height } : { w: 1920, h: 1080 };
    }

    function onAddVideoLayer(url: string, name: string, stream?: MediaStream): void {
        const id = `vlayer_${Date.now()}`;
        const vSize = getVideoLayerSize();
        const div = document.createElement("div");
        div.id = id;
        div.style.position = "fixed";
        div.style.top = "0px";
        div.style.left = "0px";
        div.style.width = vSize.w + "px";
        div.style.height = vSize.h + "px";
        div.style.overflow = "hidden";
        div.style.background = "#000";

        const video = document.createElement("video");
        if (stream) {
            video.srcObject = stream;
            video.autoplay = true;
        } else {
            video.src = url;
            video.preload = "metadata";
        }
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "contain";
        video.muted = true;
        video.playsInline = true;
        div.appendChild(video);

        // When capture stream ends, show placeholder
        if (stream) {
            stream.getTracks().forEach(track => {
                track.addEventListener("ended", () => {
                    if (stream.getTracks().every(t => t.readyState === "ended")) {
                        video.srcObject = null;
                        div.innerHTML = "";
                        const ph = document.createElement("div");
                        ph.className = "mlmap-video-placeholder";
                        ph.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;";
                        ph.innerHTML = `<span style="font-size:18px;color:#555;">&#9632;</span><span style="font-size:10px;color:#555;margin-top:2px;">${name}</span><span style="font-size:9px;color:#444;margin-top:2px;">Capture ended</span>`;
                        div.appendChild(ph);
                        renderLayerList();
                    }
                });
            });
        }

        workspace.appendChild(div);

        // Center on screen - show at a reasonable visual size (400x300 on screen)
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        baseMLMap.addLayer(div, [[cx - 200, cy - 150], [cx + 200, cy - 150], [cx + 200, cy + 150], [cx - 200, cy + 150]]);

        // Register with transport for local playback control
        videoCtrl.registerVideoElement(video);

        const layerInfo: Types.ManagedLayer = { id, name, type: "video", videoUrl: stream ? undefined : url, width: vSize.w, height: vSize.h };
        managedLayers.push(layerInfo);
        saveManagedLayers();
        renderLayerList();

        bridge.send("ADD_LAYER", layerInfo);
        if (!stream && url) sendVideoDataToDisplay(id, url);
        setTimeout(() => sendLayoutToDisplay(), 100);
    }

    function createShape(type: "square" | "circle" | "triangle"): void {
        const id = `shape_${Date.now()}`;
        const div = document.createElement("div");
        div.id = id;

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        div.style.position = "fixed";
        div.style.top = "0px";
        div.style.left = "0px";
        div.style.width = "100px";
        div.style.height = "100px";
        div.style.background = type === "triangle" ? "transparent" : "white";
        div.style.border = type === "triangle" ? "2px solid white" : "none";

        if (type === "circle") div.style.borderRadius = "50%";
        if (type === "triangle") {
            div.style.width = "0";
            div.style.height = "0";
            div.style.borderLeft = "50px solid transparent";
            div.style.borderRight = "50px solid transparent";
            div.style.borderBottom = "100px solid white";
        }

        workspace.appendChild(div);

        // Center on screen
        const hw = type === "triangle" ? 50 : 50;
        const hh = 50;
        const centerPts: number[][] = type === "triangle"
            ? [[cx, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh], [cx, cy + hh]]
            : [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]];
        baseMLMap.addLayer(div, centerPts);

        const layerInfo: Types.ManagedLayer = { id, name: `${type}`, type: "shape", shapeType: type, width: 100, height: 100 };
        managedLayers.push(layerInfo);
        saveManagedLayers();
        renderLayerList();

        bridge.send("ADD_LAYER", layerInfo);
        setTimeout(() => sendLayoutToDisplay(), 100);
    }

    function createIframeLayer(url: string): void {
        const id = `iframe_${Date.now()}`;
        const div = document.createElement("div");
        div.id = id;
        div.style.position = "fixed";
        div.style.top = "0px";
        div.style.left = "0px";
        div.style.width = "400px";
        div.style.height = "300px";
        div.style.overflow = "hidden";
        div.style.background = "#000";

        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.pointerEvents = "none";
        iframe.setAttribute("allow", "autoplay; encrypted-media");
        div.appendChild(iframe);

        workspace.appendChild(div);

        // Center on screen
        const icx = window.innerWidth / 2, icy = window.innerHeight / 2;
        baseMLMap.addLayer(div, [[icx - 200, icy - 150], [icx + 200, icy - 150], [icx + 200, icy + 150], [icx - 200, icy + 150]]);

        const name = url.replace(/^https?:\/\//, "").split("/")[0] || "iframe";
        const layerInfo: Types.ManagedLayer = { id, name, type: "iframe", iframeUrl: url, width: 400, height: 300 };
        managedLayers.push(layerInfo);
        saveManagedLayers();
        renderLayerList();

        bridge.send("ADD_LAYER", layerInfo);
        setTimeout(() => sendLayoutToDisplay(), 100);
    }

    function deleteLayer(id: string): void {
        // Release any clip masks pointing to this layer
        managedLayers.forEach(ml => { if (ml.clipTo === id) releaseClipMask(ml.id); });
        // Also release this layer's own clip mask
        const ml = managedLayers.find(l => l.id === id);
        if (ml?.clipTo) releaseClipMask(id);
        const el = document.getElementById(id);
        if (el) el.remove();
        managedLayers = managedLayers.filter(l => l.id !== id);
        saveManagedLayers();
        renderLayerList();
        bridge.send("REMOVE_LAYER", { id });
        updateClipMaskRendererState();
    }

    function createClipMask(maskId: string): void {
        const maskMl = managedLayers.find(l => l.id === maskId);
        if (!maskMl || maskMl.type !== "shape") return;

        // Find nearest video layer: search below first, then above
        const idx = managedLayers.indexOf(maskMl);
        let baseId: string | null = null;
        for (let i = idx - 1; i >= 0; i--) {
            if (managedLayers[i].type === "video") { baseId = managedLayers[i].id; break; }
        }
        if (!baseId) {
            for (let i = idx + 1; i < managedLayers.length; i++) {
                if (managedLayers[i].type === "video") { baseId = managedLayers[i].id; break; }
            }
        }
        if (!baseId) return;

        maskMl.clipTo = baseId;

        // Hide the base layer element (video plays hidden, rendered via canvas)
        // Use opacity instead of visibility — draw() forces visibility:"visible"
        // on every frame, but never touches opacity.
        const baseEl = document.getElementById(baseId);
        if (baseEl) baseEl.style.opacity = "0";

        // Hide the mask shape element (ClipMaskRenderer canvas handles rendering)
        const maskEl = document.getElementById(maskId);
        if (maskEl) maskEl.style.opacity = "0";

        // Auto-play the base video so the ClipMaskRenderer can draw frames
        // Also switch the transport to control this video so audio matches visuals
        if (baseEl) {
            const video = baseEl.querySelector("video") as HTMLVideoElement | null;
            if (video) {
                if (video.paused) video.play().catch(() => {});
                videoCtrl.setActiveVideo(video);
            }
        }

        saveManagedLayers();
        renderLayerList();
        updateClipMaskRendererState();
        // Sync clip state to display
        bridge.send("ADD_LAYER", maskMl);
    }

    function releaseClipMask(maskId: string): void {
        const maskMl = managedLayers.find(l => l.id === maskId);
        if (!maskMl || !maskMl.clipTo) return;

        const baseId = maskMl.clipTo;
        maskMl.clipTo = undefined;

        // Restore mask shape visibility and appearance
        const maskEl = document.getElementById(maskId);
        if (maskEl) {
            maskEl.style.opacity = "1";
            if (maskMl.shapeType === "triangle") {
                maskEl.style.borderBottomColor = "white";
            } else if (maskMl.shapeType === "circle") {
                maskEl.style.background = "white";
            } else {
                maskEl.style.background = "white";
            }
        }

        // If no other masks point to this base, show it again
        const stillMasked = managedLayers.some(l => l.clipTo === baseId);
        if (!stillMasked) {
            const baseEl = document.getElementById(baseId);
            if (baseEl) baseEl.style.opacity = "1";
        }

        saveManagedLayers();
        renderLayerList();
        updateClipMaskRendererState();
        // Sync clip state to display
        bridge.send("ADD_LAYER", maskMl);
    }

    function syncManagedLayerOrder(): void {
        const allLayers = baseMLMap.getLayers();
        const idOrder = allLayers.map(l => l.element.id);
        managedLayers.sort((a, b) => {
            const ia = idOrder.indexOf(a.id);
            const ib = idOrder.indexOf(b.id);
            return ia - ib;
        });
        saveManagedLayers();
        renderLayerList();
    }

    function renderLayerList(): void {
        const list = document.getElementById("lp-layerList")!;
        list.innerHTML = "";
        if (managedLayers.length === 0) {
            list.innerHTML = '<div style="color:#555;font-size:11px;padding:4px;">No layers</div>';
            return;
        }
        managedLayers.forEach(layer => {
            const row = document.createElement("div");
            row.className = "mlmap-layer-item";
            if (layer.clipTo) row.style.paddingLeft = "18px";

            const icon = document.createElement("span");
            icon.className = "icon";
            if (layer.type === "video") icon.textContent = "\u25B6";
            else if (layer.type === "iframe") icon.textContent = "\u29C9";

            else if (layer.shapeType === "circle") icon.textContent = "\u25CF";
            else if (layer.shapeType === "triangle") icon.textContent = "\u25B2";
            else icon.textContent = "\u25A0";

            const isPlaceholderVideo = layer.type === "video" && !document.getElementById(layer.id)?.querySelector("video");

            const name = document.createElement("span");
            name.className = "name";
            if (layer.clipTo) name.textContent = `${layer.name} (clip)`;
            else if (isPlaceholderVideo) { name.textContent = `${layer.name}`; name.style.color = "#f80"; }
            else name.textContent = layer.name;

            const del = document.createElement("button");
            del.className = "del-btn";
            del.textContent = "\u2715";
            del.addEventListener("click", () => deleteLayer(layer.id));

            row.appendChild(icon);
            row.appendChild(name);
            row.appendChild(del);
            list.appendChild(row);
        });
    }

    function saveManagedLayers(): void {
        // Persist all layers. Video layers save without blob URL (won't be valid after reload).
        const persistable = managedLayers.map(l => {
            if (l.type === "video") return { ...l, videoUrl: undefined };
            return l;
        });
        localStorage.setItem(MANAGED_LAYERS_KEY, JSON.stringify(persistable));
    }

    function loadManagedLayers(): void {
        try {
            const stored = localStorage.getItem(MANAGED_LAYERS_KEY);
            if (stored) {
                const items: Types.ManagedLayer[] = JSON.parse(stored);
                items.forEach(s => restoreLayer(s));
            }
            const legacy = localStorage.getItem("mlmap.dynamicShapes");
            if (legacy && !stored) {
                const oldShapes: Types.Shape[] = JSON.parse(legacy);
                oldShapes.forEach(s => {
                    const info: Types.ManagedLayer = { id: s.id, name: s.type, type: "shape", shapeType: s.type, width: 100, height: 100 };
                    restoreLayer(info);
                });
            }
        } catch { /* ignore */ }
        renderLayerList();
    }

    function restoreLayer(info: Types.ManagedLayer): void {
        const div = document.createElement("div");
        div.id = info.id;
        div.style.position = "fixed";
        div.style.top = "0px";
        div.style.left = "0px";
        div.style.width = info.width + "px";
        div.style.height = info.height + "px";

        if (info.type === "video") {
            // Restore as placeholder — blob URL won't survive reload
            div.style.overflow = "hidden";
            div.style.background = "#111";
            const ph = document.createElement("div");
            ph.className = "mlmap-video-placeholder";
            ph.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;";
            ph.innerHTML = `<span style="font-size:18px;color:#555;">\u25B6</span><span style="font-size:10px;color:#555;margin-top:2px;">${info.name}</span><span style="font-size:9px;color:#444;margin-top:2px;">Re-import video</span>`;
            div.appendChild(ph);
        } else if (info.type === "iframe" && info.iframeUrl) {
            div.style.overflow = "hidden";
            div.style.background = "#000";
            const iframe = document.createElement("iframe");
            iframe.src = info.iframeUrl;
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "none";
            iframe.style.pointerEvents = "none";
            iframe.setAttribute("allow", "autoplay; encrypted-media");
            div.appendChild(iframe);
        } else if (info.shapeType === "circle") {
            div.style.background = "white";
            div.style.borderRadius = "50%";
        } else if (info.shapeType === "triangle") {
            div.style.width = "0";
            div.style.height = "0";
            div.style.borderLeft = "50px solid transparent";
            div.style.borderRight = "50px solid transparent";
            div.style.borderBottom = "100px solid white";
            div.style.background = "transparent";
        } else {
            div.style.background = "white";
        }

        workspace.appendChild(div);
        baseMLMap.addLayer(div);
        managedLayers.push(info);
    }

    function assignVideoToLayer(layerId: string, url: string, name: string): void {
        const ml = managedLayers.find(l => l.id === layerId);
        if (!ml || ml.type !== "video") return;

        const div = document.getElementById(layerId);
        if (!div) return;

        // Upgrade to high-res native size
        const vSize = getVideoLayerSize();
        div.style.width = vSize.w + "px";
        div.style.height = vSize.h + "px";
        ml.width = vSize.w;
        ml.height = vSize.h;

        // Clear placeholder
        div.innerHTML = "";
        div.style.background = "#000";

        // Create video element
        const video = document.createElement("video");
        video.src = url;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "contain";
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        div.appendChild(video);

        // Register with transport
        videoCtrl.registerVideoElement(video);

        // Update managed layer info
        ml.name = name;
        ml.videoUrl = url;
        saveManagedLayers();
        renderLayerList();

        // If this video has clip masks, auto-play so the renderer works
        if (managedLayers.some(l => l.clipTo === layerId)) {
            video.play().catch(() => {});
            updateClipMaskRendererState();
        }

        bridge.send("ADD_LAYER", ml);
        sendVideoDataToDisplay(layerId, url);
        setTimeout(() => sendLayoutToDisplay(), 100);
    }

    function assignCaptureToLayer(layerId: string, stream: MediaStream, name: string): void {
        const ml = managedLayers.find(l => l.id === layerId);
        if (!ml || ml.type !== "video") return;

        const div = document.getElementById(layerId);
        if (!div) return;

        // Upgrade to high-res native size
        const vSize = getVideoLayerSize();
        div.style.width = vSize.w + "px";
        div.style.height = vSize.h + "px";
        ml.width = vSize.w;
        ml.height = vSize.h;

        div.innerHTML = "";
        div.style.background = "#000";

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "contain";
        video.muted = true;
        video.playsInline = true;
        div.appendChild(video);

        // When capture ends, show placeholder
        stream.getTracks().forEach(track => {
            track.addEventListener("ended", () => {
                if (stream.getTracks().every(t => t.readyState === "ended")) {
                    video.srcObject = null;
                    div.innerHTML = "";
                    const ph = document.createElement("div");
                    ph.className = "mlmap-video-placeholder";
                    ph.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;";
                    ph.innerHTML = `<span style="font-size:18px;color:#555;">&#9632;</span><span style="font-size:10px;color:#555;margin-top:2px;">${name}</span><span style="font-size:9px;color:#444;margin-top:2px;">Capture ended</span>`;
                    div.appendChild(ph);
                    renderLayerList();
                }
            });
        });

        videoCtrl.registerVideoElement(video);

        ml.name = name;
        ml.videoUrl = undefined; // Captures don't have persistent URLs
        saveManagedLayers();
        renderLayerList();

        if (managedLayers.some(l => l.clipTo === layerId)) {
            updateClipMaskRendererState();
        }

        bridge.send("ADD_LAYER", ml);
        setTimeout(() => sendLayoutToDisplay(), 100);
    }

    // ---- SHAPE BUTTONS ----
    document.getElementById("lp-addSquare")!.addEventListener("click", () => createShape("square"));
    document.getElementById("lp-addCircle")!.addEventListener("click", () => createShape("circle"));
    document.getElementById("lp-addTriangle")!.addEventListener("click", () => createShape("triangle"));

    // ---- IFRAME BUTTON ----
    document.getElementById("lp-addIframe")!.addEventListener("click", () => {
        const url = prompt("Enter URL for iframe:", "https://");
        if (url && url !== "https://") createIframeLayer(url);
    });

    // ---- SNAP TOGGLE ----
    const snapCheckbox = document.getElementById("lp-snap") as HTMLInputElement;
    snapCheckbox.checked = baseMLMap.snapEnabled;
    snapCheckbox.addEventListener("change", () => { baseMLMap.snapEnabled = snapCheckbox.checked; });
    baseMLMap.onSnapChanged = (enabled: boolean) => { snapCheckbox.checked = enabled; };

    // ---- CONTEXT MENU ----
    function showContextMenu(x: number, y: number, layer: Types.Layer): void {
        baseMLMap.selectLayer(layer);
        const layerId = layer.element.id;
        const ml = managedLayers.find(l => l.id === layerId);
        const isShape = ml?.type === "shape";
        const isVideo = ml?.type === "video";
        const isClipped = !!ml?.clipTo;
        // Clip mask label (only show if there's a video layer to clip to)
        let clipLabel = "";
        const hasVideoLayer = managedLayers.some(l => l.type === "video");
        if (isShape && !isClipped && hasVideoLayer) clipLabel = "Create Clip Mask";
        else if (isClipped) clipLabel = "Release Clip Mask";

        ctxMenu.innerHTML = `
            <div class="ctx-item" data-action="center">Center on screen</div>
            <div class="ctx-sep"></div>
            ${isVideo ? `
            <div class="ctx-has-sub">
                <div class="ctx-item" style="color:#5af;">Assign Video<span class="ctx-arrow">\u25B6</span></div>
                <div class="ctx-submenu">
                    <div class="ctx-item" data-action="assignFile">Browse file...</div>
                    <div class="ctx-item" data-action="assignUrl">Enter URL...</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="assignCapture">Screen capture...</div>
                    <div class="ctx-item" data-action="assignWebcam">Webcam...</div>
                </div>
            </div>
            <div class="ctx-sep"></div>` : ""}
            <div class="ctx-has-sub">
                <div class="ctx-item">Layer Order<span class="ctx-arrow">\u25B6</span></div>
                <div class="ctx-submenu">
                    <div class="ctx-item" data-action="moveUp">Move Up</div>
                    <div class="ctx-item" data-action="moveDown">Move Down</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="sendToTop">Send to Top</div>
                    <div class="ctx-item" data-action="sendToBottom">Send to Bottom</div>
                </div>
            </div>
            <div class="ctx-has-sub">
                <div class="ctx-item">Transform<span class="ctx-arrow">\u25B6</span></div>
                <div class="ctx-submenu">
                    <div class="ctx-item" data-action="rotate90">Rotate 90\u00B0</div>
                    <div class="ctx-item" data-action="rotate180">Rotate 180\u00B0</div>
                    <div class="ctx-item" data-action="rotate270">Rotate 270\u00B0</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="flipH">Flip Horizontal</div>
                    <div class="ctx-item" data-action="flipV">Flip Vertical</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="scaleUp">Scale +10%</div>
                    <div class="ctx-item" data-action="scaleDown">Scale -10%</div>
                    <div class="ctx-sep"></div>
                    <div class="ctx-item" data-action="resetTransform">Reset Transform</div>
                </div>
            </div>
            <div class="ctx-has-sub">
                <div class="ctx-item">Fit to Output<span class="ctx-arrow">\u25B6</span></div>
                <div class="ctx-submenu">
                    <div class="ctx-item" data-action="fitOutput">Fit to Output</div>
                    <div class="ctx-item" data-action="stretchOutput">Stretch to Output</div>
                </div>
            </div>
            <div class="ctx-sep"></div>
            ${clipLabel ? `<div class="ctx-item" data-action="toggleClip">${clipLabel}</div><div class="ctx-sep"></div>` : ""}
            <div class="ctx-item" data-action="solo">Solo / Unsolo<span class="shortcut">S</span></div>
            <div class="ctx-item" data-action="delete" style="color:#f55;">Delete layer<span class="shortcut">DEL</span></div>
        `;

        // Position: keep menu within viewport
        const menuW = 200, menuH = 300;
        const posX = x + menuW > window.innerWidth ? x - menuW : x;
        const posY = y + menuH > window.innerHeight ? y - menuH : y;
        ctxMenu.style.left = Math.max(0, posX) + "px";
        ctxMenu.style.top = Math.max(0, posY) + "px";
        ctxMenu.style.display = "block";

        // Handle clicks only on items with data-action
        ctxMenu.querySelectorAll(".ctx-item[data-action]").forEach(item => {
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const action = (item as HTMLElement).dataset.action;
                switch (action) {
                    case "center": baseMLMap.centerLayer(layer); break;
                    case "moveUp":
                        baseMLMap.moveLayerUp(layer);
                        syncManagedLayerOrder();
                        break;
                    case "moveDown":
                        baseMLMap.moveLayerDown(layer);
                        syncManagedLayerOrder();
                        break;
                    case "sendToTop":
                        baseMLMap.moveLayerToTop(layer);
                        syncManagedLayerOrder();
                        break;
                    case "sendToBottom":
                        baseMLMap.moveLayerToBottom(layer);
                        syncManagedLayerOrder();
                        break;
                    case "rotate90": baseMLMap.rotateLayerPublic(layer, 90); break;
                    case "rotate180": baseMLMap.rotateLayerPublic(layer, 180); break;
                    case "rotate270": baseMLMap.rotateLayerPublic(layer, 270); break;
                    case "flipH": baseMLMap.flipLayerH(layer); break;
                    case "flipV": baseMLMap.flipLayerV(layer); break;
                    case "scaleUp": baseMLMap.scaleLayerPublic(layer, 1.1); break;
                    case "scaleDown": baseMLMap.scaleLayerPublic(layer, 0.9); break;
                    case "resetTransform": baseMLMap.resetLayerTransform(layer); break;
                    case "fitOutput": {
                        const frame = baseMLMap.outputFrame || { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
                        baseMLMap.fitToFrame(layer, frame);
                        break;
                    }
                    case "stretchOutput": {
                        const frame = baseMLMap.outputFrame || { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
                        baseMLMap.stretchToFrame(layer, frame);
                        break;
                    }
                    case "toggleClip":
                        if (isClipped) releaseClipMask(layerId);
                        else createClipMask(layerId);
                        break;
                    case "assignFile": {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "video/*";
                        input.onchange = () => {
                            const file = input.files?.[0];
                            if (file) {
                                const url = URL.createObjectURL(file);
                                assignVideoToLayer(layerId, url, file.name);
                            }
                        };
                        input.click();
                        break;
                    }
                    case "assignUrl": {
                        const url = prompt("Enter video URL:", "https://");
                        if (url && url !== "https://") {
                            const urlName = url.split("/").pop() || "Video URL";
                            assignVideoToLayer(layerId, url, urlName);
                        }
                        break;
                    }
                    case "assignCapture": {
                        (async () => {
                            try {
                                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                                const track = stream.getVideoTracks()[0];
                                const capName = track?.label || "Screen Capture";
                                assignCaptureToLayer(layerId, stream, capName);
                            } catch { /* user cancelled */ }
                        })();
                        break;
                    }
                    case "assignWebcam": {
                        (async () => {
                            try {
                                const devices = await navigator.mediaDevices.enumerateDevices();
                                const cameras = devices.filter(d => d.kind === "videoinput");
                                let constraints: MediaStreamConstraints = { video: true, audio: true };
                                if (cameras.length > 1) {
                                    const options = cameras.map((c, i) => `${i + 1}. ${c.label || `Camera ${i + 1}`}`).join("\n");
                                    const choice = prompt(`Select camera:\n${options}`, "1");
                                    if (!choice) return;
                                    const idx = parseInt(choice) - 1;
                                    if (idx >= 0 && idx < cameras.length) {
                                        constraints = { video: { deviceId: { exact: cameras[idx].deviceId } }, audio: true };
                                    }
                                }
                                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                                const track = stream.getVideoTracks()[0];
                                const camName = track?.label || "Webcam";
                                assignCaptureToLayer(layerId, stream, camName);
                            } catch { /* user denied or cancelled */ }
                        })();
                        break;
                    }
                    case "solo":
                        const allLayers = baseMLMap.getLayers();
                        const isSoloed = allLayers.some(l => !l.visible);
                        if (isSoloed) {
                            allLayers.forEach(l => l.visible = true);
                        } else {
                            allLayers.forEach(l => l.visible = false);
                            layer.visible = true;
                        }
                        break;
                    case "delete":
                        deleteLayer(layerId);
                        break;
                }
                hideContextMenu();
            });
        });
    }

    function hideContextMenu(): void {
        ctxMenu.style.display = "none";
    }

    // Right-click handler on the canvas area
    document.addEventListener("contextmenu", (e: MouseEvent) => {
        // Only intercept on the MLMap canvas area (not on UI panels)
        const target = e.target as HTMLElement;
        if (target.closest("#mlmap-app") || target.closest("#mlmap-context-menu")) return;

        const layer = baseMLMap.getLayerAtPoint(e.clientX, e.clientY);
        if (layer) {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, layer);
        }
    });

    // Hide context menu on click elsewhere or Escape
    document.addEventListener("mousedown", (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest("#mlmap-context-menu")) {
            hideContextMenu();
        }
    });
    document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Escape") hideContextMenu();
    });

    // ---- WORKSPACE MANAGEMENT ----
    let workspaces = storage.loadAllWorkspaces();
    let activeWorkspace: Types.Workspace | null = workspaces.find(
        ws => ws.id === localStorage.getItem("mlmap:currentWorkspaceId")
    ) || null;

    if (!activeWorkspace && workspaces.length) {
        activeWorkspace = workspaces[0];
        localStorage.setItem("mlmap:currentWorkspaceId", activeWorkspace.id);
    }

    // Layout is applied after loadManagedLayers() in the INIT section

    function updateWorkspaceSelector(): void {
        const sel = document.getElementById("lp-wsSelect") as HTMLSelectElement;
        sel.innerHTML = "";
        workspaces.forEach(ws => {
            const opt = document.createElement("option");
            opt.value = ws.id;
            opt.textContent = ws.name;
            if (activeWorkspace && activeWorkspace.id === ws.id) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    function switchWorkspace(ws: Types.Workspace): void {
        localStorage.setItem("mlmap:currentWorkspaceId", ws.id);
        window.location.reload();
    }

    document.getElementById("lp-wsAdd")!.addEventListener("click", () => {
        const name = prompt("Workspace name:", "New Workspace") || "New Workspace";
        const ws: Types.Workspace = { id: Date.now().toString(), name, version: "1.0", layout: {} };
        workspaces.push(ws);
        storage.saveWorkspace(ws);
        switchWorkspace(ws);
    });

    document.getElementById("lp-wsDup")!.addEventListener("click", () => {
        if (!activeWorkspace) return;
        const name = prompt("New name:", activeWorkspace.name + " (Copy)") || activeWorkspace.name + " (Copy)";
        const ws: Types.Workspace = { id: Date.now().toString(), name, version: "1.0", layout: activeWorkspace.layout };
        workspaces.push(ws);
        storage.saveWorkspace(ws);
        switchWorkspace(ws);
    });

    document.getElementById("lp-wsRen")!.addEventListener("click", () => {
        if (!activeWorkspace) return;
        const name = prompt("New name:", activeWorkspace.name);
        if (name) {
            activeWorkspace.name = name;
            storage.saveWorkspace(activeWorkspace);
            updateWorkspaceSelector();
        }
    });

    document.getElementById("lp-wsReset")!.addEventListener("click", () => {
        if (!activeWorkspace) return;
        if (confirm("Reset workspace? This will clear all layer positions.")) {
            storage.resetWorkspace(activeWorkspace.id);
            window.location.reload();
        }
    });

    document.getElementById("lp-wsDel")!.addEventListener("click", () => {
        if (!activeWorkspace || workspaces.length <= 1) return;
        if (confirm("Delete workspace '" + activeWorkspace.name + "'?")) {
            storage.deleteWorkspace(activeWorkspace.id);
            workspaces = workspaces.filter(ws => ws.id !== activeWorkspace?.id);
            if (workspaces.length) switchWorkspace(workspaces[0]);
        }
    });

    (document.getElementById("lp-wsSelect") as HTMLSelectElement).addEventListener("change", (e) => {
        const ws = workspaces.find(w => w.id === (e.target as HTMLSelectElement).value);
        if (ws) switchWorkspace(ws);
    });

    updateWorkspaceSelector();

    // ---- WORKFLOW EXPORT / IMPORT / SHARE ----
    document.getElementById("lp-wfExport")!.addEventListener("click", () => {
        const data = exportWorkflow(activeWorkspace?.name);
        downloadWorkflow(data);
    });

    document.getElementById("lp-wfImport")!.addEventListener("click", async () => {
        const data = await uploadWorkflow();
        if (data) {
            importWorkflow(data);
            window.location.reload();
        }
    });

    document.getElementById("lp-wfShare")!.addEventListener("click", () => {
        const data = exportWorkflow(activeWorkspace?.name);
        const url = generateShareUrl(data);
        navigator.clipboard.writeText(url).then(() => {
            const btn = document.getElementById("lp-wfShare")!;
            const orig = btn.textContent;
            btn.textContent = "Copied!";
            btn.style.background = "#4CAF50";
            setTimeout(() => {
                btn.textContent = orig;
                btn.style.background = "";
            }, 2000);
        }).catch(() => {
            // Fallback: show URL in prompt for manual copy
            prompt("Share URL (copy manually):", url);
        });
    });

    // ---- TOOLBAR ----
    const launchBtn = document.getElementById("tb-launch")!;

    function updateLaunchButton(): void {
        if (displayWindow && !displayWindow.closed) {
            launchBtn.textContent = "Stop Output";
            launchBtn.classList.remove("mlmap-btn-primary");
            launchBtn.style.background = "#a33";
        } else {
            launchBtn.textContent = "Launch Output";
            launchBtn.classList.add("mlmap-btn-primary");
            launchBtn.style.background = "";
            displayWindow = null;
        }
    }

    launchBtn.addEventListener("click", () => {
        if (displayWindow && !displayWindow.closed) {
            displayWindow.close();
            displayWindow = null;
            updateLaunchButton();
            return;
        }
        const monitorSel = document.getElementById("tb-monitor") as HTMLSelectElement;
        const screenIdx = parseInt(monitorSel.value);
        let features = "width=1280,height=720";

        if (!isNaN(screenIdx) && (window as any)._mlmapScreens && (window as any)._mlmapScreens[screenIdx]) {
            const s = (window as any)._mlmapScreens[screenIdx];
            features = `left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight}`;
        }

        displayWindow = window.open(DISPLAY_URL, "mlmap-display", features);
        updateLaunchButton();

        // Monitor if display window is closed externally
        const checkClosed = setInterval(() => {
            if (!displayWindow || displayWindow.closed) {
                clearInterval(checkClosed);
                displayWindow = null;
                updateLaunchButton();
            }
        }, 1000);
    });

    document.getElementById("tb-fullscreen")!.addEventListener("click", () => {
        bridge.send("FULLSCREEN_ENTER");
    });

    document.getElementById("tb-exportTpl")!.addEventListener("click", () => {
        const res = outputResolution || autoDisplaySize || { width: window.innerWidth, height: window.innerHeight };
        const canvas = baseMLMap.exportTemplate(res.width, res.height);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mlmap-template-${res.width}x${res.height}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, "image/png");
    });

    bridge.onConnectionChanged = (connected: boolean) => {
        const dot = document.getElementById("tb-status")!;
        dot.className = connected ? "status-dot connected" : "status-dot disconnected";
        dot.title = connected ? "Display connected" : "Display disconnected";
    };

    bridge.on("DISPLAY_READY", () => {
        managedLayers.forEach(layer => bridge.send("ADD_LAYER", layer));
        setTimeout(() => {
            sendLayoutToDisplay();
            videoCtrl.sendPlaylistToDisplay();
            // Send video data for layers with blob URLs (can't be loaded cross-window)
            managedLayers.forEach(layer => {
                if (layer.type === "video") {
                    const el = document.getElementById(layer.id);
                    const video = el?.querySelector("video") as HTMLVideoElement | null;
                    if (video && video.src && video.src.startsWith("blob:")) {
                        sendVideoDataToDisplay(layer.id, video.src);
                    }
                }
            });
            // Sync playback state (position, play/pause, volume, mute routing)
            setTimeout(() => videoCtrl.syncPlaybackToDisplay(), 500);
        }, 200);
    });

    async function detectMonitors(): Promise<void> {
        const sel = document.getElementById("tb-monitor") as HTMLSelectElement;
        try {
            if ("getScreenDetails" in window) {
                const screenDetails = await (window as any).getScreenDetails();
                (window as any)._mlmapScreens = screenDetails.screens;
                sel.innerHTML = '<option value="">Select monitor...</option>';
                screenDetails.screens.forEach((screen: any, i: number) => {
                    const opt = document.createElement("option");
                    opt.value = String(i);
                    const label = screen.label || `Monitor ${i + 1}`;
                    opt.textContent = `${label} (${screen.width}x${screen.height})`;
                    if (!screen.isPrimary) opt.textContent += " *";
                    sel.appendChild(opt);
                });
            } else {
                sel.innerHTML = `<option value="">Default (${screen.width}x${screen.height})</option>`;
            }
        } catch {
            sel.innerHTML = `<option value="">Default (${screen.width}x${screen.height})</option>`;
        }
    }
    detectMonitors();

    // ---- PANEL TOGGLES ----
    let leftVisible = true;
    let rightVisible = true;

    function updatePanelLayout(): void {
        const leftCol = leftVisible ? "210px" : "0px";
        const rightCol = rightVisible ? "270px" : "0px";
        app.style.gridTemplateColumns = `${leftCol} 1fr ${rightCol}`;
        leftPanel.style.display = leftVisible ? "flex" : "none";
        rightPanel.style.display = rightVisible ? "flex" : "none";
        document.getElementById("tb-toggleLeft")!.innerHTML = leftVisible ? "&laquo;" : "&raquo;";
        document.getElementById("tb-toggleRight")!.innerHTML = rightVisible ? "&raquo;" : "&laquo;";
    }

    document.getElementById("tb-toggleLeft")!.addEventListener("click", () => {
        leftVisible = !leftVisible;
        updatePanelLayout();
        calcOutputFrame();
    });

    document.getElementById("tb-toggleRight")!.addEventListener("click", () => {
        rightVisible = !rightVisible;
        updatePanelLayout();
        calcOutputFrame();
    });

    // ---- WORKSPACE ZOOM ----
    const zoomSlider = document.getElementById("tb-zoom") as HTMLInputElement;
    const zoomLabel = document.getElementById("tb-zoomLabel")!;

    zoomSlider.addEventListener("input", () => {
        const zoom = parseInt(zoomSlider.value) / 100;
        workspace.style.transform = zoom < 1 ? `scale(${zoom})` : "";
        zoomLabel.textContent = `${zoomSlider.value}%`;
        baseMLMap.setWorkspaceZoom(zoom);
        clipMaskRenderer.zoom = zoom;
    });

    // Clip mask canvas goes on body (z-index 999999, below MLMap canvas at 1000000)
    document.body.appendChild(clipMaskRenderer.canvasElement);

    // ---- KEYBOARD / EDIT MODE ----
    const originalSetConfigEnabled = baseMLMap.setConfigEnabled;
    baseMLMap.setConfigEnabled = function (enabled: boolean) {
        originalSetConfigEnabled.call(baseMLMap, enabled);
        app.style.display = enabled ? "grid" : "none";
        // When leaving edit mode, re-apply clip mask visibility since draw()
        // won't run (and thus onAfterDraw won't fire) in non-edit mode
        if (!enabled) reapplyClipMaskVisibility();
    };

    // ---- CLIP MASK VISIBILITY ----
    // draw() sets visibility="visible" for all visible layers, so we must
    // re-hide clip-masked elements after every draw call.
    // Both the base video AND the mask shapes must be hidden — the
    // ClipMaskRenderer canvas (z-index:2) handles all visual rendering.
    function reapplyClipMaskVisibility(): void {
        const hiddenBases = new Set<string>();
        for (const ml of managedLayers) {
            if (!ml.clipTo) continue;
            // Hide mask shape element via opacity (survives draw()'s visibility override)
            const maskEl = document.getElementById(ml.id);
            if (maskEl) maskEl.style.opacity = "0";
            hiddenBases.add(ml.clipTo);
        }
        for (const baseId of hiddenBases) {
            const baseEl = document.getElementById(baseId);
            if (baseEl) baseEl.style.opacity = "0";
        }
    }
    baseMLMap.onAfterDraw = reapplyClipMaskVisibility;
    baseMLMap.onSpaceBar = () => videoCtrl.togglePlayPause();

    // ---- LAYOUT CHANGE LISTENER ----
    baseMLMap.layoutChangeListener = () => {
        if (activeWorkspace) {
            activeWorkspace.layout = baseMLMap.getLayout();
            storage.saveWorkspace(activeWorkspace);
        }
        sendLayoutToDisplay();
    };

    // ---- VIDEO SYNC ----
    // Re-sync playback when returning to this tab (browser may have throttled timers)
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            videoCtrl.syncPlaybackToDisplay();
        }
    });

    // ---- MUTATION OBSERVER ----
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
                mutation.removedNodes.forEach(node => {
                    // Skip nodes that were just moved (appendChild re-appends)
                    if (node instanceof HTMLElement && !node.isConnected) {
                        const idx = managedLayers.findIndex(l => l.id === node.id);
                        if (idx !== -1) {
                            managedLayers.splice(idx, 1);
                            saveManagedLayers();
                            renderLayerList();
                            bridge.send("REMOVE_LAYER", { id: node.id });
                        }
                    }
                });
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // ---- INIT ----
    loadManagedLayers();

    // Re-apply workspace layout AFTER managed layers are created in the DOM
    if (activeWorkspace?.layout) {
        baseMLMap.setLayout(activeWorkspace.layout);
    }

    // Reset history so the initial state is the current layout (not an empty snapshot)
    baseMLMap.resetHistory();

    // Restore clip mask visual state after layers are loaded
    reapplyClipMaskVisibility();
    updateClipMaskRendererState();

    leftPanel.addEventListener("keydown", (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") e.stopPropagation();
    });

    // ---- OUTPUT RESOLUTION FRAME ----
    // Load saved resolution
    try {
        const saved = localStorage.getItem(RES_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.mode) {
                (document.getElementById("tb-resolution") as HTMLSelectElement).value = parsed.mode;
                if (parsed.mode === "custom" && parsed.width && parsed.height) {
                    outputResolution = { width: parsed.width, height: parsed.height };
                    const resW = document.getElementById("tb-resW") as HTMLInputElement;
                    const resH = document.getElementById("tb-resH") as HTMLInputElement;
                    resW.value = String(parsed.width);
                    resH.value = String(parsed.height);
                    resW.style.display = "";
                    resH.style.display = "";
                } else if (parsed.mode !== "auto" && parsed.mode !== "custom") {
                    const [w, h] = parsed.mode.split("x").map(Number);
                    if (w && h) outputResolution = { width: w, height: h };
                }
            }
        }
    } catch { /* ignore */ }

    function calcOutputFrame(): void {
        let res = outputResolution;
        if (!res && autoDisplaySize) res = autoDisplaySize;
        if (!res) {
            baseMLMap.outputFrame = null;
            return;
        }
        // Visible workspace area (subtract panels, toolbar 38px, transport 48px)
        const panelL = leftVisible ? 210 : 0;
        const panelR = rightVisible ? 270 : 0;
        const availW = window.innerWidth - panelL - panelR;
        const availH = window.innerHeight - 38 - 48;
        const oAspect = res.width / res.height;
        const eAspect = availW / availH;

        // Fit frame within 90% of available workspace
        let fw: number, fh: number;
        if (oAspect > eAspect) {
            fw = availW * 0.9;
            fh = fw / oAspect;
        } else {
            fh = availH * 0.9;
            fw = fh * oAspect;
        }

        // Center the frame in the visible workspace area (in full window coords)
        const fx = panelL + (availW - fw) / 2;
        const fy = 38 + (availH - fh) / 2;
        baseMLMap.outputFrame = { x: fx, y: fy, w: fw, h: fh, resW: res.width, resH: res.height };

        // Auto-zoom: if the frame at zoom=1 would overflow, reduce zoom to fit
        // The frame is already sized to fit at zoom=1, but the canvas draws with
        // zoom scaling centered on viewport center, so we need to ensure the frame
        // is fully visible after the zoom transform.
        // Compute the zoom needed for the output resolution to fit in the visible area.
        const needW = res.width;
        const needH = res.height;
        const zoomW = availW / needW;
        const zoomH = availH / needH;
        let autoZoom = Math.min(zoomW, zoomH) * 0.9; // 90% margin
        autoZoom = Math.max(0.1, Math.min(1, autoZoom)); // clamp to [0.1, 1]

        // Only reduce zoom, never increase above current if user zoomed out more
        const currentZoom = parseInt(zoomSlider.value) / 100;
        if (autoZoom < currentZoom) {
            const pct = Math.round(autoZoom * 100);
            zoomSlider.value = String(pct);
            zoomLabel.textContent = `${pct}%`;
            workspace.style.transform = autoZoom < 1 ? `scale(${autoZoom})` : "";
            baseMLMap.setWorkspaceZoom(autoZoom);
            clipMaskRenderer.zoom = autoZoom;
        }
    }

    function applyResolution(): void {
        const sel = (document.getElementById("tb-resolution") as HTMLSelectElement).value;
        const resW = document.getElementById("tb-resW") as HTMLInputElement;
        const resH = document.getElementById("tb-resH") as HTMLInputElement;

        if (sel === "auto") {
            outputResolution = null;
            resW.style.display = "none";
            resH.style.display = "none";
        } else if (sel === "custom") {
            resW.style.display = "";
            resH.style.display = "";
            const w = parseInt(resW.value) || 0;
            const h = parseInt(resH.value) || 0;
            outputResolution = (w > 0 && h > 0) ? { width: w, height: h } : null;
        } else {
            resW.style.display = "none";
            resH.style.display = "none";
            const [w, h] = sel.split("x").map(Number);
            outputResolution = (w && h) ? { width: w, height: h } : null;
        }

        localStorage.setItem(RES_KEY, JSON.stringify({
            mode: sel,
            width: outputResolution?.width,
            height: outputResolution?.height,
        }));
        calcOutputFrame();
    }

    (document.getElementById("tb-resolution") as HTMLSelectElement).addEventListener("change", applyResolution);
    (document.getElementById("tb-resW") as HTMLInputElement).addEventListener("input", applyResolution);
    (document.getElementById("tb-resH") as HTMLInputElement).addEventListener("input", applyResolution);
    // Stop key propagation from resolution inputs
    (document.getElementById("tb-resW") as HTMLInputElement).addEventListener("keydown", (e) => e.stopPropagation());
    (document.getElementById("tb-resH") as HTMLInputElement).addEventListener("keydown", (e) => e.stopPropagation());

    // Recalc frame on window resize
    window.addEventListener("resize", () => calcOutputFrame());

    // Handle DISPLAY_RESIZE from output window
    bridge.on("DISPLAY_RESIZE", (p: { width: number; height: number }) => {
        autoDisplaySize = { width: p.width, height: p.height };
        const sel = (document.getElementById("tb-resolution") as HTMLSelectElement).value;
        if (sel === "auto") calcOutputFrame();
    });

    // Initial frame calculation
    calcOutputFrame();

    checkLatestVersion().then(v => {
        if (v.latest !== VERSION) {
            const titleEl = app.querySelector(".app-title");
            if (titleEl) titleEl.setAttribute("title", `Update available: v${v.latest}`);
        }
    });
}
