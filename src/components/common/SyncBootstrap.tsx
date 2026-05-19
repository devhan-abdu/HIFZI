import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useSession } from "@/src/hooks/useSession";
import { sync } from "@/src/services/sync";

/**
 * Starts sync after auth, handles foreground + network reconnect.
 * NetInfo is optional — falls back to sync on foreground only if unavailable.
 */
export function SyncBootstrap() {
  const { user, session, loading } = useSession();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!session || !user?.id) {
      if (lastUserId.current) {
        void sync.onLogout();
        lastUserId.current = null;
      }
      return;
    }

    if (lastUserId.current !== user.id) {
      lastUserId.current = user.id;
      void sync.onLogin(user.id);
    }
  }, [loading, session, user?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && user?.id) {
        sync.onForeground();
      }
    });
    return () => sub.remove();
  }, [user?.id]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NetInfo = require("@react-native-community/netinfo").default;
      unsubscribe = NetInfo.addEventListener(
        (state: { isConnected: boolean | null }) => {
          if (state.isConnected && user?.id) {
            sync.onReconnect();
          }
        },
      );
    } catch {
      // NetInfo not installed — foreground sync only
    }

    return () => unsubscribe?.();
  }, [user?.id]);

  return null;
}
