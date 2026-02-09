import { ChannelBridge } from "../channel";
import { VideoState, ManagedLayer } from "../types";
import { applyTransform } from "../utils/transform";
import { SYNC_INTERVAL } from "../channel/protocol";
import { ClipMaskRenderer, ClipGroup } from "../video/clipMaskRenderer";

export class DisplayRenderer {
    private bridge: ChannelBridge;
    private layers: Map<string, HTMLElement> = new Map();
    private layerInfos: Map<string, ManagedLayer> = new Map();
    private videoElements: Map<string, HTMLVideoElement> = new Map();
    private activeVideo: HTMLVideoElement | null = null;
    private playlist: { url: string; name: string }[] = [];
    private playlistIndex: number = 0;
    private playlistLoop: boolean = true;
    private currentName: string | null = null;
    private syncTimer: number;
    private clipMaskRenderer: ClipMaskRenderer;
    private layoutData: any[] = [];
    private streamPCs: Map<string, RTCPeerConnection> = new Map();

    constructor() {
        this.bridge = new ChannelBridge("display");

        this.clipMaskRenderer = new ClipMaskRenderer(() => this.getClipGroups());
        document.body.appendChild(this.clipMaskRenderer.canvasElement);

        this.bindCommands();
        this.syncTimer = window.setInterval(() => {
            this.bridge.send("SYNC_RESPONSE", this.getState());
        }, SYNC_INTERVAL);

        // Send display size to editor on resize and fullscreen changes
        const sendResize = () => {
            this.bridge.send("DISPLAY_RESIZE", { width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener("resize", sendResize);
        document.addEventListener("fullscreenchange", sendResize);
    }

    private getClipGroups(): ClipGroup[] {
        const groups: ClipGroup[] = [];
        const grouped = new Map<string, { video: HTMLVideoElement; baseTargetPoints: number[][]; masks: Array<{ targetPoints: number[][] }> }>();

        for (const [id, info] of this.layerInfos) {
            if (!info.clipTo) continue;
            const baseVideo = this.videoElements.get(info.clipTo);
            if (!baseVideo) continue;

            const baseLayout = this.layoutData.find((l: any) => l.id === info.clipTo);
            const maskLayout = this.layoutData.find((l: any) => l.id === id);
            if (!baseLayout?.targetPoints || !maskLayout?.targetPoints) continue;

            if (!grouped.has(info.clipTo)) {
                grouped.set(info.clipTo, {
                    video: baseVideo,
                    baseTargetPoints: baseLayout.targetPoints,
                    masks: []
                });
            }
            grouped.get(info.clipTo)!.masks.push({
                targetPoints: maskLayout.targetPoints
            });
        }

        for (const g of grouped.values()) groups.push(g);
        return groups;
    }

    private updateClipMaskState(): void {
        const hiddenBases = new Set<string>();
        for (const [id, info] of this.layerInfos) {
            if (!info.clipTo) continue;
            const el = this.layers.get(id);
            if (el) el.style.opacity = "0";
            hiddenBases.add(info.clipTo);
        }
        for (const baseId of hiddenBases) {
            const el = this.layers.get(baseId);
            if (el) el.style.opacity = "0";
            // Auto-play base video so the ClipMaskRenderer canvas has frames to draw
            const video = this.videoElements.get(baseId);
            if (video && video.paused && video.src && video.src !== window.location.href) {
                video.play().catch(() => {});
            }
        }
        if (hiddenBases.size > 0) this.clipMaskRenderer.start();
        else this.clipMaskRenderer.stop();
    }

    private getState(): VideoState {
        const v = this.activeVideo;
        return {
            playing: v ? !v.paused : false,
            currentTime: v?.currentTime || 0,
            duration: v?.duration || 0,
            volume: v?.volume || 1,
            muted: v?.muted ?? true,
            currentName: this.currentName,
            playlistIndex: this.playlistIndex,
            isFullscreen: !!document.fullscreenElement,
        };
    }

    private bindCommands(): void {
        this.bridge.on("ADD_LAYER", (p: ManagedLayer) => {
            if (this.layers.has(p.id)) {
                // Layer already exists — update info (e.g. clipTo changed)
                this.layerInfos.set(p.id, p);
                this.updateClipMaskState();
                return;
            }
            this.layerInfos.set(p.id, p);
            const el = this.createLayerElement(p);
            document.body.appendChild(el);
            this.layers.set(p.id, el);
            this.updateClipMaskState();
        });

        this.bridge.on("REMOVE_LAYER", (p: { id: string }) => {
            const pc = this.streamPCs.get(p.id);
            if (pc) { pc.close(); this.streamPCs.delete(p.id); }
            const el = this.layers.get(p.id);
            if (el) {
                el.remove();
                this.layers.delete(p.id);
                this.layerInfos.delete(p.id);
                this.videoElements.delete(p.id);
            }
            this.updateClipMaskState();
        });

        this.bridge.on("UPDATE_LAYOUT", (p: { layout: any[] }) => {
            if (!p.layout) return;
            this.layoutData = p.layout;
            for (const item of p.layout) {
                const el = this.layers.get(item.id);
                const info = this.layerInfos.get(item.id);
                // Don't apply CSS transform to clip mask shapes (canvas renders them)
                if (info && info.clipTo) continue;
                if (el && item.sourcePoints && item.targetPoints) {
                    applyTransform(el, item.sourcePoints, item.targetPoints);
                }
            }
            this.updateClipMaskState();
        });

        this.bridge.on("LOAD_PLAYLIST", (p) => {
            this.playlist = p.items || [];
            this.playlistLoop = p.loop ?? true;
            this.playlistIndex = p.startIndex || 0;
            // Don't auto-load: video layers keep their own source
            // Playlist items load on PLAY (when no source), NEXT, or PREVIOUS
        });

        this.bridge.on("LOAD_VIDEO", (p) => {
            if (p.url && this.activeVideo) {
                this.currentName = p.name || null;
                this.activeVideo.src = p.url;
                this.activeVideo.load();
            }
        });

        this.bridge.on("PLAY", () => {
            if (this.activeVideo) {
                // If no source loaded yet, try loading from playlist
                if ((!this.activeVideo.src || this.activeVideo.src === window.location.href) && this.playlist.length > 0) {
                    this.loadCurrentItem();
                }
                this.activeVideo.play().catch(() => {});
            }
        });

        this.bridge.on("PAUSE", () => {
            if (this.activeVideo) this.activeVideo.pause();
        });

        this.bridge.on("STOP", () => {
            if (this.activeVideo) {
                this.activeVideo.pause();
                this.activeVideo.currentTime = 0;
            }
        });

        this.bridge.on("SEEK", (p) => {
            if (typeof p.time === "number") {
                if (this.activeVideo) this.activeVideo.currentTime = p.time;
            }
        });

        this.bridge.on("NEXT", () => this.next());
        this.bridge.on("PREVIOUS", () => this.previous());

        this.bridge.on("SET_VOLUME", (p) => {
            const vol = Math.max(0, Math.min(1, p.volume));
            if (this.activeVideo) this.activeVideo.volume = vol;
        });

        this.bridge.on("SET_MUTED", (p) => {
            if (typeof p.muted === "boolean") {
                if (this.activeVideo) this.activeVideo.muted = p.muted;
            }
        });

        this.bridge.on("FULLSCREEN_ENTER", () => {
            document.documentElement.requestFullscreen().catch(() => {});
        });

        this.bridge.on("FULLSCREEN_EXIT", () => {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        });

        this.bridge.on("SEND_VIDEO_DATA", (p: { layerId: string; data: ArrayBuffer; mimeType: string }) => {
            const video = this.videoElements.get(p.layerId);
            if (!video) return;
            const blob = new Blob([p.data], { type: p.mimeType || "video/mp4" });
            const url = URL.createObjectURL(blob);
            video.src = url;
            video.load();
            this.updateClipMaskState();
        });

        // Live stream (screen capture / webcam) via WebRTC (non-trickle ICE)
        this.bridge.on("RTC_OFFER", async (p: { layerId: string; sdp: RTCSessionDescriptionInit }) => {
            const oldPc = this.streamPCs.get(p.layerId);
            if (oldPc) oldPc.close();
            const pc = new RTCPeerConnection();
            this.streamPCs.set(p.layerId, pc);
            pc.ontrack = (e) => {
                const video = this.videoElements.get(p.layerId);
                if (video) {
                    video.srcObject = e.streams[0] || new MediaStream([e.track]);
                    video.autoplay = true;
                    video.play().catch(() => {});
                }
                this.updateClipMaskState();
            };
            await pc.setRemoteDescription(p.sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            // Wait for ICE gathering (fast for local connections)
            if (pc.iceGatheringState !== "complete") {
                await new Promise<void>(r => {
                    pc.addEventListener("icegatheringstatechange", () => {
                        if (pc.iceGatheringState === "complete") r();
                    });
                });
            }
            this.bridge.send("RTC_ANSWER", { layerId: p.layerId, sdp: pc.localDescription!.toJSON() });
        });

        this.bridge.on("INIT_STATE", (p) => {
            if (p.layers) {
                for (const layer of p.layers) {
                    if (!this.layers.has(layer.id)) {
                        this.layerInfos.set(layer.id, layer);
                        const el = this.createLayerElement(layer);
                        document.body.appendChild(el);
                        this.layers.set(layer.id, el);
                    }
                }
            }
            if (p.layout) {
                this.layoutData = p.layout;
                for (const item of p.layout) {
                    const el = this.layers.get(item.id);
                    const info = this.layerInfos.get(item.id);
                    if (info && info.clipTo) continue;
                    if (el && item.sourcePoints && item.targetPoints) {
                        applyTransform(el, item.sourcePoints, item.targetPoints);
                    }
                }
            }
            if (p.playlist) {
                this.playlist = p.playlist.items || [];
                this.playlistLoop = p.playlist.loop ?? true;
                this.playlistIndex = p.playlist.startIndex || 0;
            }
            this.updateClipMaskState();
        });
    }

    private createLayerElement(info: ManagedLayer): HTMLElement {
        const div = document.createElement("div");
        div.id = info.id;
        div.style.position = "fixed";
        div.style.top = "0px";
        div.style.left = "0px";
        div.style.width = info.width + "px";
        div.style.height = info.height + "px";
        div.style.overflow = "hidden";

        if (info.type === "video") {
            div.style.background = "#000";
            const video = document.createElement("video");
            if (info.videoUrl) video.src = info.videoUrl;
            video.style.width = "100%";
            video.style.height = "100%";
            video.style.objectFit = "contain";
            video.muted = true;
            video.playsInline = true;
            video.addEventListener("ended", () => this.onVideoEnded());
            div.appendChild(video);
            this.videoElements.set(info.id, video);
            this.activeVideo = video;
        } else if (info.type === "iframe" && info.iframeUrl) {
            div.style.background = "#000";
            const iframe = document.createElement("iframe");
            iframe.src = info.iframeUrl;
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "none";
            iframe.style.pointerEvents = "none";
            iframe.setAttribute("allow", "autoplay; encrypted-media");
            div.appendChild(iframe);
        } else if (info.type === "shape") {
            if (info.shapeType === "circle") {
                div.style.background = "white";
                div.style.borderRadius = "50%";
            } else if (info.shapeType === "triangle") {
                div.style.width = "0";
                div.style.height = "0";
                div.style.borderLeft = (info.width / 2) + "px solid transparent";
                div.style.borderRight = (info.width / 2) + "px solid transparent";
                div.style.borderBottom = info.height + "px solid white";
                div.style.background = "transparent";
            } else {
                div.style.background = "white";
            }
        }

        return div;
    }

    private loadCurrentItem(): void {
        if (!this.activeVideo || this.playlist.length === 0) return;
        const item = this.playlist[this.playlistIndex];
        if (!item) return;
        this.currentName = item.name;
        this.activeVideo.src = item.url;
        this.activeVideo.load();
    }

    private next(): void {
        if (this.playlist.length === 0) return;
        this.playlistIndex++;
        if (this.playlistIndex >= this.playlist.length) {
            this.playlistIndex = this.playlistLoop ? 0 : this.playlist.length - 1;
            if (!this.playlistLoop) return;
        }
        this.loadCurrentItem();
        if (this.activeVideo) this.activeVideo.play().catch(() => {});
    }

    private previous(): void {
        if (this.playlist.length === 0) return;
        this.playlistIndex--;
        if (this.playlistIndex < 0) {
            this.playlistIndex = this.playlistLoop ? this.playlist.length - 1 : 0;
            if (!this.playlistLoop) return;
        }
        this.loadCurrentItem();
        if (this.activeVideo) this.activeVideo.play().catch(() => {});
    }

    private onVideoEnded(): void {
        if (this.playlist.length > 0) this.next();
    }
}
