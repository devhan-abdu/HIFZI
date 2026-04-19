import { useEffect } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useSQLiteContext } from "expo-sqlite";

import { useSession } from "@/src/hooks/useSession";
import {
  recordDeliveredNotificationFromPayload,
  syncHabitNotificationSchedules,
} from "@/src/services/notificationService";

export function NotificationBootstrap() {
  const db = useSQLiteContext();
  const { user, loading } = useSession();

  useEffect(() => {
    if (loading || !user?.id) {
      return;
    }

    const syncNotifications = () =>
      syncHabitNotificationSchedules(db, {
        userId: user.id,
      }).catch((error) => {
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
          notification.request.content.data as Record<string, unknown> | undefined;

        void recordDeliveredNotificationFromPayload(db, payload).catch(() => {
          // Ignore listener persistence errors so notifications still show.
        });
      },
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const payload =
          response.notification.request.content.data as Record<string, unknown> | undefined;

        void recordDeliveredNotificationFromPayload(db, payload).catch(() => {
          // Ignore listener persistence errors so notifications still show.
        });
      });

    return () => {
      appStateSubscription.remove();
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [db, loading, user?.id]);

  return null;
}
