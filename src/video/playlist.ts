import { Playlist, PlaylistItem } from "../types";

const STORAGE_KEY = "mlmap:playlists";
const ACTIVE_KEY = "mlmap:activePlaylist";

export class PlaylistManager {
    private playlists: Playlist[] = [];
    private activeId: string | null = null;
    private onChange: (() => void) | null = null;

    constructor() {
        this.load();
    }

    set onChanged(cb: (() => void) | null) { this.onChange = cb; }

    getAll(): Playlist[] { return [...this.playlists]; }

    getActive(): Playlist | null {
        return this.playlists.find(p => p.id === this.activeId) || this.playlists[0] || null;
    }

    setActive(id: string): void {
        this.activeId = id;
        localStorage.setItem(ACTIVE_KEY, id);
        this.notify();
    }

    create(name: string): Playlist {
        const playlist: Playlist = {
            id: `pl-${Date.now()}`,
            name,
            items: [],
            loop: true,
        };
        this.playlists.push(playlist);
        if (!this.activeId) this.activeId = playlist.id;
        this.save();
        this.notify();
        return playlist;
    }

    remove(id: string): void {
        this.playlists = this.playlists.filter(p => p.id !== id);
        if (this.activeId === id) {
            this.activeId = this.playlists[0]?.id || null;
        }
        this.save();
        this.notify();
    }

    addItem(playlistId: string, sourceId: string): void {
        const pl = this.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        const item: PlaylistItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sourceId,
            order: pl.items.length,
        };
        pl.items.push(item);
        this.save();
        this.notify();
    }

    removeItem(playlistId: string, itemId: string): void {
        const pl = this.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        pl.items = pl.items.filter(i => i.id !== itemId);
        pl.items.forEach((item, idx) => item.order = idx);
        this.save();
        this.notify();
    }

    moveItem(playlistId: string, itemId: string, direction: "up" | "down"): void {
        const pl = this.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        const idx = pl.items.findIndex(i => i.id === itemId);
        if (idx < 0) return;
        const newIdx = direction === "up" ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= pl.items.length) return;
        [pl.items[idx], pl.items[newIdx]] = [pl.items[newIdx], pl.items[idx]];
        pl.items.forEach((item, i) => item.order = i);
        this.save();
        this.notify();
    }

    toggleLoop(playlistId: string): void {
        const pl = this.playlists.find(p => p.id === playlistId);
        if (!pl) return;
        pl.loop = !pl.loop;
        this.save();
        this.notify();
    }

    private save(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.playlists));
        if (this.activeId) localStorage.setItem(ACTIVE_KEY, this.activeId);
    }

    private load(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.playlists = JSON.parse(stored);
            } else {
                this.create("Default");
            }
            this.activeId = localStorage.getItem(ACTIVE_KEY) || this.playlists[0]?.id || null;
        } catch {
            this.create("Default");
        }
    }

    private notify(): void {
        if (this.onChange) this.onChange();
    }
}
