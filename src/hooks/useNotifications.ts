import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSQLiteContext } from "expo-sqlite";
;
import { useSession } from "@/src/hooks/useSession";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/src/services/notificationService";

export function useNotifications() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id;
  const notificationsKey = ["notifications", userId] as const;
  const latestNotificationKey = ["latest-notification", userId] as const;

  const notificationsQuery = useQuery({
    queryKey: notificationsKey,
    enabled: !!userId,
    queryFn: () => getNotifications(db, userId!),
    refetchInterval: 15000,
  });

  const unreadNotifications = (notificationsQuery.data ?? []).filter((item) => item.is_read === 0);
  const unreadCount = unreadNotifications.length;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!userId) return;
      await markNotificationAsRead(db, userId, id);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      const previous = queryClient.getQueryData<{
        id: number;
        user_id: string;
        title: string;
        message: string;
        type: "xp" | "warning" | "milestone";
        is_read: number;
        created_at: string;
      }[]>(notificationsKey);

      queryClient.setQueryData(
        notificationsKey,
        (current: typeof previous = []) =>
          current.map((item) => item.id === id ? { ...item, is_read: 1 } : item),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsKey, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
      queryClient.invalidateQueries({ queryKey: latestNotificationKey });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await markAllNotificationsAsRead(db, userId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      const previous = queryClient.getQueryData<{
        id: number;
        user_id: string;
        title: string;
        message: string;
        type: "xp" | "warning" | "milestone";
        is_read: number;
        created_at: string;
      }[]>(notificationsKey);

      queryClient.setQueryData(
        notificationsKey,
        (current: typeof previous = []) =>
          current.map((item) => ({ ...item, is_read: 1 })),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsKey, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
      queryClient.invalidateQueries({ queryKey: latestNotificationKey });
    },
  });

  return {
    notifications: unreadNotifications,
    unreadCount,
    loading: notificationsQuery.isLoading,
    refresh: notificationsQuery.refetch,
    markAsRead: (id: number) => markAsReadMutation.mutateAsync(id),
    markAllAsRead: () => markAllMutation.mutateAsync(),
  };
}
