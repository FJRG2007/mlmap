import { VERSION } from "../lib/data";

export async function checkLatestVersion(): Promise<{ current: string; latest: string; requireUpdate: boolean; }> {
    const CACHE_KEY = "mlmap:cache:checkLatestVersion";
    const CACHE_DURATION = 5 * 60 * 1000;
    const now = Date.now();
    const cachedString = localStorage.getItem(CACHE_KEY);
    let cachedData: { latest: string; timestamp: number; } | null = null;
    if (cachedString) try { cachedData = JSON.parse(cachedString); } catch { };
    
    if (cachedData && (now - cachedData.timestamp < CACHE_DURATION)) return { current: VERSION, latest: cachedData.latest, requireUpdate: cachedData.latest !== VERSION };

    const controller = new AbortController();
    const timeout = 5000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch("https://raw.githubusercontent.com/FJRG2007/mlmap/refs/heads/main/package.json", { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        cachedData = { latest: data.version, timestamp: now };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));

        return { current: VERSION, latest: data.version, requireUpdate: data.version !== VERSION };
    } catch {
        return { current: VERSION, latest: cachedData?.latest || VERSION, requireUpdate: false };
    };
};