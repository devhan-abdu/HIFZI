import { useEffect, useCallback } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import { notificationManager } from "@/src/features/notifications/services/notificationManager";
import { useNotificationStore } from "./useNotificationStore";

const NOTIFICATIONS_ENABLED_KEY = "@hifzi/notificationsEnabled";

export function useNotificationPermissions() {
  const {
    systemStatus,
    userEnabled,
    canAskAgain,
    isChecking,
    setSystemStatus,
    setUserEnabled,
    setCanAskAgain,
    setIsChecking,
  } = useNotificationStore();

  const checkStatus = useCallback(async () => {
    try {
      const { status, canAskAgain: askAgain } = await Notifications.getPermissionsAsync();
      setSystemStatus(status);
      setCanAskAgain(askAgain);

      const savedPref = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      if (savedPref !== null) {
        setUserEnabled(savedPref === "true");
      } else {
        // If no preference is saved, we consider it enabled if the system granted it
        setUserEnabled(status === "granted");
      }
    } catch (e) {
      console.error("Failed to check notification status", e);
    } finally {
      setIsChecking(false);
    }
  }, [setSystemStatus, setCanAskAgain, setUserEnabled, setIsChecking]);

  useEffect(() => {
    checkStatus();

    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        checkStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkStatus]);

  const togglePreference = async (enabled: boolean) => {
    try {
      if (enabled) {
        // If they want to enable, check system permission first
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          const granted = await notificationManager.requestPermissions();
          if (!granted) {
            // Permission denied by system
            return false;
          }
        }
      } else {
        // If turning off, cancel all scheduled local notifications
        await notificationManager.cancelAll();
      }

      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
      setUserEnabled(enabled);
      
      // Update systemStatus state
      const { status } = await Notifications.getPermissionsAsync();
      setSystemStatus(status);
      
      return true;
    } catch (e) {
      console.error("Failed to toggle notification preference", e);
      return false;
    }
  };

  const isFullyEnabled = systemStatus === "granted" && userEnabled;

  return {
    systemStatus,
    userEnabled,
    canAskAgain,
    isFullyEnabled,
    isChecking,
    togglePreference,
    checkStatus,
  };
}
