import { MLMap } from "../main";
import * as Types from "../types";
import { VERSION } from "../lib/data";
import * as utils from "../utils/basics";
import * as storage from "../utils/storage";
import { checkLatestVersion } from "../utils/remote";

export function initUIControls(baseMLMap: MLMap) {
    // ---- HELP PANEL ----
    const helpPanel = document.createElement("div");
    helpPanel.id = "controls";

    let latestVersion: string = VERSION;

    helpPanel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
  <strong>Controls</strong>
  <button id="closeHelp" style="background:#808080;color:white;border:none;padding:2px 6px;cursor:pointer;">X</button>
</div>
<pre style="margin-top:5px;">
SHIFT-Space: Toggle edit mode

In Edit Mode

click / drag:       select and move quads/corner points
SHIFT + drag:       move selected quad/corner point with 10x precision
ALT + drag:         rotate/scale selected quad
Arrow keys:         move selected quad/corner point
SHIFT + Arrow keys: move selected quad/corner point by 10 pixels
ALT + Arrow keys:   rotate/scale selected quad
's':                Solo/unsolo selected quad
'c':                Toggle mouse cursor crosshairs
'r':                Rotate selected layer 90 degrees clock-wise
'h':                Flip selected layer horizontally
'v':                Flip selected layer vertically
'b':                Show/Hide projector bounds
'l':                Show/Hide layer labels
'⌫'/'Del':         Delete selected layer

MLMap | v${VERSION} ${latestVersion !== VERSION ? ` (update to v${latestVersion})` : ""}
</pre>
    `;

    Object.assign(helpPanel.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "600px",
        background: "#404040",
        color: "white",
        fontFamily: "monospace",
        padding: "10px",
        border: "2px solid #808080",
        zIndex: "1000001",
        cursor: "move",
        display: "none",
        userSelect: "none"
    });

    document.body.appendChild(helpPanel);

    checkLatestVersion().then(v => {
        if (v.latest !== VERSION) {
            const pre = helpPanel.querySelector("pre");
            if (pre) {
                pre.innerHTML = pre.innerHTML.replace(`v${VERSION}`, `v${VERSION} (update to v${v.latest})`);
            }
        }
    });

    document.getElementById("closeHelp")?.addEventListener("click", () => {
        helpPanel.style.display = "none";
    });

    // ---- SHAPE PANEL ----
    const shapePanel = document.createElement("div");
    shapePanel.id = "shapePanel";
    Object.assign(shapePanel.style, {
        position: "fixed",
        top: "10px",
        right: "10px",
        width: "200px",
        background: "#303030",
        color: "white",
        fontFamily: "monospace",
        padding: "10px",
        border: "2px solid #808080",
        zIndex: "1000002",
        cursor: "move",
        display: "none",
        userSelect: "none"
    });

    shapePanel.innerHTML = `
    <strong>Shapes</strong>
    <div id="shapeList"></div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 5px;">
        <button id="addSquare">Add Square</button>
        <button id="addCircle">Add Circle</button>
        <button id="addTriangle">Add Triangle</button>
    </div>
    <hr>
    <strong>Workspaces</strong>
    <select id="workspaceSelector" style="width:100%;margin-top:5px;"></select>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 5px;">
        <button id="addWorkspace" title="Add Workspace" aria-label="Add Workspace">🆕</button>
        <button id="duplicateWorkspace" title="Duplicate Workspace" aria-label="Duplicate Workspace">📋</button>
        <button id="renameWorkspace" title="Rename Workspace" aria-label="Rename Workspace">✏️</button>
        <button id="resetWorkspace" title="Reset Workspace" aria-label="Reset Workspace">🧹</button>
        <button id="deleteWorkspace" title="Delete Workspace" aria-label="Delete Workspace">🗑️</button>
    </div>
    `;

    document.body.appendChild(shapePanel);

    let isDraggingHelpPanel = false, isDraggingSettingsPanel = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    helpPanel.addEventListener("mousedown", function (e: any) {
        if (e?.target?.id !== "closeHelp") {
            isDraggingHelpPanel = true;
            dragOffsetX = e.clientX - helpPanel.offsetLeft;
            dragOffsetY = e.clientY - helpPanel.offsetTop;
        }
    });

    shapePanel.addEventListener("mousedown", function (e: any) {
        isDraggingSettingsPanel = true;
        dragOffsetX = e.clientX - shapePanel.offsetLeft;
        dragOffsetY = e.clientY - shapePanel.offsetTop;
    });

    document.addEventListener("mousemove", function (e) {
        if (isDraggingHelpPanel) {
            helpPanel.style.left = e.clientX - dragOffsetX + "px";
            helpPanel.style.top = e.clientY - dragOffsetY + "px";
            helpPanel.style.transform = "";
        }
        if (isDraggingSettingsPanel) {
            shapePanel.style.left = e.clientX - dragOffsetX + "px";
            shapePanel.style.top = e.clientY - dragOffsetY + "px";
            shapePanel.style.transform = "";
        }
    });

    document.addEventListener("mouseup", function () {
        isDraggingHelpPanel = false;
        isDraggingSettingsPanel = false;
    });

    const shapeList = document.getElementById("shapeList") as HTMLDivElement;
    const addSquareBtn = document.getElementById("addSquare") as HTMLButtonElement;
    const addCircleBtn = document.getElementById("addCircle") as HTMLButtonElement;
    const addTriangleBtn = document.getElementById("addTriangle") as HTMLButtonElement;

    const trianglePoints = new WeakMap<HTMLElement, { sourcePoints: Types.Point[]; targetPoints: Types.Point[] }>();
    let dynamicShapes: Types.Shape[] = [];

    // ---- SHAPE FUNCTIONS ----
    function createShape(type: "square" | "circle" | "triangle"): void {
        const div = document.createElement("div");
        div.id = `shape_${Date.now()}`;

        const [x, y] = utils.getFreePosition(100, 100);
        div.style.position = "fixed";
        div.style.top = y + "px";
        div.style.left = x + "px";
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

            baseMLMap.addLayer(div,
                utils.clonePoints([
                    [50, 0],
                    [100, 100],
                    [0, 100],
                    [50, 100]
                ]
            ));
        }

        document.body.appendChild(div);
        baseMLMap.addLayer(div);
        dynamicShapes.push({ id: div.id, type, x, y });
        updateShapeList();
        saveShapes();
    };

    function updateShapeList(): void {
        shapeList.innerHTML = "";
        dynamicShapes.forEach(s => {
            const el = document.createElement("div");
            el.style.display = "flex";
            el.style.justifyContent = "space-between";
            el.style.marginBottom = "4px";
            el.innerHTML = `${s.type} <button data-id="${s.id}">Delete</button>`;
            shapeList.appendChild(el);
            el.querySelector("button")?.addEventListener("click", () => deleteShape(s.id));
        });
    };

    function deleteShape(id: string): void {
        const idx = dynamicShapes.findIndex(s => s.id === id);
        if (idx !== -1) {
            const layer = document.getElementById(id);
            if (layer) layer.remove();
            dynamicShapes.splice(idx, 1);
            updateShapeList();
            saveShapes();
        }
    };

    function saveShapes(): void {
        localStorage.setItem("mlmap.dynamicShapes", JSON.stringify(dynamicShapes));
    };

    function loadShapes(): void {
        const stored = localStorage.getItem("mlmap.dynamicShapes");
        if (stored) {
            dynamicShapes = JSON.parse(stored) as Types.Shape[];
            dynamicShapes.forEach(s => restoreShape(s));
            updateShapeList();
        }
    };

    function restoreShape(s: Types.Shape): void {
        const div = document.createElement("div");
        div.id = s.id;

        const x = s.x ?? Math.random() * (window.innerWidth - 100);
        const y = s.y ?? Math.random() * (window.innerHeight - 100);

        div.style.position = "fixed";
        div.style.top = y + "px";
        div.style.left = x + "px";
        div.style.width = "100px";
        div.style.height = "100px";
        div.style.background = s.type === "triangle" ? "transparent" : "white";
        div.style.border = s.type === "triangle" ? "2px solid white" : "none";

        if (s.type === "circle") div.style.borderRadius = "50%";
        if (s.type === "triangle") {
            div.style.width = "0";
            div.style.height = "0";
            div.style.borderLeft = "50px solid transparent";
            div.style.borderRight = "50px solid transparent";
            div.style.borderBottom = "100px solid white";
        }

        document.body.appendChild(div);
        baseMLMap.addLayer(div);
    };

    // ---- LISTENERS ----
    addSquareBtn.addEventListener("click", () => createShape("square"));
    addCircleBtn.addEventListener("click", () => createShape("circle"));
    addTriangleBtn.addEventListener("click", () => createShape("triangle"));

    document.addEventListener("keydown", e => {
        if (e.shiftKey && e.code === "Space") {
            e.preventDefault();
            helpPanel.style.display = helpPanel.style.display === "none" ? "block" : "none";
            shapePanel.style.display = shapePanel.style.display === "none" ? "block" : "none";
        }
    });

    // Override edit mode.
    const originalSetConfigEnabled = baseMLMap.setConfigEnabled;
    baseMLMap.setConfigEnabled = function (enabled: boolean) {
        originalSetConfigEnabled(enabled);
        shapePanel.style.display = enabled ? "block" : "none";
    };

    loadShapes();

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
                mutation.removedNodes.forEach(node => {
                    if (node instanceof HTMLElement) {
                        const idx = dynamicShapes.findIndex(s => s.id === node.id);
                        if (idx !== -1) {
                            dynamicShapes.splice(idx, 1);
                            updateShapeList();
                            saveShapes();
                        }
                    }
                });
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const workspaceSelector = shapePanel.querySelector("#workspaceSelector") as HTMLSelectElement;
    let workspaces = storage.loadAllWorkspaces();
    let activeWorkspace: Types.Workspace | null = workspaces.find(ws => ws.id === localStorage.getItem("mlmap:currentWorkspaceId")) || null;

    if (!activeWorkspace && workspaces.length) {
        activeWorkspace = workspaces[0];
        localStorage.setItem("mlmap:currentWorkspaceId", activeWorkspace.id);
    }

    if (activeWorkspace) baseMLMap.setLayout(activeWorkspace.layout);

    if (workspaces.length === 1) (document.getElementById("deleteWorkspace") as HTMLButtonElement).disabled = true;

    function updateWorkspaceSelector() {
        workspaceSelector.innerHTML = "";
        workspaces.forEach(ws => {
            const opt = document.createElement("option");
            opt.value = ws.id;
            opt.textContent = ws.name;
            if (activeWorkspace && activeWorkspace.id === ws.id) opt.selected = true;
            workspaceSelector.appendChild(opt);
        });
    };

    function setActiveWorkspace(ws: Types.Workspace) {
        localStorage.setItem("mlmap:currentWorkspaceId", ws.id);
        // TODO: Temporarily, it needs to be improved.
        window.location.reload();
    };

    document.getElementById("addWorkspace")?.addEventListener("click", () => {
        const name = prompt("Workspace name:", "New Workspace") || "New Workspace";
        const ws: Types.Workspace = { id: Date.now().toString(), name, version: "1.0", layout: {} };
        workspaces.push(ws);
        storage.saveWorkspace(ws);
        setActiveWorkspace(ws);
    });
    document.getElementById("duplicateWorkspace")?.addEventListener("click", () => {
        if (!activeWorkspace) return;
        const name = prompt("New name:", activeWorkspace.name + " (Copy)") || activeWorkspace.name + " (Copy)";
        const ws: Types.Workspace = { id: Date.now().toString(), name, version: "1.0", layout: {} };
        workspaces.push(ws);
        storage.saveWorkspace(ws);
        setActiveWorkspace(ws);
        updateWorkspaceSelector();
    });
    document.getElementById("renameWorkspace")?.addEventListener("click", () => {
        if (!activeWorkspace) return;
        const name = prompt("New name:", activeWorkspace.name) || activeWorkspace.name;
        activeWorkspace.name = name;
        storage.saveWorkspace(activeWorkspace);
        updateWorkspaceSelector();
    });
    document.getElementById("resetWorkspace")?.addEventListener("click", () => {
        if (!activeWorkspace) return;
        storage.resetWorkspace(activeWorkspace.id);
        // TODO: Temporarily, it needs to be improved.
        window.location.reload();
        updateWorkspaceSelector();
    });
    document.getElementById("deleteWorkspace")?.addEventListener("click", () => {
        if (!activeWorkspace || workspaces.length === 1) return;
        if (workspaces.length === 1) (document.getElementById("deleteWorkspace") as HTMLButtonElement).disabled = true;
        storage.deleteWorkspace(activeWorkspace.id);
        workspaces = workspaces.filter(ws => ws.id !== activeWorkspace?.id);
        activeWorkspace = workspaces[0] || null;
        if (activeWorkspace) baseMLMap.setLayout(activeWorkspace.layout);
        updateWorkspaceSelector();
    });
    workspaceSelector.addEventListener("change", () => {
        const ws = workspaces.find(w => w.id === workspaceSelector.value);
        if (ws) setActiveWorkspace(ws);
    });

    updateWorkspaceSelector();

    baseMLMap.layoutChangeListener = () => {
        if (activeWorkspace) {
            activeWorkspace.layout = baseMLMap.getLayout();
            storage.saveWorkspace(activeWorkspace);
        }
    }
};