/**
 * VideoWindowRenderer - renders a background video through shape "windows"
 *
 * The video is conceptually covering the entire screen. Each video-window layer
 * acts as a hole/window that reveals the portion of the video at that position.
 * The rest of the screen stays black. Uses canvas clip paths for rendering.
 */
export class VideoWindowRenderer {
    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private running = false;
    private rafId = 0;
    private getWindowTargetPoints: () => Array<{ targetPoints: number[][] }>;

    constructor(getWindowTargetPoints: () => Array<{ targetPoints: number[][] }>) {
        this.getWindowTargetPoints = getWindowTargetPoints;

        this.canvas = document.createElement("canvas");
        this.canvas.style.position = "fixed";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.zIndex = "1";
        this.canvas.style.pointerEvents = "none";
        document.body.appendChild(this.canvas);

        this.video = document.createElement("video");
        this.video.style.display = "none";
        this.video.crossOrigin = "anonymous";
        this.video.playsInline = true;
        this.video.loop = true;
        document.body.appendChild(this.video);

        this.ctx = this.canvas.getContext("2d")!;

        window.addEventListener("resize", () => this.resize());
        this.resize();
    }

    get videoElement(): HTMLVideoElement { return this.video; }
    get canvasElement(): HTMLCanvasElement { return this.canvas; }

    resize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setSource(url: string): void {
        this.video.src = url;
        this.video.load();
    }

    hasSource(): boolean {
        return !!this.video.src && this.video.src !== window.location.href;
    }

    play(): void {
        this.video.play().catch(() => {});
        if (!this.running) {
            this.running = true;
            this.render();
        }
    }

    pause(): void {
        this.video.pause();
    }

    stop(): void {
        this.video.pause();
        this.video.currentTime = 0;
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    destroy(): void {
        this.stop();
        this.canvas.remove();
        this.video.remove();
    }

    private render(): void {
        if (!this.running) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        if (this.video.readyState >= 2) {
            const layers = this.getWindowTargetPoints();
            for (const layer of layers) {
                const pts = layer.targetPoints;
                if (!pts || pts.length < 3) continue;

                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    this.ctx.lineTo(pts[i][0], pts[i][1]);
                }
                this.ctx.closePath();
                this.ctx.clip();
                // Draw video scaled to fill the entire screen
                this.ctx.drawImage(this.video, 0, 0, w, h);
                this.ctx.restore();
            }
        }

        this.rafId = requestAnimationFrame(() => this.render());
    }
}
