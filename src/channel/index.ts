import { ChannelMessage, ChannelMessageType } from "../types";
import { CHANNEL_NAME, HEARTBEAT_INTERVAL, HEARTBEAT_TIMEOUT, createMessage } from "./protocol";

export type ChannelRole = "control" | "display";

export class ChannelBridge {
    private channel: BroadcastChannel;
    private role: ChannelRole;
    private listeners: Map<ChannelMessageType, ((payload: any) => void)[]> = new Map();
    private heartbeatTimer: number | null = null;
    private lastPong: number = 0;
    private _connected: boolean = false;
    private onConnectionChange: ((connected: boolean) => void) | null = null;

    constructor(role: ChannelRole) {
        this.role = role;
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (e: MessageEvent<ChannelMessage>) => this.handleMessage(e.data);

        if (role === "control") {
            this.startHeartbeat();
        }
        if (role === "display") {
            this.on("PING", () => this.send("PONG"));
            // Small delay to ensure control's listener is ready
            setTimeout(() => this.send("DISPLAY_READY"), 100);
        }
    }

    get connected(): boolean { return this._connected; }

    set onConnectionChanged(cb: ((connected: boolean) => void) | null) {
        this.onConnectionChange = cb;
    }

    send(type: ChannelMessageType, payload?: any): void {
        try {
            this.channel.postMessage(createMessage(type, payload));
        } catch (e) {
            console.warn("ChannelBridge: Failed to send message", type, e);
        }
    }

    on(type: ChannelMessageType, callback: (payload: any) => void): void {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type)!.push(callback);
    }

    off(type: ChannelMessageType, callback: (payload: any) => void): void {
        const cbs = this.listeners.get(type);
        if (cbs) {
            const idx = cbs.indexOf(callback);
            if (idx >= 0) cbs.splice(idx, 1);
        }
    }

    destroy(): void {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.channel.close();
        this.listeners.clear();
    }

    private handleMessage(msg: ChannelMessage): void {
        if (msg.type === "PONG" || msg.type === "DISPLAY_READY") {
            this.lastPong = Date.now();
            this.setConnected(true);
        }
        const cbs = this.listeners.get(msg.type);
        if (cbs) cbs.forEach(cb => cb(msg.payload));
    }

    private startHeartbeat(): void {
        this.heartbeatTimer = window.setInterval(() => {
            this.send("PING");
            if (this._connected && Date.now() - this.lastPong > HEARTBEAT_TIMEOUT) {
                this.setConnected(false);
            }
        }, HEARTBEAT_INTERVAL);
    }

    private setConnected(val: boolean): void {
        if (this._connected !== val) {
            this._connected = val;
            if (this.onConnectionChange) this.onConnectionChange(val);
        }
    }
}
