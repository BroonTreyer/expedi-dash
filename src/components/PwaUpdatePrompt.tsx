import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

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

const shouldRegisterPwa = !isPreviewHost && !isInIframe;

function PwaUpdateRegistrar() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Periodic check every 60 seconds — catches new deploys quickly
      const interval = setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 1000);

      const checkForUpdate = () => {
        registration.update().catch(() => {});
      };

      const onVisibility = () => {
        if (document.visibilityState === "visible") checkForUpdate();
      };

      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("focus", checkForUpdate);

      // Cleanup not strictly needed (component lives for app lifetime), but safe
      return () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("focus", checkForUpdate);
      };
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    // autoUpdate activated the new SW. The current page still runs old JS,
    // so force a reload to load fresh chunks. Brief toast for context.
    toast.success("Nova versão disponível", {
      description: "Recarregando o aplicativo...",
      duration: 1500,
    });
    setNeedRefresh(false);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, [needRefresh, setNeedRefresh]);

  return null;
}

export function PwaUpdatePrompt() {
  if (!shouldRegisterPwa) return null;

  return <PwaUpdateRegistrar />;
}
