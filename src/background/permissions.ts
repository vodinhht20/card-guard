import { isDetectionOrigin } from "../core/detection";
export async function syncDetectionScripts(): Promise<void> {
  const grants = (await chrome.permissions.getAll()).origins ?? [];
  const origins = grants.filter(isDetectionOrigin);
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  if (scripts.length)
    await chrome.scripting.unregisterContentScripts({
      ids: scripts.map((s) => s.id),
    });
  if (origins.length)
    await chrome.scripting.registerContentScripts([
      {
        id: "cardguard-detection",
        matches: origins,
        js: ["content.js"],
        runAt: "document_idle",
        allFrames: false,
        persistAcrossSessions: true,
      },
    ]);
}
