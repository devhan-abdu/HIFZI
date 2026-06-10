import { create } from "zustand";
import * as Notifications from "expo-notifications";

interface NotificationState {
  systemStatus: Notifications.PermissionStatus | null;
  userEnabled: boolean;
  canAskAgain: boolean;
  isChecking: boolean;
  setSystemStatus: (status: Notifications.PermissionStatus | null) => void;
  setUserEnabled: (enabled: boolean) => void;
  setCanAskAgain: (canAsk: boolean) => void;
  setIsChecking: (checking: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  systemStatus: null,
  userEnabled: true,
  canAskAgain: true,
  isChecking: true,
  setSystemStatus: (status) => set({ systemStatus: status }),
  setUserEnabled: (enabled) => set({ userEnabled: enabled }),
  setCanAskAgain: (canAsk) => set({ canAskAgain: canAsk }),
  setIsChecking: (checking) => set({ isChecking: checking }),
}));
