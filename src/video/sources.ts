import { VideoSource } from "../types";

const STORAGE_KEY = "mlmap:videoSources";

export class VideoSourceManager {
    private sources: VideoSource[] = [];
    private onChange: (() => void) | null = null;
    private liveStreams: Map<string, MediaStream> = new Map();

    constructor() {
        this.load();
    }

    set onChanged(cb: (() => void) | null) { this.onChange = cb; }

    getAll(): VideoSource[] { return [...this.sources]; }

    getById(id: string): VideoSource | undefined {
        return this.sources.find(s => s.id === id);
    }

    getStream(sourceId: string): MediaStream | undefined {
        return this.liveStreams.get(sourceId);
    }

    addUrl(url: string, name?: string): VideoSource {
        const fileName = name || url.split("/").pop() || "video";
        const source: VideoSource = {
            id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: fileName,
            url,
            type: "url",
        };
        this.sources.push(source);
        this.save();
        this.notify();
        return source;
    }

    addFile(file: File): VideoSource {
        const blobUrl = URL.createObjectURL(file);
        const source: VideoSource = {
            id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            url: blobUrl,
            type: "file",
        };
        this.sources.push(source);
        this.notify();
        return source;
    }

    addCapture(stream: MediaStream, name: string): VideoSource {
        const id = `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const source: VideoSource = {
            id,
            name,
            url: `capture:${id}`,
            type: "capture",
        };
        this.liveStreams.set(id, stream);
        this.sources.push(source);

        // Clean up when all tracks end
        const tracks = stream.getTracks();
        const checkEnded = () => {
            if (tracks.every(t => t.readyState === "ended")) {
                this.liveStreams.delete(id);
            }
        };
        tracks.forEach(t => t.addEventListener("ended", checkEnded));

        this.notify();
        return source;
    }

    remove(id: string): void {
        const idx = this.sources.findIndex(s => s.id === id);
        if (idx >= 0) {
            const src = this.sources[idx];
            if (src.type === "file" && src.url.startsWith("blob:")) {
                URL.revokeObjectURL(src.url);
            }
            if (src.type === "capture") {
                const stream = this.liveStreams.get(id);
                if (stream) {
                    stream.getTracks().forEach(t => t.stop());
                    this.liveStreams.delete(id);
                }
            }
            this.sources.splice(idx, 1);
            this.save();
            this.notify();
        }
    }

    private save(): void {
        const persistable = this.sources.filter(s => s.type === "url");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    }

    private load(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) this.sources = JSON.parse(stored);
        } catch {
            this.sources = [];
        }
    }

    private notify(): void {
        if (this.onChange) this.onChange();
    }
}
