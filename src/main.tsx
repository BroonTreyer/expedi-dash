import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- PWA service-worker guards ---
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const hostname = window.location.hostname;
const isPreviewHost =
  hostname.includes("id-preview--") ||
  hostname.includes("lovableproject.com") ||
  hostname.includes("lovable.app") ||
  hostname.includes("lovable.dev") ||
  hostname === "localhost" ||
  hostname === "127.0.0.1";

const isEditorContext = isPreviewHost || isInIframe;

const clearServiceWorkerState = async () => {
  let hadState = false;

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    hadState ||= regs.length > 0;
    await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    hadState ||= keys.length > 0;
    await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
  }

  return hadState;
};

// Hard-block SW registration inside editor/preview/iframe contexts.
// vite-plugin-pwa calls navigator.serviceWorker.register; we shadow it.
if (isEditorContext && "serviceWorker" in navigator) {
  try {
    // Unregister any existing SWs and clear their caches. If a previous SW was
    // controlling this tab, one reload is required before the preview is fresh.
    clearServiceWorkerState().then((hadState) => {
      try {
        const flag = "__preview_sw_purge_reloaded";
        if (hadState && !sessionStorage.getItem(flag)) {
          sessionStorage.setItem(flag, "1");
          window.location.reload();
        }
      } catch {
        if (hadState) window.location.reload();
      }
    });
    // Prevent any future registration attempt (vite-plugin-pwa auto-register)
    const noopRegister = () =>
      Promise.reject(new Error("SW registration disabled in preview/iframe"));
    try {
      Object.defineProperty(navigator.serviceWorker, "register", {
        value: noopRegister,
        configurable: true,
        writable: true,
      });
    } catch {
      /* some browsers won't allow override; unregister loop above is enough */
    }
  } catch {
    /* ignore */
  }
}

// --- One-time cleanup for users stuck on a bad cached version ---
// Bumping this key forces a fresh cache wipe for all existing clients.
const CLEANUP_FLAG = "__sw_cleanup_v3";
if (!isEditorContext && typeof localStorage !== "undefined") {
  try {
    if (!localStorage.getItem(CLEANUP_FLAG)) {
      localStorage.setItem(CLEANUP_FLAG, "1");
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k).catch(() => {}));
        });
      }
    }
  } catch {
    /* ignore */
  }
}

// --- Auto-recover from white-screen caused by stale chunk references ---
// When a deploy invalidates the chunks the cached index.html points at,
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
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
    }
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

// Clear the reload flag once the app boots successfully (next tick after render)
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
