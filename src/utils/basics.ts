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

export const solve = (() => {
    function r(t: any, nArr: any, o: number, eFunc: any) {
        if (o === nArr.length - 1) return eFunc(t);
        let f: any;
        const u = nArr[o];
        const cArr = Array(u);
        for (f = u - 1; f >= 0; --f) cArr[f] = r(t[f], nArr, o + 1, eFunc);
        return cArr;
    };
    function tfn(rObj: any) {
        const res: number[] = [];
        while (typeof rObj === "object") {
            res.push(rObj.length);
            rObj = rObj[0];
        }
        return res;
    };
    function nfn(rObj: any) {
        let n: any, o: any;
        if (typeof rObj === "object") {
            n = rObj[0];
            if (typeof n === "object") {
                o = n[0];
                return (typeof o === "object") ? tfn(rObj) : [rObj.length, n.length];
            }
            return [rObj.length];
        }
        return [];
    };
    function ofn(rArr: any[]) {
        let i: number;
        const n = rArr.length;
        const out = Array(n);
        for (i = n - 1; i >= 0; --i) out[i] = rArr[i];
        return out;
    };
    function efn(tVal: any) {
        return typeof tVal !== "object" ? tVal : r(tVal, nfn(tVal), 0, ofn);
    };
    function ffn(rArr: any, tFlag?: boolean) {
        tFlag = tFlag || false;
        let n: any, o: any, fVar: any, uVar: any, a: any, h: any, i: any, l: any, g: any;
        let v = rArr.length;
        const y = v - 1;
        const b = new Array(v);
        if (!tFlag) rArr = efn(rArr);
        for (fVar = 0; fVar < v; ++fVar) {
            i = fVar;
            h = rArr[fVar];
            g = c(h[fVar]);
            for (o = fVar + 1; o < v; ++o) {
                uVar = c(rArr[o][fVar]);
                if (uVar > g) { g = uVar; i = o; }
            }
            b[fVar] = i;
            if (i != fVar) { rArr[fVar] = rArr[i]; rArr[i] = h; h = rArr[fVar]; }
            a = h[fVar];
            for (n = fVar + 1; n < v; ++n) rArr[n][fVar] /= a;
            for (n = fVar + 1; n < v; ++n) {
                l = rArr[n];
                for (o = fVar + 1; o < y; ++o) { l[o] -= l[fVar] * h[o]; ++o; l[o] -= l[fVar] * h[o]; }
                if (o === y) l[o] -= l[fVar] * h[o];
            }
        }
        return { LU: rArr, P: b };
    };
    function ufn(rObj: any, tArr: any) {
        let n: any, o: any, fVar: any, uVar: any, cVar: any;
        const a = rObj.LU;
        const h = a.length;
        const iArr = efn(tArr);
        const lArr = rObj.P;
        for (n = h - 1; n >= 0; --n) iArr[n] = tArr[n];
        for (n = 0; n < h; ++n) {
            fVar = lArr[n];
            if (lArr[n] !== n) { cVar = iArr[n]; iArr[n] = iArr[fVar]; iArr[fVar] = cVar; }
            uVar = a[n];
            for (o = 0; o < n; ++o) iArr[n] -= iArr[o] * uVar[o];
        }
        for (n = h - 1; n >= 0; --n) {
            uVar = a[n];
            for (o = n + 1; o < h; ++o) iArr[n] -= iArr[o] * uVar[o];
            iArr[n] /= uVar[n];
        }
        return iArr;
    };
    const c = Math.abs;
    return function (rMat: any, bVec: any, nOpt?: any) {
        return ufn(ffn(rMat, nOpt), bVec);
    };
})();