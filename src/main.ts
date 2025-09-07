import * as Types from "./types";
import * as utils from "./utils/basics";
import { initUIControls } from "./uiControls";

const solve = (() => {
    function r(t: any, nArr: any, o: number, eFunc: any) {
        if (o === nArr.length - 1) return eFunc(t);
        let f: any;
        const u = nArr[o];
        const cArr = Array(u);
        for (f = u - 1; f >= 0; --f) cArr[f] = r(t[f], nArr, o + 1, eFunc);
        return cArr;
    }
    function tfn(rObj: any) {
        const res: number[] = [];
        while (typeof rObj === "object") {
            res.push(rObj.length);
            rObj = rObj[0];
        }
        return res;
    }
    function nfn(rObj: any) {
        let n: any, o: any;
        if (typeof rObj === "object") {
            n = rObj[0];
            if (typeof n === "object") {
                o = n[0];
                return (typeof o === "object") ? tfn(rObj) : [rObj.length, n.length];
            }
            return [rObj.length];
        }
        return [];
    }
    function ofn(rArr: any[]) {
        let i: number;
        const n = rArr.length;
        const out = Array(n);
        for (i = n - 1; i >= 0; --i) out[i] = rArr[i];
        return out;
    }
    function efn(tVal: any) {
        return typeof tVal !== "object" ? tVal : r(tVal, nfn(tVal), 0, ofn);
    }
    function ffn(rArr: any, tFlag?: boolean) {
        tFlag = tFlag || false;
        let n: any, o: any, fVar: any, uVar: any, a: any, h: any, i: any, l: any, g: any;
        let v = rArr.length;
        const y = v - 1;
        const b = new Array(v);
        if (!tFlag) rArr = efn(rArr);
        for (fVar = 0; fVar < v; ++fVar) {
            i = fVar;
            h = rArr[fVar];
            g = c(h[fVar]);
            for (o = fVar + 1; o < v; ++o) {
                uVar = c(rArr[o][fVar]);
                if (uVar > g) { g = uVar; i = o; }
            }
            b[fVar] = i;
            if (i != fVar) { rArr[fVar] = rArr[i]; rArr[i] = h; h = rArr[fVar]; }
            a = h[fVar];
            for (n = fVar + 1; n < v; ++n) rArr[n][fVar] /= a;
            for (n = fVar + 1; n < v; ++n) {
                l = rArr[n];
                for (o = fVar + 1; o < y; ++o) { l[o] -= l[fVar] * h[o]; ++o; l[o] -= l[fVar] * h[o]; }
                if (o === y) l[o] -= l[fVar] * h[o];
            }
        }
        return { LU: rArr, P: b };
    }
    function ufn(rObj: any, tArr: any) {
        let n: any, o: any, fVar: any, uVar: any, cVar: any;
        const a = rObj.LU;
        const h = a.length;
        const iArr = efn(tArr);
        const lArr = rObj.P;
        for (n = h - 1; n >= 0; --n) iArr[n] = tArr[n];
        for (n = 0; n < h; ++n) {
            fVar = lArr[n];
            if (lArr[n] !== n) { cVar = iArr[n]; iArr[n] = iArr[fVar]; iArr[fVar] = cVar; }
            uVar = a[n];
            for (o = 0; o < n; ++o) iArr[n] -= iArr[o] * uVar[o];
        }
        for (n = h - 1; n >= 0; --n) {
            uVar = a[n];
            for (o = n + 1; o < h; ++o) iArr[n] -= iArr[o] * uVar[o];
            iArr[n] /= uVar[n];
        }
        return iArr;
    }
    const c = Math.abs;
    return function (rMat: any, bVec: any, nOpt?: any) {
        return ufn(ffn(rMat, nOpt), bVec);
    };
})();

// ------------------- Global variables -------------------
let historyStack: string[] = [];
const historyLimit = 50;

export class MLMap {
    private showLayerNames: boolean;
    private showCrosshairs: boolean;
    private showScreenBounds: boolean;
    private autoSave: boolean;
    private autoLoad: boolean;
    private layerList: (HTMLElement | string)[];
    private layoutChangeListener: () => void;
    private localStorageKey = "mlmap.layers";

    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    private layers: Types.Layer[] = [];
    private configActive = false;

    private dragging = false;
    private dragOffset: [number, number] = [0, 0];

