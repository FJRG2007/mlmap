import { WorkflowData, VideoSource, Playlist, ManagedLayer } from "../types";
import { VERSION } from "../lib/data";

const MANAGED_LAYERS_KEY = "mlmap.managedLayers";
const VIDEO_SOURCES_KEY = "mlmap:videoSources";
const PLAYLISTS_KEY = "mlmap:playlists";
const ACTIVE_PLAYLIST_KEY = "mlmap:activePlaylist";
const CURRENT_WS_KEY = "mlmap:currentWorkspaceId";

export function exportWorkflow(workspaceName?: string): WorkflowData {
    const wsId = localStorage.getItem(CURRENT_WS_KEY) || "default";
    const wsRaw = localStorage.getItem(`mlmap:workspace<${wsId}>`);
    const ws = wsRaw ? JSON.parse(wsRaw) : { id: wsId, name: "Workspace", version: "1.0", layout: [] };

    let managedLayers: ManagedLayer[] = [];
    try {
        const raw = localStorage.getItem(MANAGED_LAYERS_KEY);
        if (raw) managedLayers = JSON.parse(raw);
    } catch { /* ignore */ }

    let videoSources: VideoSource[] = [];
    try {
        const raw = localStorage.getItem(VIDEO_SOURCES_KEY);
        if (raw) videoSources = JSON.parse(raw);
    } catch { /* ignore */ }
    // Only export URL-based sources (blob URLs don't persist)
    videoSources = videoSources.filter(s => s.type === "url");

    let playlists: Playlist[] = [];
    try {
        const raw = localStorage.getItem(PLAYLISTS_KEY);
        if (raw) playlists = JSON.parse(raw);
    } catch { /* ignore */ }

    const activePlaylistId = localStorage.getItem(ACTIVE_PLAYLIST_KEY);

    return {
        version: VERSION,
        name: workspaceName || ws.name || "Workflow",
        timestamp: Date.now(),
        workspace: {
            id: ws.id,
            name: ws.name,
            layout: ws.layout,
        },
        managedLayers,
        videoSources,
        playlists,
        activePlaylistId,
    };
}

export function importWorkflow(data: WorkflowData): void {
    // Generate a new workspace ID so it doesn't conflict with existing ones
    const newWsId = Date.now().toString();

    const workspace = {
        id: newWsId,
        name: data.name || data.workspace.name || "Imported",
        version: "1.0",
        layout: data.workspace.layout || [],
    };
    localStorage.setItem(`mlmap:workspace<${newWsId}>`, JSON.stringify(workspace));
    localStorage.setItem(CURRENT_WS_KEY, newWsId);

    // Import managed layers (shapes only - video layers need their sources)
    if (data.managedLayers) {
        localStorage.setItem(MANAGED_LAYERS_KEY, JSON.stringify(data.managedLayers));
    }

    // Import video sources (merge with existing, skip duplicates by URL)
    if (data.videoSources && data.videoSources.length > 0) {
        let existing: VideoSource[] = [];
        try {
            const raw = localStorage.getItem(VIDEO_SOURCES_KEY);
            if (raw) existing = JSON.parse(raw);
        } catch { /* ignore */ }

        const existingUrls = new Set(existing.map(s => s.url));
        for (const src of data.videoSources) {
            if (!existingUrls.has(src.url)) {
                existing.push(src);
                existingUrls.add(src.url);
            }
        }
        localStorage.setItem(VIDEO_SOURCES_KEY, JSON.stringify(existing));
    }

    // Import playlists
    if (data.playlists && data.playlists.length > 0) {
        localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(data.playlists));
    }
    if (data.activePlaylistId) {
        localStorage.setItem(ACTIVE_PLAYLIST_KEY, data.activePlaylistId);
    }
}

export function workflowToBase64(data: WorkflowData): string {
    const json = JSON.stringify(data);
    // Use TextEncoder to handle unicode properly
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // Standard base64, then make URL-safe
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64ToWorkflow(encoded: string): WorkflowData | null {
    try {
        // Restore standard base64
        let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        // Add padding
        while (b64.length % 4) b64 += "=";
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const json = new TextDecoder().decode(bytes);
        const data = JSON.parse(json);
        // Basic validation
        if (!data.workspace || !data.version) return null;
        return data as WorkflowData;
    } catch {
        return null;
    }
}

export function generateShareUrl(data: WorkflowData): string {
    const encoded = workflowToBase64(data);
    const base = window.location.origin + window.location.pathname;
    return `${base}?workflow=${encoded}`;
}

export function checkUrlForWorkflow(): boolean {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("workflow");
    if (!encoded) return false;

    const data = base64ToWorkflow(encoded);
    if (!data) {
        console.warn("MLMap: Invalid workflow data in URL");
        return false;
    }

    importWorkflow(data);

    // Clean the URL parameter without reloading
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    return true;
}

export function downloadWorkflow(data: WorkflowData): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.mlmap`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function uploadWorkflow(): Promise<WorkflowData | null> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".mlmap,.json";
        input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (!file) { resolve(null); return; }
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string);
                    if (!data.workspace || !data.version) {
                        alert("Invalid workflow file.");
                        resolve(null);
                        return;
                    }
                    resolve(data as WorkflowData);
                } catch {
                    alert("Failed to parse workflow file.");
                    resolve(null);
                }
            };
            reader.readAsText(file);
        });
        input.click();
    });
}
