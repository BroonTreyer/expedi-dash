import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  read: boolean;
  created_at: string;
}

type NotificationChannelEntry = {
  channel: RealtimeChannel;
  subscribers: number;
};

const notificationChannels = new Map<string, NotificationChannelEntry>();

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;
    const channelName = `notifications-${userId}`;

    const releaseChannel = () => {
      const entry = notificationChannels.get(userId);
      if (!entry) return;
      entry.subscribers -= 1;
      if (entry.subscribers <= 0) {
        try { supabase.removeChannel(entry.channel); } catch {}
        notificationChannels.delete(userId);
      }
    };

    const existingEntry = notificationChannels.get(userId);
    if (existingEntry) {
      existingEntry.subscribers += 1;
      return releaseChannel;
    }

    // Clean up any stale channels with same topic
    const channelTopic = `realtime:${channelName}`;
    try {
      supabase.getChannels()
        .filter((c) => c.topic === channelTopic)
        .forEach((c) => { try { supabase.removeChannel(c); } catch {} });
    } catch {}

    try {
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          () => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const updated = payload.new as Notification;
            queryClient.setQueryData<Notification[]>(["notifications"], (old) =>
              old?.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const deleted = payload.old as any;
            queryClient.setQueryData<Notification[]>(["notifications"], (old) =>
              old?.filter((n) => n.id !== deleted.id)
            );
          }
        )
        .subscribe();

      notificationChannels.set(userId, { channel, subscribers: 1 });
    } catch (err) {
      console.warn("[Notifications] Failed to create realtime channel:", err);
    }

    return releaseChannel;
  }, [user?.id, queryClient]);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return query;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      qc.setQueryData<Notification[]>(["notifications"], (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] });
      qc.setQueryData<Notification[]>(["notifications"], (old) =>
        old?.map((n) => ({ ...n, read: true }))
      );
    },
  });
}

export function useClearNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("read", true);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
