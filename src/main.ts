import "./events";
import * as Types from "./types";
import * as utils from "./utils/basics";
import * as storage from "./utils/storage";
import { initUIControls } from "./uiControls";
import { historyStack, historyLimit, redoStack } from "./lib/data";
import { checkUrlForWorkflow } from "./utils/workflow";

export class MLMap {
    private showLayerNames: boolean;
    private showCrosshairs: boolean;
    private showScreenBounds: boolean;
    private autoSave: boolean;
    private autoLoad: boolean;
    private layerList: (HTMLElement | string)[];
    public layoutChangeListener: () => void;
    public onAfterDraw: (() => void) | null = null;

    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    private layers: Types.Layer[] = [];
    private configActive = false;

    private dragging = false;
    private dragOffset: [number, number] = [0, 0];

    private selectedLayer: Types.Layer | null = null;
    private selectedLayers: Types.Layer[] = [];
    private selectedPoint: number[] | null = null;
    private selectionRadius = 20;
    private hoveringPoint: number[] | null = null;
    private hoveringLayer: Types.Layer | null = null;
    private isLayerSoloed = false;
    public snapEnabled = true;
    public onSnapChanged: ((enabled: boolean) => void) | null = null;
    public outputFrame: { x: number; y: number; w: number; h: number; resW: number; resH: number } | null = null;
    public onSpaceBar: (() => void) | null = null;
    private readonly SNAP_THRESHOLD = 12;
    public workspaceZoom = 1;

    // Rubber band selection state
    private rubberBandActive = false;
    private rubberBandStart: [number, number] = [0, 0];
    private rubberBandEnd: [number, number] = [0, 0];
    private rubberBandBaseSelection: Types.Layer[] = [];

    private mousePosition: [number, number] = [0, 0];
    private mouseDelta: [number, number] = [0, 0];
    private mouseDownPoint: [number, number] = [0, 0];

