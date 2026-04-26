import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { notificationRepository } from "../features/notifications/services/notificationRepository";

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id;
  const notificationsKey = ["notifications", userId] as const;
  const latestNotificationKey = ["latest-notification", userId] as const;

  const notificationsQuery = useQuery({
    queryKey: notificationsKey,
    enabled: !!userId,
    queryFn: () => notificationRepository.getNotifications(userId!),
    refetchInterval: 15000,
  });

  const unreadNotifications = (notificationsQuery.data ?? []).filter((item) => item.isRead === 0);
  const unreadCount = unreadNotifications.length;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!userId) return;
      await notificationRepository.markAsRead(userId, id);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      const previous = queryClient.getQueryData<any[]>(notificationsKey);

      queryClient.setQueryData(
        notificationsKey,
        (current: any[] = []) =>
          current.map((item) => item.id === id ? { ...item, isRead: 1 } : item),
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
      await notificationRepository.markAllAsRead(userId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      const previous = queryClient.getQueryData<any[]>(notificationsKey);

      queryClient.setQueryData(
        notificationsKey,
        (current: any[] = []) =>
          current.map((item) => ({ ...item, isRead: 1 })),
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
