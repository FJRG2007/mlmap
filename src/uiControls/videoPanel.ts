import { ChannelBridge } from "../channel";
import { VideoSourceManager } from "../video/sources";
import { PlaylistManager } from "../video/playlist";

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export function initVideoUI(
    mediaContainer: HTMLElement,
    transportContainer: HTMLElement,
    bridge: ChannelBridge,
    onAddVideoLayer: (url: string, name: string, stream?: MediaStream) => void,
): {
    sourceManager: VideoSourceManager;
    playlistManager: PlaylistManager;
    sendPlaylistToDisplay: () => void;
    syncPlaybackToDisplay: () => void;
    registerVideoElement: (video: HTMLVideoElement) => void;
    setActiveVideo: (video: HTMLVideoElement) => void;
    getActiveVideo: () => HTMLVideoElement | null;
    togglePlayPause: () => void;
} {
    const sourceManager = new VideoSourceManager();
    const playlistManager = new PlaylistManager();

    // ---- LOCAL VIDEO STATE ----
    let localVideo: HTMLVideoElement | null = null;
    let localPlaylistIndex = 0;

    // ---- MEDIA LIBRARY (right panel) ----
    mediaContainer.innerHTML = `
        <div class="mlmap-section">
            <div class="mlmap-section-title">Media Library</div>
            <div style="display:flex;gap:4px;margin-bottom:4px;">
                <input id="vp-url" type="text" class="mlmap-input" placeholder="Video URL..." style="flex:1;min-width:0;">
                <button id="vp-addUrl" class="mlmap-btn">Add</button>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:6px;">
                <input id="vp-file" type="file" accept="video/*" style="display:none;">
                <button id="vp-chooseFile" class="mlmap-btn" style="flex:1;">Browse file...</button>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:6px;">
                <button id="vp-capture" class="mlmap-btn" style="flex:1;">Screen capture...</button>
                <button id="vp-webcam" class="mlmap-btn" style="flex:1;">Webcam...</button>
            </div>
            <div id="vp-library"></div>
        </div>
        <div class="mlmap-section">
            <div class="mlmap-section-title">Playlist</div>
            <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px;">
                <select id="vp-plSelect" class="mlmap-select" style="flex:1;min-width:0;"></select>
                <button id="vp-plNew" class="mlmap-btn" title="New playlist">+</button>
                <button id="vp-plDel" class="mlmap-btn" title="Delete playlist">-</button>
            </div>
            <div id="vp-playlist" style="margin-bottom:4px;"></div>
            <button id="vp-loop" class="mlmap-btn" style="width:100%;font-size:10px;">Loop: ON</button>
        </div>
    `;

    // ---- TRANSPORT BAR (bottom) ----
    transportContainer.innerHTML = `
        <div style="display:flex;align-items:center;gap:3px;">
            <button id="tp-prev" class="transport-btn" title="Previous">|&lt;</button>
            <button id="tp-rw" class="transport-btn" title="-10s">&lt;&lt;</button>
            <button id="tp-play" class="transport-btn" title="Play" style="width:38px;font-size:14px;">&#9654;</button>
            <button id="tp-ff" class="transport-btn" title="+10s">&gt;&gt;</button>
            <button id="tp-next" class="transport-btn" title="Next">&gt;|</button>
            <button id="tp-stop" class="transport-btn" title="Stop">&#9632;</button>
        </div>
        <input id="tp-seek" type="range" min="0" max="1000" value="0" step="1" class="mlmap-range" style="flex:1;min-width:80px;">
        <span id="tp-time" style="font-size:11px;white-space:nowrap;color:#aaa;min-width:85px;text-align:center;">0:00 / 0:00</span>
        <span id="tp-now" style="flex:1;font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">No media</span>
        <div style="display:flex;align-items:center;gap:4px;">
            <span style="font-size:10px;color:#666;">Vol</span>
            <input id="tp-vol" type="range" min="0" max="100" value="100" class="mlmap-range" style="width:70px;">
            <button id="tp-mute" class="transport-btn" style="width:28px;font-size:10px;" title="Mute/Unmute">M</button>
        </div>
        <select id="tp-audioOut" class="mlmap-select" style="max-width:120px;font-size:10px;" title="Audio output routing">
            <option value="editor">Audio: Editor</option>
            <option value="output">Audio: Output</option>
            <option value="both">Audio: Both</option>
        </select>
    `;

    const $ = (id: string) => document.getElementById(id) as HTMLElement;

    // ---- LOCAL VIDEO MANAGEMENT ----
    function registerVideoElement(video: HTMLVideoElement): void {
        localVideo = video;
        video.addEventListener("timeupdate", updateTransportUI);
        video.addEventListener("play", () => {
            // Apply audio routing when video starts playing so auto-play
            // captures/clip-masks get the correct mute state immediately
            if (localVideo === video) applyAudioRouting();
            updateTransportUI();
        });
        video.addEventListener("pause", updateTransportUI);
        video.addEventListener("ended", onLocalVideoEnded);
        video.addEventListener("loadedmetadata", updateTransportUI);
    }

    function loadPlaylistItem(index: number): void {
        const active = playlistManager.getActive();
        if (!active || !active.items[index] || !localVideo) return;
        localPlaylistIndex = index;
        const item = active.items[index];
        const src = sourceManager.getById(item.sourceId);
        if (!src) return;
        localVideo.src = src.url;
        localVideo.load();
    }

    function localNext(): void {
        const active = playlistManager.getActive();
        if (!active || active.items.length === 0) return;
        localPlaylistIndex++;
        if (localPlaylistIndex >= active.items.length) {
            if (active.loop) localPlaylistIndex = 0;
            else { localPlaylistIndex = active.items.length - 1; return; }
        }
        loadPlaylistItem(localPlaylistIndex);
        if (localVideo) localVideo.play().catch(() => {});
        bridge.send("NEXT");
    }

    function localPrev(): void {
        const active = playlistManager.getActive();
        if (!active || active.items.length === 0) return;
        localPlaylistIndex--;
        if (localPlaylistIndex < 0) {
            if (active.loop) localPlaylistIndex = active.items.length - 1;
            else { localPlaylistIndex = 0; return; }
        }
        loadPlaylistItem(localPlaylistIndex);
        if (localVideo) localVideo.play().catch(() => {});
        bridge.send("PREVIOUS");
    }

    function onLocalVideoEnded(): void {
        const active = playlistManager.getActive();
        if (active && active.items.length > 1) localNext();
        else if (active && active.loop && localVideo) {
            localVideo.currentTime = 0;
            localVideo.play().catch(() => {});
            // Sync loop restart to display
            bridge.send("SEEK", { time: 0 });
            bridge.send("PLAY");
        }
    }

    function getCurrentSourceName(): string {
        const active = playlistManager.getActive();
        if (active && active.items[localPlaylistIndex]) {
            const src = sourceManager.getById(active.items[localPlaylistIndex].sourceId);
            if (src) return src.name;
        }
        if (localVideo && localVideo.src && localVideo.src !== window.location.href) {
            const parts = localVideo.src.split("/");
            return parts[parts.length - 1] || "Video";
        }
        return "";
    }

    // ---- BIND EVENTS ----

    // Add URL
    $("vp-addUrl").addEventListener("click", () => {
        const input = $("vp-url") as HTMLInputElement;
        const url = input.value.trim();
        if (url) {
            sourceManager.addUrl(url);
            input.value = "";
            renderLibrary();
        }
    });

    ($("vp-url") as HTMLInputElement).addEventListener("keydown", (e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === "Enter") ($("vp-addUrl")).click();
    });

    // Add File
    $("vp-chooseFile").addEventListener("click", () => ($("vp-file") as HTMLInputElement).click());
    ($("vp-file") as HTMLInputElement).addEventListener("change", (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            sourceManager.addFile(input.files[0]);
            renderLibrary();
            input.value = "";
        }
    });

    // Screen Capture
    $("vp-capture").addEventListener("click", async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const track = stream.getVideoTracks()[0];
            const label = track?.label || "Screen Capture";
            const src = sourceManager.addCapture(stream, label);
            renderLibrary();
            onAddVideoLayer(src.url, src.name, stream);
        } catch {
            // User cancelled the capture picker
        }
    });

    // Webcam / Camera
    $("vp-webcam").addEventListener("click", async () => {
        try {
            // Enumerate cameras for the user to choose
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === "videoinput");

            let constraints: MediaStreamConstraints = { video: true, audio: true };
            if (cameras.length > 1) {
                // Let user pick camera
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
            const label = track?.label || "Webcam";
            const src = sourceManager.addCapture(stream, label);
            renderLibrary();
            onAddVideoLayer(src.url, src.name, stream);
        } catch {
            // User denied permission or cancelled
        }
    });

    // Playlist selector
    ($("vp-plSelect") as HTMLSelectElement).addEventListener("change", (e) => {
        playlistManager.setActive((e.target as HTMLSelectElement).value);
        renderPlaylist();
    });

    $("vp-plNew").addEventListener("click", () => {
        const name = prompt("Playlist name:", "New Playlist");
        if (name) {
            const pl = playlistManager.create(name);
            playlistManager.setActive(pl.id);
            renderPlaylistSelector();
            renderPlaylist();
        }
    });

    $("vp-plDel").addEventListener("click", () => {
        const active = playlistManager.getActive();
        if (active && playlistManager.getAll().length > 1) {
            playlistManager.remove(active.id);
            renderPlaylistSelector();
            renderPlaylist();
        }
    });

    $("vp-loop").addEventListener("click", () => {
        const active = playlistManager.getActive();
        if (active) {
            playlistManager.toggleLoop(active.id);
            renderPlaylist();
        }
    });

    // ---- AUDIO ROUTING ----
    const AUDIO_MODE_KEY = "mlmap:audioMode";
    let audioMode: "editor" | "output" | "both" =
        (localStorage.getItem(AUDIO_MODE_KEY) as "editor" | "output" | "both") || "editor";
    let userMuted = false;

    function applyAudioRouting(): void {
        if (localVideo) {
            localVideo.muted = userMuted || audioMode === "output";
        }
        bridge.send("SET_MUTED", { muted: userMuted || audioMode === "editor" });
        updateTransportUI();
    }

    function syncPlaybackToDisplay(): void {
        if (!localVideo) return;
        bridge.send("SEEK", { time: localVideo.currentTime });
        if (!localVideo.paused) {
            bridge.send("PLAY");
        } else {
            bridge.send("PAUSE");
        }
        bridge.send("SET_VOLUME", { volume: localVideo.volume });
        bridge.send("SET_MUTED", { muted: userMuted || audioMode === "editor" });
    }

    // ---- TRANSPORT CONTROLS (local + remote) ----
    $("tp-play").addEventListener("click", () => {
        // Auto-create video layer if needed
        if (!localVideo) {
            const active = playlistManager.getActive();
            if (active && active.items.length > 0) {
                const item = active.items[0];
                const src = sourceManager.getById(item.sourceId);
                if (src) {
                    onAddVideoLayer(src.url, src.name);
                    setTimeout(() => {
                        if (localVideo) {
                            userMuted = false;
                            applyAudioRouting();
                            loadPlaylistItem(0);
                            setTimeout(() => {
                                if (localVideo) localVideo.play().catch(() => {});
                                sendPlaylistToDisplay();
                                bridge.send("PLAY");
                                updateTransportUI();
                            }, 200);
                        }
                    }, 100);
                }
            }
            return;
        }

        if (localVideo.paused) {
            // User gesture: unmute according to audio routing
            userMuted = false;
            applyAudioRouting();
            // If no source loaded, load first playlist item
            if (!localVideo.src || localVideo.src === window.location.href) {
                const active = playlistManager.getActive();
                if (active && active.items.length > 0) {
                    loadPlaylistItem(0);
                    setTimeout(() => {
                        if (localVideo) localVideo.play().catch(() => {});
                        updateTransportUI();
                    }, 200);
                }
            } else {
                localVideo.play().catch(() => {});
            }
            bridge.send("PLAY");
            updateTransportUI();
        } else {
            localVideo.pause();
            bridge.send("PAUSE");
        }
    });

    $("tp-stop").addEventListener("click", () => {
        if (localVideo) {
            localVideo.pause();
            localVideo.currentTime = 0;
        }
        bridge.send("STOP");
        updateTransportUI();
    });

    $("tp-prev").addEventListener("click", () => localPrev());
    $("tp-next").addEventListener("click", () => localNext());

    $("tp-rw").addEventListener("click", () => {
        if (localVideo) {
            const t = Math.max(0, localVideo.currentTime - 10);
            localVideo.currentTime = t;
            bridge.send("SEEK", { time: t });
        }
    });

    $("tp-ff").addEventListener("click", () => {
        if (localVideo) {
            const t = localVideo.currentTime + 10;
            localVideo.currentTime = t;
            bridge.send("SEEK", { time: t });
        }
    });

    // Seek bar - use input event for live dragging
    const seekBar = $("tp-seek") as HTMLInputElement;
    let seekDragging = false;
    seekBar.addEventListener("pointerdown", () => { seekDragging = true; });
    seekBar.addEventListener("pointerup", () => { seekDragging = false; });
    seekBar.addEventListener("input", () => {
        if (localVideo && localVideo.duration > 0) {
            const time = (parseInt(seekBar.value) / 1000) * localVideo.duration;
            localVideo.currentTime = time;
            bridge.send("SEEK", { time });
        }
    });

    // Volume & Mute
    ($("tp-vol") as HTMLInputElement).addEventListener("input", (e) => {
        const vol = parseInt((e.target as HTMLInputElement).value) / 100;
        if (localVideo) localVideo.volume = vol;
        bridge.send("SET_VOLUME", { volume: vol });
    });

    $("tp-mute").addEventListener("click", () => {
        userMuted = !userMuted;
        applyAudioRouting();
    });

    // Set initial audio routing selector from saved preference
    ($("tp-audioOut") as HTMLSelectElement).value = audioMode;

    ($("tp-audioOut") as HTMLSelectElement).addEventListener("change", (e) => {
        audioMode = (e.target as HTMLSelectElement).value as "editor" | "output" | "both";
        localStorage.setItem(AUDIO_MODE_KEY, audioMode);
        applyAudioRouting();
    });

    function setActiveVideo(video: HTMLVideoElement): void {
        // Mute old active video
        if (localVideo && localVideo !== video) localVideo.muted = true;
        localVideo = video;
        video.addEventListener("timeupdate", updateTransportUI);
        video.addEventListener("play", () => {
            if (localVideo === video) applyAudioRouting();
            updateTransportUI();
        });
        video.addEventListener("pause", updateTransportUI);
        video.addEventListener("ended", onLocalVideoEnded);
        video.addEventListener("loadedmetadata", updateTransportUI);
        applyAudioRouting();
    }

    // Stop key propagation from panel inputs
    mediaContainer.addEventListener("keydown", (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") e.stopPropagation();
    });

    // ---- UI UPDATE (reads from local video) ----
    function updateTransportUI(): void {
        const v = localVideo;
        const playing = v ? !v.paused : false;
        const currentTime = v?.currentTime || 0;
        const duration = v?.duration || 0;

        ($("tp-play") as HTMLButtonElement).innerHTML = playing ? "&#9646;&#9646;" : "&#9654;";

        if (duration > 0 && !seekDragging) {
            seekBar.value = String(Math.round((currentTime / duration) * 1000));
        }

        ($("tp-time")).textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;

        const name = getCurrentSourceName();
        ($("tp-now")).textContent = name || "No media";

        if (v) {
            ($("tp-vol") as HTMLInputElement).value = String(Math.round(v.volume * 100));
            const muteBtn = $("tp-mute") as HTMLButtonElement;
            muteBtn.textContent = userMuted ? "M" : "\u266A";
            muteBtn.style.color = userMuted ? "#f55" : "#ccc";
        }
    }

    // ---- RENDERING ----
    function renderLibrary(): void {
        const el = $("vp-library");
        if (!el) return;
        const sources = sourceManager.getAll();
        el.innerHTML = "";
        if (sources.length === 0) {
            el.innerHTML = '<div style="color:#555;font-size:11px;padding:4px;">No media added yet</div>';
            return;
        }
        sources.forEach(src => {
            const row = document.createElement("div");
            row.className = "mlmap-media-item";

            const name = document.createElement("span");
            name.className = "name";
            name.textContent = src.type === "capture" ? `[LIVE] ${src.name}` : src.name;
            name.title = src.type === "capture" ? "Screen capture" : src.url;
            if (src.type === "capture") name.style.color = "#5f5";

            const btns = document.createElement("span");
            btns.style.cssText = "display:flex;gap:2px;flex-shrink:0;";

            const layerBtn = document.createElement("button");
            layerBtn.className = "mlmap-btn";
            layerBtn.textContent = "Layer";
            layerBtn.title = "Create video layer";
            layerBtn.style.cssText = "font-size:10px;padding:2px 4px;";
            layerBtn.addEventListener("click", () => {
                const stream = sourceManager.getStream(src.id);
                onAddVideoLayer(src.url, src.name, stream);
            });

            // Only show +PL for non-capture sources
            const plBtn = document.createElement("button");
            if (src.type !== "capture") {
                plBtn.className = "mlmap-btn";
                plBtn.textContent = "+PL";
                plBtn.title = "Add to playlist";
                plBtn.style.cssText = "font-size:10px;padding:2px 4px;";
                plBtn.addEventListener("click", () => {
                    const active = playlistManager.getActive();
                    if (active) {
                        playlistManager.addItem(active.id, src.id);
                        renderPlaylist();
                    }
                });
            }

            const delBtn = document.createElement("button");
            delBtn.className = "mlmap-btn";
            delBtn.textContent = "x";
            delBtn.title = "Remove";
            delBtn.style.cssText = "font-size:10px;padding:2px 4px;color:#f55;";
            delBtn.addEventListener("click", () => {
                sourceManager.remove(src.id);
                renderLibrary();
            });

            btns.appendChild(layerBtn);
            btns.appendChild(plBtn);
            btns.appendChild(delBtn);
            row.appendChild(name);
            row.appendChild(btns);
            el.appendChild(row);
        });
    }

    function renderPlaylistSelector(): void {
        const sel = $("vp-plSelect") as HTMLSelectElement;
        if (!sel) return;
        const playlists = playlistManager.getAll();
        const active = playlistManager.getActive();
        sel.innerHTML = "";
        playlists.forEach(pl => {
            const opt = document.createElement("option");
            opt.value = pl.id;
            opt.textContent = pl.name;
            if (active && active.id === pl.id) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    function renderPlaylist(): void {
        const el = $("vp-playlist");
        if (!el) return;
        const active = playlistManager.getActive();
        el.innerHTML = "";
        if (!active) return;

        ($("vp-loop") as HTMLButtonElement).textContent = `Loop: ${active.loop ? "ON" : "OFF"}`;

        if (active.items.length === 0) {
            el.innerHTML = '<div style="color:#555;font-size:11px;padding:4px;">Playlist empty</div>';
            return;
        }

        active.items.forEach((item, idx) => {
            const src = sourceManager.getById(item.sourceId);
            const row = document.createElement("div");
            row.className = "mlmap-pl-item";

            const label = document.createElement("span");
            label.className = "name";
            label.textContent = `${idx + 1}. ${src?.name || "Unknown"}`;

            const btns = document.createElement("span");
            btns.style.cssText = "display:flex;gap:1px;flex-shrink:0;";

            const upBtn = document.createElement("button");
            upBtn.className = "mlmap-btn";
            upBtn.innerHTML = "&#9650;";
            upBtn.style.cssText = "font-size:8px;padding:1px 3px;";
            upBtn.addEventListener("click", () => { playlistManager.moveItem(active.id, item.id, "up"); renderPlaylist(); });

            const downBtn = document.createElement("button");
            downBtn.className = "mlmap-btn";
            downBtn.innerHTML = "&#9660;";
            downBtn.style.cssText = "font-size:8px;padding:1px 3px;";
            downBtn.addEventListener("click", () => { playlistManager.moveItem(active.id, item.id, "down"); renderPlaylist(); });

            const delBtn = document.createElement("button");
            delBtn.className = "mlmap-btn";
            delBtn.textContent = "x";
            delBtn.style.cssText = "font-size:9px;padding:1px 3px;color:#f55;";
            delBtn.addEventListener("click", () => { playlistManager.removeItem(active.id, item.id); renderPlaylist(); });

            btns.appendChild(upBtn);
            btns.appendChild(downBtn);
            btns.appendChild(delBtn);
            row.appendChild(label);
            row.appendChild(btns);
            el.appendChild(row);
        });
    }

    function sendPlaylistToDisplay(): void {
        const active = playlistManager.getActive();
        if (!active) return;
        const items = active.items.map(item => {
            const src = sourceManager.getById(item.sourceId);
            return { url: src?.url || "", name: src?.name || "Unknown" };
        }).filter(i => i.url);
        bridge.send("LOAD_PLAYLIST", { items, loop: active.loop, startIndex: localPlaylistIndex });
    }

    function togglePlayPause(): void {
        // Simulate clicking the play button (handles all the logic)
        ($("tp-play") as HTMLButtonElement).click();
    }

    // ---- INIT ----
    renderLibrary();
    renderPlaylistSelector();
    renderPlaylist();

    return {
        sourceManager,
        playlistManager,
        sendPlaylistToDisplay,
        syncPlaybackToDisplay,
        registerVideoElement,
        setActiveVideo,
        getActiveVideo: () => localVideo,
        togglePlayPause,
    };
}
