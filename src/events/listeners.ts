import { checkLatestVersion } from "../utils/remote";

document.addEventListener("DOMContentLoaded", async () => {
    const versionInfo = await checkLatestVersion();
    console.log(`Current version: ${versionInfo.current}`);
    console.log(`Latest version: ${versionInfo.latest}`);
    if (versionInfo.requireUpdate) console.log("A new version is available!");
});