    constructor(config: Types.MLMapConfig = {}) {
        this.keyDown = this.keyDown.bind(this);
        this.setConfigEnabled = this.setConfigEnabled.bind(this);
        this.showLayerNames = this.getProp(config, "labels", true);
        this.showCrosshairs = this.getProp(config, "crosshairs", false);
        this.showScreenBounds = this.getProp(config, "screenbounds", false);
        this.autoSave = this.getProp(config, "autoSave", true);
        this.autoLoad = this.getProp(config, "autoLoad", true);
        this.layerList = this.getProp(config, "layers", []);
        this.layoutChangeListener = this.getProp(config, "onchange", () => { });

        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d")!;

        this.initCanvas();
        this.loadSettings();

        for (let item of this.layerList) {
            if (item instanceof HTMLElement || typeof item === "string") this.addLayer(item);
        }

        if (this.autoLoad) this.loadSettings();
        this.pushHistory();

        const observer = new MutationObserver((mutationsList) => {
            mutationsList.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    // Skip nodes that were just moved (appendChild re-appends)
                    if ((node as Element).isConnected) return;
                    this.layers.forEach((layer, i) => {
                        if (layer.element === node) {
                            if (layer.overlay) layer.overlay.remove();
                            this.layers.splice(i, 1);
                        }
                    });
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    };

    // ---------------- Internal Methods ----------------
    private getProp(cfg: any, key: string, defaultVal: any) {
        return cfg && cfg.hasOwnProperty(key) && cfg[key] !== null ? cfg[key] : defaultVal;
    };

    private initCanvas() {
        this.canvas.style.display = "none";
        this.canvas.style.position = "fixed";
        this.canvas.style.top = "0px";
        this.canvas.style.left = "0px";
        this.canvas.style.zIndex = "1000000";

        this.context = this.canvas.getContext("2d")!;
        document.body.appendChild(this.canvas);

        window.addEventListener("resize", this.resize.bind(this));
        window.addEventListener("mousemove", this.mouseMove.bind(this));
        window.addEventListener("mouseup", this.mouseUp.bind(this));
        window.addEventListener("mousedown", this.mouseDown.bind(this));
        window.addEventListener("keydown", this.keyDown.bind(this));

        this.resize();
    };

    private pushHistory() {
        const snapshot = this.getLayout();
        historyStack.push(JSON.stringify(snapshot));
        if (historyStack.length > historyLimit) historyStack.shift();
        redoStack.length = 0;
    };

    private saveSettings() {
        const data = storage.loadWorkspace()!;
        storage.saveWorkspace({
            id: data?.id,
            name: data?.name,
            version: data?.version,
            layout: this.getLayout()
        });
    };

    private loadSettings() {
        try {
            const data = storage.loadWorkspace();
            if (data?.version === "1.0" && data?.layout) this.setLayout(data.layout);
            else console.warn("MLMap: localStorage version mismatch, skipping load.");
        } catch (e) {
            console.error("MLMap: Failed to parse layout from localStorage.", e);
        }
    };

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.draw();
    };

    private pointInTriangle(p: Types.Point, a: Types.Point, b: Types.Point, c: Types.Point) {
        let s = a[1] * c[0] - a[0] * c[1] + (c[1] - a[1]) * p[0] + (a[0] - c[0]) * p[1];
        let t = a[0] * b[1] - a[1] * b[0] + (a[1] - b[1]) * p[0] + (b[0] - a[0]) * p[1];
        if ((s < 0) !== (t < 0)) return false;
        let A = -b[1] * c[0] + a[1] * (c[0] - b[0]) + a[0] * (b[1] - c[1]) + b[0] * c[1];
        if (A < 0) { s = -s; t = -t; A = -A; }
        return s > 0 && t > 0 && (s + t) < A;
    };

    private pointInLayer(point: Types.Point, layer: Types.Layer) {
        const [a, b, c, d] = layer.targetPoints;
        return this.pointInTriangle(point, a, b, c) || this.pointInTriangle(point, d, a, c);
    };

    private updateTransform() {
        const prefixes = ["", "-webkit-", "-moz-", "-ms-", "-o-"];
        let transformProp = "transform";
        for (const pre of prefixes) {
            const candidate = pre + "transform";
            if (candidate in (document.body.style as any)) { transformProp = candidate; break; }
        }

        for (let l = 0; l < this.layers.length; l++) {
            const a: number[][] = [];
            const b: number[] = [];
            for (let i = 0, n = this.layers[l].sourcePoints.length; i < n; ++i) {
                const s = this.layers[l].sourcePoints[i];
                const t = this.layers[l].targetPoints[i];
                a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * t[0], -s[1] * t[0]]);
                b.push(t[0]);
                a.push([0, 0, 0, s[0], s[1], 1, -s[0] * t[1], -s[1] * t[1]]);
                b.push(t[1]);
            }

            const X = utils.solve(a, b, true);
            const matrix = [
                X[0], X[3], 0, X[6],
                X[1], X[4], 0, X[7],
                0, 0, 1, 0,
                X[2], X[5], 0, 1
            ];

            const style = this.layers[l].element.style;
            style.setProperty(transformProp, `matrix3d(${matrix.join(",")})`);
            style.setProperty(`${transformProp}-origin`, "0px 0px 0px");
        }
    };

    private rotateLayer(layer: Types.Layer, angle: number) {
        var s = Math.sin(angle);
        var c = Math.cos(angle);

        var centerPoint = [0, 0];
        for (var p = 0; p < layer.targetPoints.length; p++) {
            centerPoint[0] += layer.targetPoints[p][0];
            centerPoint[1] += layer.targetPoints[p][1];
        }

        centerPoint[0] /= 4;
        centerPoint[1] /= 4;

        for (var p = 0; p < layer.targetPoints.length; p++) {
            var px = layer.targetPoints[p][0] - centerPoint[0];
            var py = layer.targetPoints[p][1] - centerPoint[1];

            layer.targetPoints[p][0] = (px * c) - (py * s) + centerPoint[0];
            layer.targetPoints[p][1] = (px * s) + (py * c) + centerPoint[1];
        }
    };

    private scaleLayer(layer: Types.Layer, scale: number) {
        var centerPoint = [0, 0];
        for (var p = 0; p < layer.targetPoints.length; p++) {
            centerPoint[0] += layer.targetPoints[p][0];
            centerPoint[1] += layer.targetPoints[p][1];
        }

        centerPoint[0] /= 4;
        centerPoint[1] /= 4;

        for (var p = 0; p < layer.targetPoints.length; p++) {
            var px = layer.targetPoints[p][0] - centerPoint[0];
            var py = layer.targetPoints[p][1] - centerPoint[1];

            layer.targetPoints[p][0] = (px * scale) + centerPoint[0];
            layer.targetPoints[p][1] = (py * scale) + centerPoint[1];
        }
    };

    private undo() {
        if (historyStack.length > 1) {
            redoStack.push(historyStack.pop()!);
            var last = JSON.parse(historyStack[historyStack.length - 1]);
            this.setLayout(last);
            this.draw();
            if (this.autoSave) this.saveSettings();
            this.layoutChangeListener();
        }
    };

    private redo() {
        if (redoStack.length > 0) {
            const state = redoStack.pop()!;
            historyStack.push(state);
            this.setLayout(JSON.parse(state));
            this.draw();
            if (this.autoSave) this.saveSettings();
            this.layoutChangeListener();
        }
    };

    private swapLayerPoints(layerPoints: Types.Point[], index1: number, index2: number) {
        var tx = layerPoints[index1][0];
        var ty = layerPoints[index1][1];
        layerPoints[index1][0] = layerPoints[index2][0];
        layerPoints[index1][1] = layerPoints[index2][1];
        layerPoints[index2][0] = tx;
        layerPoints[index2][1] = ty;
    };

    // ---------------- Public API ----------------
    public addLayer(target: HTMLElement | string, targetPoints?: number[][]) {
        let element: HTMLElement | null = null;

        if (typeof target === "string") {
            element = document.getElementById(target);
            if (!element) throw new Error("MLMap: No element found with id: " + target);
        } else if (target instanceof HTMLElement) element = target;
        else throw new Error("MLMap: Invalid target");

        // Check if layer exists.
        for (let n = 0; n < this.layers.length; n++) {
            if (this.layers[n].element.id === element.id) {
                if (targetPoints) this.layers[n].targetPoints = utils.clonePoints(targetPoints);
                return;
            }
        }

        element.style.position = "fixed";
        element.style.display = "block";
        element.style.top = "0px";
        element.style.left = "0px";
        element.style.padding = "0px";
        element.style.margin = "0px";

        const layer: Types.Layer = {
            visible: true,
            element,
            width: element.clientWidth,
            height: element.clientHeight,
            sourcePoints: [
                [0, 0],
                [element.clientWidth, 0],
                [element.clientWidth, element.clientHeight],
                [0, element.clientHeight]
            ],
            targetPoints: []
        };

        if (targetPoints) layer.targetPoints = utils.clonePoints(targetPoints);
        else {
            const [x, y] = utils.getFreePosition(layer.width, layer.height, this.layers);
            layer.targetPoints = [
                [x, y],
                [x + layer.width, y],
                [x + layer.width, y + layer.height],
                [x, y + layer.height]
            ];
        }

        this.layers.push(layer);
        // Ensure new layer is visually on top (DOM z-stacking follows DOM order)
        element.parentElement?.appendChild(element);
        this.updateTransform();
    };

    public removeLayer(target: HTMLElement | string) {
        const element = typeof target === "string" ? document.getElementById(target) : target;
        if (!element) return;

        for (let i = this.layers.length - 1; i >= 0; i--) {
            if (this.layers[i].element === element) {
                if (this.layers[i].overlay) this.layers[i].overlay?.remove();
                this.layers.splice(i, 1);
            }
        }
        this.updateTransform();
    };

    public setLayout(layout: any) {
        for (var i = 0; i < layout.length; i++) {
            var exists = false;
            for (var n = 0; n < this.layers.length; n++) {
                if (this.layers[n].element.id == layout[i].id) {
                    console.log("Setting points.");
                    this.layers[n].targetPoints = utils.clonePoints(layout[i].targetPoints);
                    this.layers[n].sourcePoints = utils.clonePoints(layout[i].sourcePoints);
                    exists = true;
                }
            }

            if (!exists) {
                var element = document.getElementById(layout[i].id);
                if (element) this.addLayer(element, layout[i].targetPoints);
                else console.log(`MLMap: Can"t find element: ` + layout[i].id);
            } else console.log(`MLMap: Element "" + layout[i].id + "" is already mapped.`);
        }
        this.updateTransform();
        this.draw();
    };

    public getLayout() {
        var layout = [];
        for (var i = 0; i < this.layers.length; i++) {
            layout.push({
                "id": this.layers[i].element.id,
                "targetPoints": utils.clonePoints(this.layers[i].targetPoints),
                "sourcePoints": utils.clonePoints(this.layers[i].sourcePoints)
            });
        }
        return layout;
    };

    public setConfigEnabled(enabled: boolean) {
        this.configActive = enabled;
        this.canvas.style.display = enabled ? "block" : "none";

        if (!enabled) {
            this.selectedPoint = null;
            this.selectedLayer = null;
            this.selectedLayers = [];
            this.dragging = false;
            this.rubberBandActive = false;
            this.showScreenBounds = false;
        } else this.draw();
    };

    // ---- Context menu helpers ----
    public getSelectedLayer(): Types.Layer | null { return this.selectedLayer; }
    public getLayers(): Types.Layer[] { return this.layers; }

    public getLayerAtPoint(x: number, y: number): Types.Layer | null {
        const [wx, wy] = this.toWorkspace(x, y);
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (!layer.visible) continue;
            if (this.pointInLayer([wx, wy], layer)) return layer;
        }
        return null;
    }

    public selectLayer(layer: Types.Layer | null): void {
        this.selectedLayer = layer;
        this.selectedLayers = layer ? [layer] : [];
        this.selectedPoint = null;
        this.draw();
    }

    public getSelectedLayers(): Types.Layer[] { return [...this.selectedLayers]; }

    public centerLayer(layer: Types.Layer): void {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        let lcx = 0, lcy = 0;
        for (const p of layer.targetPoints) { lcx += p[0]; lcy += p[1]; }
        lcx /= 4; lcy /= 4;
        const dx = cx - lcx, dy = cy - lcy;
        for (const p of layer.targetPoints) { p[0] += dx; p[1] += dy; }
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public rotateLayerPublic(layer: Types.Layer, angleDeg: number): void {
        this.rotateLayer(layer, (angleDeg * Math.PI) / 180);
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public flipLayerH(layer: Types.Layer): void {
        this.swapLayerPoints(layer.sourcePoints, 0, 1);
        this.swapLayerPoints(layer.sourcePoints, 3, 2);
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public flipLayerV(layer: Types.Layer): void {
        this.swapLayerPoints(layer.sourcePoints, 0, 3);
        this.swapLayerPoints(layer.sourcePoints, 1, 2);
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public deleteSelectedLayer(layer: Types.Layer): void {
        layer.element.remove();
        if (layer.overlay) layer.overlay.remove();
        const index = this.layers.indexOf(layer);
        if (index >= 0) this.layers.splice(index, 1);
        if (this.selectedLayer === layer) this.selectedLayer = null;
        const selIdx = this.selectedLayers.indexOf(layer);
        if (selIdx >= 0) this.selectedLayers.splice(selIdx, 1);
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public scaleLayerPublic(layer: Types.Layer, scale: number): void {
        this.scaleLayer(layer, scale);
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    // ---- Layer ordering ----
    public moveLayerUp(layer: Types.Layer): void {
        const idx = this.layers.indexOf(layer);
        if (idx < 0 || idx >= this.layers.length - 1) return;
        this.layers[idx] = this.layers[idx + 1];
        this.layers[idx + 1] = layer;
        this.reorderLayerDOM();
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public moveLayerDown(layer: Types.Layer): void {
        const idx = this.layers.indexOf(layer);
        if (idx <= 0) return;
        this.layers[idx] = this.layers[idx - 1];
        this.layers[idx - 1] = layer;
        this.reorderLayerDOM();
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public moveLayerToTop(layer: Types.Layer): void {
        const idx = this.layers.indexOf(layer);
        if (idx < 0 || idx === this.layers.length - 1) return;
        this.layers.splice(idx, 1);
        this.layers.push(layer);
        this.reorderLayerDOM();
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public moveLayerToBottom(layer: Types.Layer): void {
        const idx = this.layers.indexOf(layer);
        if (idx <= 0) return;
        this.layers.splice(idx, 1);
        this.layers.unshift(layer);
        this.reorderLayerDOM();
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    private reorderLayerDOM(): void {
        for (const layer of this.layers) {
            layer.element.parentElement?.appendChild(layer.element);
        }
    }

    public stretchToFrame(layer: Types.Layer, frame: { x: number; y: number; w: number; h: number }): void {
        layer.targetPoints = [
            [frame.x, frame.y],
            [frame.x + frame.w, frame.y],
            [frame.x + frame.w, frame.y + frame.h],
            [frame.x, frame.y + frame.h],
        ];
        layer.sourcePoints = [
            [0, 0], [layer.width, 0],
            [layer.width, layer.height], [0, layer.height],
        ];
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public fitToFrame(layer: Types.Layer, frame: { x: number; y: number; w: number; h: number }): void {
        const layerAspect = layer.width / layer.height;
        const frameAspect = frame.w / frame.h;
        let fw: number, fh: number;
        if (layerAspect > frameAspect) {
            fw = frame.w;
            fh = frame.w / layerAspect;
        } else {
            fh = frame.h;
            fw = frame.h * layerAspect;
        }
        const fx = frame.x + (frame.w - fw) / 2;
        const fy = frame.y + (frame.h - fh) / 2;
        layer.targetPoints = [
            [fx, fy], [fx + fw, fy],
            [fx + fw, fy + fh], [fx, fy + fh],
        ];
        layer.sourcePoints = [
            [0, 0], [layer.width, 0],
            [layer.width, layer.height], [0, layer.height],
        ];
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    public exportTemplate(width: number, height: number): HTMLCanvasElement {
        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d")!;

        // Black background
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);

        // Scale from editor coordinates to output resolution
        const frame = this.outputFrame;
        let sx: number, sy: number, ox: number, oy: number;
        if (frame && frame.w > 0 && frame.h > 0) {
            sx = width / frame.w;
            sy = height / frame.h;
            ox = frame.x;
            oy = frame.y;
        } else {
            sx = width / window.innerWidth;
            sy = height / window.innerHeight;
            ox = 0;
            oy = 0;
        }

        ctx.lineWidth = 2;
        for (const layer of this.layers) {
            if (!layer.visible) continue;

            // Draw layer outline
            ctx.strokeStyle = "white";
            ctx.beginPath();
            const tp = layer.targetPoints;
            ctx.moveTo((tp[0][0] - ox) * sx, (tp[0][1] - oy) * sy);
            for (let p = 1; p < tp.length; p++) {
                ctx.lineTo((tp[p][0] - ox) * sx, (tp[p][1] - oy) * sy);
            }
            ctx.closePath();
            ctx.stroke();

            // Draw label
            let cx = 0, cy = 0;
            for (const p of tp) { cx += (p[0] - ox) * sx; cy += (p[1] - oy) * sy; }
            cx /= 4; cy /= 4;
            const label = layer.element.id.toUpperCase();
            ctx.font = `${Math.max(12, Math.round(16 * sx))}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillText(label, cx, cy + 5);
        }

        // Draw border
        ctx.strokeStyle = "#b44dff";
        ctx.lineWidth = 3;
        ctx.strokeRect(1, 1, width - 2, height - 2);

        // Draw resolution label
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#b44dff";
        ctx.textAlign = "left";
        ctx.fillText(`${width}x${height}`, 8, 20);

        return c;
    }

    public resetHistory(): void {
        historyStack.length = 0;
        redoStack.length = 0;
        this.pushHistory();
    }

    public resetLayerTransform(layer: Types.Layer): void {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const hw = layer.width / 2, hh = layer.height / 2;
        layer.targetPoints = [
            [cx - hw, cy - hh], [cx + hw, cy - hh],
            [cx + hw, cy + hh], [cx - hw, cy + hh]
        ];
        layer.sourcePoints = [
            [0, 0], [layer.width, 0],
            [layer.width, layer.height], [0, layer.height]
        ];
        this.updateTransform();
        this.draw();
        this.pushHistory();
        if (this.autoSave) this.saveSettings();
        this.layoutChangeListener();
    }

    // ---------------- Utils ----------------
    private layerIntersectsRect(layer: Types.Layer, x1: number, y1: number, x2: number, y2: number): boolean {
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
        const rx2 = Math.max(x1, x2), ry2 = Math.max(y1, y2);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of layer.targetPoints) {
            if (p[0] < minX) minX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] > maxY) maxY = p[1];
        }
        return !(maxX < rx || minX > rx2 || maxY < ry || minY > ry2);
    }

    private draw() {
        if (!this.configActive) return;

        this.context.strokeStyle = "red";
        this.context.lineWidth = 2;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.workspaceZoom !== 1) {
            this.context.save();
            const zCx = this.canvas.width / 2;
            const zCy = this.canvas.height / 2;
            this.context.translate(zCx, zCy);
            this.context.scale(this.workspaceZoom, this.workspaceZoom);
            this.context.translate(-zCx, -zCy);
        }

        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];

            if (layer.visible) {
                layer.element.style.visibility = "visible";

                // Draw layer rectangles.
                this.context.beginPath();
                if (this.selectedLayers.includes(layer)) this.context.strokeStyle = "red";
                else if (layer === this.hoveringLayer) this.context.strokeStyle = "red";
                else this.context.strokeStyle = "white";

                this.context.moveTo(layer.targetPoints[0][0], layer.targetPoints[0][1]);
                for (let p = 0; p < layer.targetPoints.length; p++) {
                    this.context.lineTo(layer.targetPoints[p][0], layer.targetPoints[p][1]);
                }
                this.context.lineTo(layer.targetPoints[3][0], layer.targetPoints[3][1]);
                this.context.closePath();
                this.context.stroke();

                // Draw corner points.
                const centerPoint: [number, number] = [0, 0];
                for (let p = 0; p < layer.targetPoints.length; p++) {
                    if (layer.targetPoints[p] === this.hoveringPoint) this.context.strokeStyle = "red";
                    else if (layer.targetPoints[p] === this.selectedPoint) this.context.strokeStyle = "red";
                    else this.context.strokeStyle = "white";

                    centerPoint[0] += layer.targetPoints[p][0];
                    centerPoint[1] += layer.targetPoints[p][1];

                    this.context.beginPath();
                    this.context.arc(layer.targetPoints[p][0], layer.targetPoints[p][1], this.selectionRadius / 2, 0, 2 * Math.PI, false);
                    this.context.stroke();
                }

                // Average corners.
                centerPoint[0] /= 4;
                centerPoint[1] /= 4;

                if (this.showLayerNames) {
                    const label = layer.element.id.toUpperCase();
                    this.context.font = "16px sans-serif";
                    this.context.textAlign = "center";
                    const metrics = this.context.measureText(label);
                    const size: [number, number] = [metrics.width + 8, 16 + 16];

                    this.context.fillStyle = "white";

                    const marginY = window.innerHeight * 0.01; // 1vh.
                    let textX = centerPoint[0];
                    let textY = centerPoint[1];

                    if (layer.width < metrics.width + 10 || layer.height < 20) {
                        textY = centerPoint[1] - layer.height / 2 - 10 - marginY;
                        if (textY - size[1] / 2 < marginY) {
                            textY = centerPoint[1] + layer.height / 2 + 20 + marginY;
                        }
                    }

                    this.context.fillRect(textX - size[0] / 2, textY - size[1] / 2, size[0], size[1]);
                    this.context.fillStyle = "black";
                    this.context.font = "14px sans-serif";
                    this.context.fillText(label, textX, textY);
                }
            } else layer.element.style.visibility = "hidden";
        }

        // Draw mouse crosshairs.
        if (this.showCrosshairs) {
            this.context.strokeStyle = "yellow";
            this.context.lineWidth = 1;
            this.context.beginPath();
            this.context.moveTo(this.mousePosition[0], 0);
            this.context.lineTo(this.mousePosition[0], this.canvas.height);
            this.context.moveTo(0, this.mousePosition[1]);
            this.context.lineTo(this.canvas.width, this.mousePosition[1]);
            this.context.stroke();
        }

        if (this.showScreenBounds) {
            this.context.fillStyle = "black";
            this.context.lineWidth = 4;
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.context.strokeStyle = "#909090";
            this.context.beginPath();
            const stepX = this.canvas.width / 10;
            const stepY = this.canvas.height / 10;

            for (let i = 0; i < 10; i++) {
                this.context.moveTo(i * stepX, 0);
                this.context.lineTo(i * stepX, this.canvas.height);
                this.context.moveTo(0, i * stepY);
                this.context.lineTo(this.canvas.width, i * stepY);
            }
            this.context.stroke();

            this.context.strokeStyle = "white";
            this.context.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);

            const fontSize = Math.round(stepY * 0.6);
            this.context.font = `${fontSize}px mono, sans-serif`;
            this.context.fillRect(stepX * 2 + 2, stepY * 3 + 2, this.canvas.width - stepX * 4 - 4, this.canvas.height - stepY * 6 - 4);
            this.context.fillStyle = "white";
            this.context.font = "20px sans-serif";
            this.context.fillText(`${this.canvas.width} x ${this.canvas.height}`, this.canvas.width / 2, this.canvas.height / 2 + (fontSize * 0.75));
            this.context.fillText("Display size", this.canvas.width / 2, this.canvas.height / 2 - (fontSize * 0.75));
        }

        // Draw output resolution frame
        if (this.outputFrame) {
            const f = this.outputFrame;
            this.context.save();
            this.context.strokeStyle = "#b44dff";
            this.context.lineWidth = 2;
            this.context.setLineDash([8, 6]);
            this.context.strokeRect(f.x, f.y, f.w, f.h);
            this.context.setLineDash([]);
            this.context.font = "11px sans-serif";
            this.context.fillStyle = "#b44dff";
            this.context.textAlign = "left";
            this.context.fillText(`${f.resW}x${f.resH}`, f.x + 4, f.y - 4);
            this.context.restore();
        }

        // Draw rubber band selection rectangle
        if (this.rubberBandActive) {
            const rx = Math.min(this.rubberBandStart[0], this.rubberBandEnd[0]);
            const ry = Math.min(this.rubberBandStart[1], this.rubberBandEnd[1]);
            const rw = Math.abs(this.rubberBandEnd[0] - this.rubberBandStart[0]);
            const rh = Math.abs(this.rubberBandEnd[1] - this.rubberBandStart[1]);
            this.context.strokeStyle = "rgba(51, 153, 255, 0.8)";
            this.context.fillStyle = "rgba(51, 153, 255, 0.1)";
            this.context.lineWidth = 1;
            this.context.fillRect(rx, ry, rw, rh);
            this.context.strokeRect(rx, ry, rw, rh);
        }

        if (this.workspaceZoom !== 1) {
            this.context.restore();
        }

        if (this.onAfterDraw) this.onAfterDraw();
    };

    private snapLayerToEdges(layer: Types.Layer): void {
        if (!this.snapEnabled) return;
        const t = this.SNAP_THRESHOLD;

        // Get bounding box of the moving layer
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of layer.targetPoints) {
            if (p[0] < minX) minX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] > maxY) maxY = p[1];
        }

        let snapDx = 0, snapDy = 0;
        let snappedX = false, snappedY = false;

        // Snap to screen edges
        if (Math.abs(minX) < t) { snapDx = -minX; snappedX = true; }
        else if (Math.abs(maxX - window.innerWidth) < t) { snapDx = window.innerWidth - maxX; snappedX = true; }
        if (Math.abs(minY) < t) { snapDy = -minY; snappedY = true; }
        else if (Math.abs(maxY - window.innerHeight) < t) { snapDy = window.innerHeight - maxY; snappedY = true; }

        // Snap to other layers' edges
        for (const other of this.layers) {
            if (other === layer || !other.visible) continue;
            let oMinX = Infinity, oMinY = Infinity, oMaxX = -Infinity, oMaxY = -Infinity;
            for (const p of other.targetPoints) {
                if (p[0] < oMinX) oMinX = p[0];
                if (p[1] < oMinY) oMinY = p[1];
                if (p[0] > oMaxX) oMaxX = p[0];
                if (p[1] > oMaxY) oMaxY = p[1];
            }
            // Snap right edge to left edge, left to right, etc
            if (!snappedX) {
                if (Math.abs(maxX - oMinX) < t) { snapDx = oMinX - maxX; snappedX = true; }
                else if (Math.abs(minX - oMaxX) < t) { snapDx = oMaxX - minX; snappedX = true; }
                else if (Math.abs(minX - oMinX) < t) { snapDx = oMinX - minX; snappedX = true; }
                else if (Math.abs(maxX - oMaxX) < t) { snapDx = oMaxX - maxX; snappedX = true; }
            }
            if (!snappedY) {
                if (Math.abs(maxY - oMinY) < t) { snapDy = oMinY - maxY; snappedY = true; }
                else if (Math.abs(minY - oMaxY) < t) { snapDy = oMaxY - minY; snappedY = true; }
                else if (Math.abs(minY - oMinY) < t) { snapDy = oMinY - minY; snappedY = true; }
                else if (Math.abs(maxY - oMaxY) < t) { snapDy = oMaxY - maxY; snappedY = true; }
            }
            if (snappedX && snappedY) break;
        }

        if (snapDx !== 0 || snapDy !== 0) {
            for (const p of layer.targetPoints) {
                p[0] += snapDx;
                p[1] += snapDy;
            }
        }
    }

    private toWorkspace(vx: number, vy: number): [number, number] {
        if (this.workspaceZoom === 1) return [vx, vy];
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        return [
            (vx - cx) / this.workspaceZoom + cx,
            (vy - cy) / this.workspaceZoom + cy,
        ];
    }

    public setWorkspaceZoom(zoom: number): void {
        this.workspaceZoom = Math.max(0.1, Math.min(1, zoom));
        this.draw();
    }

    private mouseMove(event: MouseEvent) {
        if (!this.configActive) return;

        if (this.dragging || this.rubberBandActive) event.preventDefault();

        const [wx, wy] = this.toWorkspace(event.clientX, event.clientY);
        this.mouseDelta[0] = wx - this.mousePosition[0];
        this.mouseDelta[1] = wy - this.mousePosition[1];

        this.mousePosition[0] = wx;
        this.mousePosition[1] = wy;

        // Rubber band selection
        if (this.rubberBandActive) {
            this.rubberBandEnd = [wx, wy];
            const rbLayers: Types.Layer[] = [];
            for (const layer of this.layers) {
                if (!layer.visible) continue;
                if (this.layerIntersectsRect(layer,
                    this.rubberBandStart[0], this.rubberBandStart[1],
                    this.rubberBandEnd[0], this.rubberBandEnd[1])) {
                    rbLayers.push(layer);
                }
            }
            // Merge with base selection (Ctrl held at start)
            const merged = [...this.rubberBandBaseSelection];
            for (const l of rbLayers) {
                if (!merged.includes(l)) merged.push(l);
            }
            this.selectedLayers = merged;
            this.selectedLayer = this.selectedLayers[this.selectedLayers.length - 1] || null;
            this.draw();
            return;
        }

        if (this.dragging) {
            const scale = event.shiftKey ? 0.1 : 1;

            if (this.selectedPoint) {
                if (event.shiftKey) this.scaleLayer(this.selectedLayer!, 1 + this.mouseDelta[0] * 0.01);
                else {
                    this.selectedPoint[0] += this.mouseDelta[0] * scale;
                    this.selectedPoint[1] += this.mouseDelta[1] * scale;
                }
            } else if (this.selectedLayers.length > 0) {
                if (event.altKey && this.selectedLayer) {
                    this.rotateLayer(this.selectedLayer, this.mouseDelta[0] * (0.01 * scale));
                } else {
                    // Move all selected layers
                    for (const layer of this.selectedLayers) {
                        for (let i = 0; i < layer.targetPoints.length; i++) {
                            layer.targetPoints[i][0] += this.mouseDelta[0] * scale;
                            layer.targetPoints[i][1] += this.mouseDelta[1] * scale;
                        }
                    }
                    if (this.selectedLayer) this.snapLayerToEdges(this.selectedLayer);
                }
            }

            this.updateTransform();
            if (this.autoSave) this.saveSettings();
            this.draw();
            this.layoutChangeListener();
            return;
        }

        this.canvas.style.cursor = "default";
        this.hoveringPoint = null;
        this.hoveringLayer = null;

        // Priority: first check of points.
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (!layer.visible) continue;

            for (let p = 0; p < layer.targetPoints.length; p++) {
                const point = layer.targetPoints[p];
                if (utils.distanceTo(point[0], point[1], this.mousePosition[0], this.mousePosition[1]) < this.selectionRadius) {
                    this.hoveringPoint = point;
                    this.hoveringLayer = layer;
                    this.canvas.style.cursor = "pointer";
                    break;
                }
            }
            if (this.hoveringPoint) break;
        }

        // If there is no point to hover over, check entire layer.
        if (!this.hoveringPoint) {
            for (let i = this.layers.length - 1; i >= 0; i--) {
                const layer = this.layers[i];
                if (!layer.visible) continue;
                if (this.pointInLayer(this.mousePosition, layer)) {
                    this.hoveringLayer = layer;
                    this.canvas.style.cursor = "pointer";
                    break;
                }
            }
        }

        this.draw();
    }

    private mouseDown(event: MouseEvent) {
        if (!this.configActive) return;
        if (event.button === 2) return; // Right click handled by context menu

        const [mdx, mdy] = this.toWorkspace(event.clientX, event.clientY);
        this.mouseDownPoint = [mdx, mdy];
        this.selectedPoint = null;
        this.rubberBandActive = false;

        // First: check for point click
        let clickedLayer: Types.Layer | null = null;
        let clickedPoint: number[] | null = null;

        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (!layer.visible) continue;
            for (let p = 0; p < layer.targetPoints.length; p++) {
                const point = layer.targetPoints[p];
                if (utils.distanceTo(point[0], point[1], mdx, mdy) < this.selectionRadius) {
                    clickedPoint = point;
                    clickedLayer = layer;
                    break;
                }
            }
            if (clickedLayer) break;
        }

        // Then: check for layer click
        if (!clickedLayer) {
            for (let i = this.layers.length - 1; i >= 0; i--) {
                const layer = this.layers[i];
                if (!layer.visible) continue;
                if (this.pointInLayer([mdx, mdy], layer)) {
                    clickedLayer = layer;
                    break;
                }
            }
        }

        if (clickedPoint) {
            // Point editing: single layer mode
            this.selectedPoint = clickedPoint;
            this.selectedLayer = clickedLayer;
            this.selectedLayers = [clickedLayer!];
            this.dragging = true;
        } else if (clickedLayer) {
            if (event.ctrlKey) {
                // Ctrl+click: toggle layer in multi-selection
                const idx = this.selectedLayers.indexOf(clickedLayer);
                if (idx >= 0) {
                    this.selectedLayers.splice(idx, 1);
                    this.selectedLayer = this.selectedLayers[this.selectedLayers.length - 1] || null;
                } else {
                    this.selectedLayers.push(clickedLayer);
                    this.selectedLayer = clickedLayer;
                }
                this.dragging = this.selectedLayers.length > 0;
            } else {
                // Normal click
                if (this.selectedLayers.includes(clickedLayer)) {
                    // Already in selection: keep multi-selection for dragging
                    this.selectedLayer = clickedLayer;
                } else {
                    // Not selected: single select
                    this.selectedLayers = [clickedLayer];
                    this.selectedLayer = clickedLayer;
                }
                this.dragging = true;
            }
        } else {
            // Empty space: start rubber band
            this.selectedLayer = null;
            this.rubberBandBaseSelection = event.ctrlKey ? [...this.selectedLayers] : [];
            if (!event.ctrlKey) this.selectedLayers = [];
            this.rubberBandActive = true;
            this.rubberBandStart = [mdx, mdy];
            this.rubberBandEnd = [mdx, mdy];
            this.dragging = false;
        }

        this.draw();
    }


    private mouseUp(_event: MouseEvent) {
        if (!this.configActive) return;

        if (this.rubberBandActive) {
            this.rubberBandActive = false;
            this.draw();
            return;
        }

        if (this.dragging) {
            this.pushHistory();
            if (this.autoSave) this.saveSettings();
        }

        this.dragging = false;
        this.selectedPoint = null;
    }

    private keyDown(event: KeyboardEvent) {
        if (!this.configActive) {
            if (event.keyCode == 32 && event.shiftKey) {
                this.setConfigEnabled(true);
                return;
            } else return;
        }

        var key = event.keyCode;

        var increment = event.shiftKey ? 10 : 1;
        var dirty = false;
        var delta = [0, 0];

        console.log(key);
        switch (key) {

            case 32: // spacebar.
                if (event.shiftKey) {
                    this.setConfigEnabled(false);
                    return;
                }
                event.preventDefault();
                if (this.onSpaceBar) this.onSpaceBar();
                return;

            case 37: // left arrow.
                delta[0] -= increment;
                break;

            case 38: // up arrow.
                delta[1] -= increment;
                break;

            case 39: // right arrow.
                delta[0] += increment;
                break;

            case 40: // down arrow.
                delta[1] += increment;
                break;

            case 67: // c key, toggle crosshairs.
                this.showCrosshairs = !this.showCrosshairs;
                dirty = true;
                break;

            case 76: // l key, toggle layer names.
                if (!this.configActive) return;
                this.showLayerNames = !this.showLayerNames;
                dirty = true;
                break;

            case 83: // s key, solo/unsolo quads.
                if (!this.isLayerSoloed) {
                    if (this.selectedLayers.length > 0) {
                        for (var i = 0; i < this.layers.length; i++) {
                            this.layers[i].visible = false;
                        }
                        for (const sl of this.selectedLayers) sl.visible = true;
                        dirty = true;
                        this.isLayerSoloed = true;
                    }
                } else {
                    for (var i = 0; i < this.layers.length; i++) {
                        this.layers[i].visible = true;
                    }
                    this.isLayerSoloed = false;
                    dirty = true;
                }
                break;

            case 71: // g key, toggle snap
                this.snapEnabled = !this.snapEnabled;
                if (this.onSnapChanged) this.onSnapChanged(this.snapEnabled);
                break;

            case 66: // b key, toggle projector bounds rectangle.
                this.showScreenBounds = !this.showScreenBounds;
                this.draw();
                break;

            case 72: // h key, flip horizontal.
                if (this.selectedLayer) {
                    this.swapLayerPoints(this.selectedLayer.sourcePoints, 0, 1);
                    this.swapLayerPoints(this.selectedLayer.sourcePoints, 3, 2);
                    this.updateTransform();
                    this.draw();
                }
                break;

            case 86: // v key, flip vertical.
                if (this.selectedLayer) {
                    this.swapLayerPoints(this.selectedLayer.sourcePoints, 0, 3);
                    this.swapLayerPoints(this.selectedLayer.sourcePoints, 1, 2);
                    this.updateTransform();
                    this.draw();
                }
                break;

            case 82: // r key, rotate 90 degrees.
                if (this.selectedLayer) {
                    this.rotateLayer(this.selectedLayer, Math.PI / 2);
                    //rotateLayer(selectedLayer, 0.002);
                    this.updateTransform();
                    this.draw();
                }
                break;
            case 90: // z key
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.undo();
                    return;
                }
                break;

            case 89: // y key
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.redo();
                    return;
                }
                break;

            case 46: // Delete key
            case 8:  // Backspace key
                if (this.selectedLayers.length > 0) {
                    for (const layer of [...this.selectedLayers]) {
                        layer.element.remove();
                        if (layer.overlay) layer.overlay.remove();
                        const index = this.layers.indexOf(layer);
                        if (index >= 0) this.layers.splice(index, 1);
                    }
                    this.selectedLayers = [];
                    this.selectedLayer = null;
                    dirty = true;
                    this.updateTransform();
                    this.draw();
                }
                break;
        }

        // If a layer or point is selected, add the delta amounts (set above via arrow keys).
        if (!this.showScreenBounds) {
            if (this.selectedPoint) {
                this.selectedPoint[0] += delta[0];
                this.selectedPoint[1] += delta[1];
                dirty = true;
            } else if (this.selectedLayers.length > 0) {
                if (event.altKey == true && this.selectedLayer) {
                    this.rotateLayer(this.selectedLayer, delta[0] * 0.01);
                    this.scaleLayer(this.selectedLayer, (delta[1] * -0.005) + 1.0);
                } else {
                    for (const layer of this.selectedLayers) {
                        for (var i = 0; i < layer.targetPoints.length; i++) {
                            layer.targetPoints[i][0] += delta[0];
                            layer.targetPoints[i][1] += delta[1];
                        }
                    }
                }
                dirty = true;
            }
        }

        // Update the transform and redraw if needed.
        if (dirty) {
            this.updateTransform();
            this.draw();
            if (this.autoSave) this.saveSettings();
            this.pushHistory();
            this.layoutChangeListener();
        }
    };
};

// Check URL for shared workflow before initializing
checkUrlForWorkflow();

const baseMLMap = new MLMap({ layers: [] });

initUIControls(baseMLMap);

// Start with edit mode and UI visible
baseMLMap.setConfigEnabled(true);

(window as any).MLMap = MLMap;