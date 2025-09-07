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