    private selectedLayer: Types.Layer | null = null;
    private selectedPoint: number[] | null = null;
    private selectionRadius = 20;
    private hoveringPoint: number[] | null = null;
    private hoveringLayer: Types.Layer | null = null;
    private isLayerSoloed = false;

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
    };

    private saveSettings() {
        const data = {
            version: "1.0",
            layout: this.getLayout()
        };
        localStorage.setItem(this.localStorageKey, JSON.stringify(data));
    };

    private loadSettings() {
        const raw = localStorage.getItem(this.localStorageKey);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                if (data.version === "1.0" && data.layout) this.setLayout(data.layout);
                else console.warn("MLMap: localStorage version mismatch, skipping load.");
            } catch (e) {
                console.error("MLMap: Failed to parse layout from localStorage.", e);
            }
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

            const X = solve(a, b, true);
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
            historyStack.pop();
            var last = JSON.parse(historyStack[historyStack.length - 1]);
            this.setLayout(last);
            this.draw();
            if (this.autoSave) this.saveSettings();
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
                else console.log(`Maptastic: Can"t find element: ` + layout[i].id);
            } else console.log(`Maptastic: Element "" + layout[i].id + "" is already mapped.`);
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
            this.dragging = false;
            this.showScreenBounds = false;
        } else this.draw();
    };

    // ---------------- Utils ----------------
    private draw() {
        if (!this.configActive) return;

        this.context.strokeStyle = "red";
        this.context.lineWidth = 2;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.layers.length; i++) {
            const layer = this.layers[i];

            if (layer.visible) {
                layer.element.style.visibility = "visible";

                // Draw layer rectangles.
                this.context.beginPath();
                if (layer === this.hoveringLayer) this.context.strokeStyle = "red";
                else if (layer === this.selectedLayer) this.context.strokeStyle = "red";
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
            this.context.fillText("display size", this.canvas.width / 2, this.canvas.height / 2 - (fontSize * 0.75));
        }
    };

    private mouseMove(event: MouseEvent) {
        if (!this.configActive) return;

        event.preventDefault();

        this.mouseDelta[0] = event.clientX - this.mousePosition[0];
        this.mouseDelta[1] = event.clientY - this.mousePosition[1];

        this.mousePosition[0] = event.clientX;
        this.mousePosition[1] = event.clientY;

        if (this.dragging) {
            const scale = event.shiftKey ? 0.1 : 1;

            if (this.selectedPoint) {
                if (event.shiftKey) this.scaleLayer(this.selectedLayer!, 1 + this.mouseDelta[0] * 0.01);
                else {
                    this.selectedPoint[0] += this.mouseDelta[0] * scale;
                    this.selectedPoint[1] += this.mouseDelta[1] * scale;
                }
            } else if (this.selectedLayer) {
                if (event.altKey) this.rotateLayer(this.selectedLayer, this.mouseDelta[0] * (0.01 * scale));
                if (event.ctrlKey) this.scaleLayer(this.selectedLayer, (this.mouseDelta[1] * (-0.005 * scale)) + 1.0);
                else {
                    for (let i = 0; i < this.selectedLayer.targetPoints.length; i++) {
                        this.selectedLayer.targetPoints[i][0] += this.mouseDelta[0] * scale;
                        this.selectedLayer.targetPoints[i][1] += this.mouseDelta[1] * scale;
                    }
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
                if (utils.distanceTo(point[0], point[1], event.clientX, event.clientY) < this.selectionRadius) {
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

        this.mouseDownPoint = [event.clientX, event.clientY];
        this.selectedPoint = null;
        this.selectedLayer = null;

        // First select a point if you are on one.
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            if (!layer.visible) continue;

            for (let p = 0; p < layer.targetPoints.length; p++) {
                const point = layer.targetPoints[p];
                if (utils.distanceTo(point[0], point[1], event.clientX, event.clientY) < this.selectionRadius) {
                    this.selectedPoint = point;
                    this.selectedLayer = layer;
                    break;
                }
            }
            if (this.selectedLayer) break;
        }

        // If there is no point, select by layer.
        if (!this.selectedLayer) {
            for (let i = this.layers.length - 1; i >= 0; i--) {
                const layer = this.layers[i];
                if (!layer.visible) continue;
                if (this.pointInLayer([event.clientX, event.clientY], layer)) {
                    this.selectedLayer = layer;
                    break;
                }
            }
        }

        if (this.selectedLayer) {
            this.dragging = true;
            this.draw();
        }
    }


    private mouseUp(_event: MouseEvent) {
        if (!this.configActive) return;

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
                break;

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

            case 83: // s key, solo/unsolo quads.
                if (!this.isLayerSoloed) {

                    if (this.selectedLayer != null) {
                        for (var i = 0; i < this.layers.length; i++) {
                            this.layers[i].visible = false;
                        }
                        this.selectedLayer.visible = true;
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
                if (event.ctrlKey) this.undo();
                break;
        }

        // If a layer or point is selected, add the delta amounts (set above via arrow keys).
        if (!this.showScreenBounds) {
            if (this.selectedPoint) {
                this.selectedPoint[0] += delta[0];
                this.selectedPoint[1] += delta[1];
                dirty = true;
            } else if (this.selectedLayer) {
                if (event.altKey == true) {
                    this.rotateLayer(this.selectedLayer, delta[0] * 0.01);
                    this.scaleLayer(this.selectedLayer, (delta[1] * -0.005) + 1.0);
                } else {
                    for (var i = 0; i < this.selectedLayer.targetPoints.length; i++) {
                        this.selectedLayer.targetPoints[i][0] += delta[0];
                        this.selectedLayer.targetPoints[i][1] += delta[1];
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

const dymoMaptastic = new MLMap({ layers: [] });

initUIControls(dymoMaptastic);

(window as any).MLMap = MLMap;