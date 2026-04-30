import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RealtimeStatus = "connecting" | "connected" | "disconnected";

/**
 * Lightweight realtime status check — reuses existing channels if possible.
 * Uses a presence-only channel to avoid duplicating postgres_changes listeners.
 */
export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    // Check if there's already an active channel
    const channels = supabase.getChannels();
    const existing = channels.find((c) => c.topic === "realtime:carregamentos-realtime");
    if (existing) {
      // Check actual channel state instead of assuming connected
      const state = (existing as any).state;
      if (state === "joined" || state === "SUBSCRIBED") {
        setStatus("connected");
      } else if (state === "CHANNEL_ERROR" || state === "CLOSED") {
        setStatus("disconnected");
      } else {
        setStatus("connecting");
      }
      return;
    }

    // Fallback: lightweight status-only channel
    const channel = supabase
      .channel("realtime-status-check")
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
