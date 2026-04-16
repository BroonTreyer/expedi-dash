import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Check for updates every 30 minutes
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    toast("Nova versão disponível", {
      description: "Atualize para receber as últimas melhorias.",
      duration: Infinity,
      action: {
        label: "Atualizar",
        onClick: () => updateServiceWorker(true),
      },
      cancel: {
        label: "Depois",
        onClick: () => {},
      },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
