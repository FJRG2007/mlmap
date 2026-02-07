import { DisplayRenderer } from "./renderer";

function init(): void {
    const overlay = document.getElementById("activate-overlay");

    if (overlay) {
        overlay.addEventListener("click", () => {
            overlay.classList.add("hidden");
            document.documentElement.requestFullscreen().catch(() => {
                console.log("MLMap Display: Fullscreen not available, continuing without it.");
            });
        });
        // Re-show overlay when fullscreen is lost (e.g., file dialog or Alt+Tab)
        document.addEventListener("fullscreenchange", () => {
            if (!document.fullscreenElement && overlay.classList.contains("hidden")) {
                (overlay.querySelector("span") as HTMLElement).textContent = "Click to re-enter fullscreen";
                overlay.classList.remove("hidden");
            }
        });
    }

    try {
        new DisplayRenderer();
        console.log("MLMap Display: Renderer initialized.");
    } catch (e) {
        console.error("MLMap Display: Failed to initialize renderer.", e);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
