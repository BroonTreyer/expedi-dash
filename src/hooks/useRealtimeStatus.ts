import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    const channel = supabase
      .channel("realtime-status-check")
      .on("postgres_changes", { event: "*", schema: "public", table: "carregamentos_dia" }, () => {})
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("connected");
        else if (state === "CLOSED" || state === "CHANNEL_ERROR") setStatus("disconnected");
        else setStatus("connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}
