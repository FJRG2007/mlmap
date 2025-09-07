import { Layer, Point } from "../types";

export function getFreePosition(width: number, height: number, layers: Layer[] = []): [number, number] {
    let x = 0, y = 0, tries = 0, maxTries = 100;
    let overlap: boolean;

    do {
        overlap = false;
        x = Math.random() * (window.innerWidth - width);
        y = Math.random() * (window.innerHeight - height);

        for (let l of layers) {
            const rect = [
                Math.min(...l.targetPoints.map(p => p[0])),
                Math.min(...l.targetPoints.map(p => p[1])),
                Math.max(...l.targetPoints.map(p => p[0])),
                Math.max(...l.targetPoints.map(p => p[1]))
            ];
            if (!(x + width < rect[0] || x > rect[2] || y + height < rect[1] || y > rect[3])) {
                overlap = true;
                break;
            }
        }
        tries++;
    } while (overlap && tries < maxTries);

    return [x, y];
};

export function clonePoints(points: number[][]): Point[] {
    return points.map(p => p.slice(0, 2) as Point);
};

export function distanceTo(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x2 - x1, y2 - y1);
};