import { ChannelMessageType, ChannelMessage } from "../types";

export const CHANNEL_NAME = "mlmap-sync";
export const HEARTBEAT_INTERVAL = 2000;
export const SYNC_INTERVAL = 500;
export const HEARTBEAT_TIMEOUT = 6000;

export function createMessage(type: ChannelMessageType, payload?: any): ChannelMessage {
    return { type, payload, timestamp: Date.now() };
}
