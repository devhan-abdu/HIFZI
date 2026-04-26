import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_CHANNEL_ID = "default";
let isConfigured = false;

export const notificationManager = {
  
  async configure() {
    if (isConfigured) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#276359",
      });
    }

    isConfigured = true;
  },

  async requestPermissions() {
    await this.configure();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  },

  async sendLocal(payload: { title: string; body: string; data?: any }) {
    const granted = await this.requestPermissions();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data,
        ...(Platform.OS === "android" ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
  },

  async schedule(payload: { title: string; body: string; data: any; trigger: Date }) {
    const granted = await this.requestPermissions();
    if (!granted) return null;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data,
        ...(Platform.OS === "android" ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: payload.trigger,
      },
    });
  },

  async cancel(identifier: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (e) {
    }
  }
};
