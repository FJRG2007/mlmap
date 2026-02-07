import { solve } from "./basics";

export function computeTransformMatrix(sourcePoints: number[][], targetPoints: number[][]): string {
    const a: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < sourcePoints.length; i++) {
        const s = sourcePoints[i];
        const t = targetPoints[i];
        a.push([s[0], s[1], 1, 0, 0, 0, -s[0] * t[0], -s[1] * t[0]]);
        b.push(t[0]);
        a.push([0, 0, 0, s[0], s[1], 1, -s[0] * t[1], -s[1] * t[1]]);
        b.push(t[1]);
    }
    const X = solve(a, b, true);
    return `matrix3d(${X[0]},${X[3]},0,${X[6]},${X[1]},${X[4]},0,${X[7]},0,0,1,0,${X[2]},${X[5]},0,1)`;
}

export function applyTransform(element: HTMLElement, sourcePoints: number[][], targetPoints: number[][]): void {
    element.style.transform = computeTransformMatrix(sourcePoints, targetPoints);
    element.style.transformOrigin = "0px 0px 0px";
}
