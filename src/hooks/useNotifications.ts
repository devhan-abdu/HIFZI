import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationRepository } from "@/src/features/notifications/services/notificationRepository";
import { useSession } from "./useSession";
import { useMemo } from "react";

export function useNotifications() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      return await notificationRepository.getNotifications(user.id);
    },
    staleTime: 1000 * 30, 
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      if (!user?.id) return;
      await notificationRepository.markAsRead(user.id, notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await notificationRepository.markAllAsRead(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
  });

  const notifications = notificationsQuery.data || [];

  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.isRead === 0).length;
  }, [notifications]);

  const latestUnread = useMemo(() => {
    return notifications.find(n => n.isRead === 0) || null;
  }, [notifications]);

  return {
    notifications,
    latestUnread,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    refetch: notificationsQuery.refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}
