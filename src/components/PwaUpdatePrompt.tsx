import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Periodic check every 5 minutes
      const interval = setInterval(() => {
        registration.update().catch(() => {});
      }, 5 * 60 * 1000);

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

    // autoUpdate already activated the new SW; show a brief informative toast.
    toast.success("Aplicativo atualizado", {
      description: "Nova versão carregada automaticamente.",
      duration: 4000,
    });
    setNeedRefresh(false);
  }, [needRefresh, setNeedRefresh]);

  return null;
}
