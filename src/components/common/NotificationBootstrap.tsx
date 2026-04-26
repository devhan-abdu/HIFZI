import { useEffect } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useSession } from "@/src/hooks/useSession";
import { notificationService } from "@/src/features/notifications/services/notificationService";
import { notificationRepository } from "@/src/features/notifications/services/notificationRepository";

export function NotificationBootstrap() {
  const { user, loading } = useSession();

  useEffect(() => {
    if (loading || !user?.id) {
      return;
    }

    const syncNotifications = () =>
      notificationService.refreshSchedules(user.id).catch((error) => {
        console.warn("Notification schedule sync skipped:", error);
      });

    void syncNotifications();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncNotifications();
      }
    });

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const payload =
          notification.request.content.data as any;

        if (payload?.userId && payload?.eventKey) {
          void notificationRepository.recordDeliveredNotification(payload).catch(() => {
          });
        }
      },
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const payload =
          response.notification.request.content.data as any;

        if (payload?.userId && payload?.eventKey) {
          void notificationRepository.recordDeliveredNotification(payload).catch(() => {
          });
        }
      });

    return () => {
      appStateSubscription.remove();
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [loading, user?.id]);

  return null;
}
