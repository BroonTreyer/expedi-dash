import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- Cleanup any service worker / cache left over from previous PWA setup ---
// Runs in ALL contexts (preview, editor, production) because the app no longer
// uses a service worker. Anyone who installed the old SW will be cleared and
// reloaded once so they immediately get the fresh version.
const clearServiceWorkerState = async () => {
  let hadState = false;

  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      hadState ||= regs.length > 0;
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    } catch {
      /* ignore */
    }
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      hadState ||= keys.length > 0;
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    } catch {
      /* ignore */
    }
  }

  return hadState;
};

const PURGE_FLAG = "__sw_purge_reloaded_v1";
clearServiceWorkerState()
  .then((hadState) => {
    try {
      if (hadState && !sessionStorage.getItem(PURGE_FLAG)) {
        sessionStorage.setItem(PURGE_FLAG, "1");
        window.location.reload();
      }
    } catch {
      if (hadState) window.location.reload();
    }
  })
  .catch(() => {});

// --- Auto-recover from white-screen caused by stale chunk references ---
// When a deploy invalidates chunks the cached index.html points at,
// dynamic imports throw. Reload once after clearing caches/SWs.
const RELOAD_FLAG = "__chunk_reload_attempt";
const isChunkLoadError = (msg: string) =>
  /Loading chunk [\d]+ failed/i.test(msg) ||
  /Failed to fetch dynamically imported module/i.test(msg) ||
  /Importing a module script failed/i.test(msg) ||
  /ChunkLoadError/i.test(msg);

const recoverFromChunkError = async () => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return; // avoid loop
    sessionStorage.setItem(RELOAD_FLAG, "1");
    await clearServiceWorkerState();
  } catch {
    /* ignore */
  } finally {
    window.location.reload();
  }
};

window.addEventListener("error", (event) => {
  const msg = event?.message || event?.error?.message || "";
  if (isChunkLoadError(msg)) {
    event.preventDefault();
    recoverFromChunkError();
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const reason: any = event?.reason;
  const msg =
    typeof reason === "string"
      ? reason
      : reason?.message || reason?.toString?.() || "";
  if (isChunkLoadError(msg)) {
    event.preventDefault();
    recoverFromChunkError();
  }
});

setTimeout(() => {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}, 4000);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
