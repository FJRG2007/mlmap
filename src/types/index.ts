export type Point = [number, number];

export interface Layer {
    overlay?: HTMLElement | null;
    visible: boolean;
    element: HTMLElement;
    width: number;
    height: number;
    sourcePoints: Point[];
    targetPoints: Point[];
};

export interface MLMapConfig {
    labels?: boolean;
    crosshairs?: boolean;
    screenbounds?: boolean;
    autoSave?: boolean;
    autoLoad?: boolean;
    layers?: (HTMLElement | string)[];
    onchange?: () => void;
};

export interface Shape {
    id: string;
    type: "square" | "circle" | "triangle";
    x: number;
    y: number;
};

export type Workspace = {
    id: string;
    name: string;
    version: string;
    layout: any;
};

// ---- Video & Channel Types ----

export interface VideoSource {
    id: string;
    name: string;
    url: string;
    type: "url" | "file" | "capture";
}

export interface PlaylistItem {
    id: string;
    sourceId: string;
    order: number;
}

export interface Playlist {
    id: string;
    name: string;
    items: PlaylistItem[];
    loop: boolean;
}

export interface VideoState {
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    currentName: string | null;
    playlistIndex: number;
    isFullscreen: boolean;
}

export type ChannelMessageType =
    | "PLAY" | "PAUSE" | "STOP" | "SEEK" | "NEXT" | "PREVIOUS"
    | "LOAD_VIDEO" | "LOAD_PLAYLIST"
    | "SET_VOLUME" | "SET_MUTED"
    | "UPDATE_LAYOUT" | "ADD_LAYER" | "REMOVE_LAYER"
    | "FULLSCREEN_ENTER" | "FULLSCREEN_EXIT"
    | "SEND_VIDEO_DATA"
    | "PING"
    | "DISPLAY_READY" | "PONG" | "SYNC_RESPONSE"
    | "INIT_STATE"
    | "DISPLAY_RESIZE";

export interface ChannelMessage {
    type: ChannelMessageType;
    payload?: any;
    timestamp: number;
}

export interface ManagedLayer {
    id: string;
    name: string;
    type: "shape" | "video" | "iframe";
    shapeType?: "square" | "circle" | "triangle";
    videoUrl?: string;
    iframeUrl?: string;
    clipTo?: string;
    width: number;
    height: number;
}

export interface WorkflowData {
    version: string;
    name: string;
    timestamp: number;
    workspace: {
        id: string;
        name: string;
        layout: any;
    };
    managedLayers: ManagedLayer[];
    videoSources: VideoSource[];
    playlists: Playlist[];
    activePlaylistId: string | null;
}
