export interface ClipGroup {
    video: HTMLVideoElement;
    baseTargetPoints: number[][];
    masks: Array<{ targetPoints: number[][] }>;
}

export class ClipMaskRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private running = false;
    private rafId = 0;
    private getClipGroups: () => ClipGroup[];
    public zoom = 1;

    constructor(getClipGroups: () => ClipGroup[]) {
        this.getClipGroups = getClipGroups;

        this.canvas = document.createElement("canvas");
        this.canvas.style.position = "fixed";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.zIndex = "999999";
        this.canvas.style.pointerEvents = "none";

        this.ctx = this.canvas.getContext("2d")!;

        window.addEventListener("resize", () => this.resize());
        this.resize();
    }

    get canvasElement(): HTMLCanvasElement { return this.canvas; }

    resize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.render();
    }

    stop(): void {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    private render(): void {
        if (!this.running) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        const groups = this.getClipGroups();

        // Apply workspace zoom (same transform as MLMap canvas)
        if (this.zoom !== 1) {
            this.ctx.save();
            const cx = w / 2;
            const cy = h / 2;
            this.ctx.translate(cx, cy);
            this.ctx.scale(this.zoom, this.zoom);
            this.ctx.translate(-cx, -cy);
        }

        for (const group of groups) {
            const video = group.video;
            if (video.readyState < 2) continue;

            // Compute bounding box of the base layer's target points
            const basePts = group.baseTargetPoints;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of basePts) {
                if (p[0] < minX) minX = p[0];
                if (p[1] < minY) minY = p[1];
                if (p[0] > maxX) maxX = p[0];
                if (p[1] > maxY) maxY = p[1];
            }
            const bw = maxX - minX;
            const bh = maxY - minY;
            if (bw <= 0 || bh <= 0) continue;

            for (const mask of group.masks) {
                const pts = mask.targetPoints;
                if (!pts || pts.length < 3) continue;

                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    this.ctx.lineTo(pts[i][0], pts[i][1]);
                }
                this.ctx.closePath();
                this.ctx.clip();

                // Draw the video mapped to the base layer's bounding box
                this.ctx.drawImage(video, minX, minY, bw, bh);
                this.ctx.restore();
            }
        }

        if (this.zoom !== 1) {
            this.ctx.restore();
        }

        this.rafId = requestAnimationFrame(() => this.render());
    }
}
