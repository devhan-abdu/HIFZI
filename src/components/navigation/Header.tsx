import { useSession } from "@/src/hooks/useSession";
import { useNotifications } from "@/src/hooks/useNotifications";
import { useNotificationPermissions } from "@/src/hooks/useNotificationPermissions";
import { supabase } from "@/src/lib/supabase";
import { useState } from "react";
import { View, Pressable, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert } from "../common/Alert";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { useNavigate } from "@/src/hooks/useNavigate";
import { useColorScheme } from "nativewind";

export const Header = ({
  title,
  userStats,
}: {
  title: string;
  userStats?: { level: number; totalXp: number } | null;
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { unreadCount } = useNotifications();
  const { isFullyEnabled, togglePreference } = useNotificationPermissions();
  const { push } = useNavigate();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#ecedee" : "#11181c";

  const [menuOpen, setMenuOpen] = useState(false);
  const [signOut, setSignOut] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const username = user?.user_metadata?.user_name || user?.email;

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage(error.message);
        setErrorVisible(true);
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setErrorVisible(true);
    }
  };

  return (
    <View style={{ paddingTop: insets.top + 8 }} className="bg-background px-6 pb-2">
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <View className="flex-row items-center gap-x-3">
            <Text className="text-[#276359] text-[18px] uppercase tracking-[3px]">
              HIFZI
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-x-3">
          <Pressable
            onPress={() => push("/(app)/notifications" as never)}
            className="w-11 h-11 rounded-full bg-surface items-center justify-center"
          >
            <Ionicons name="notifications-outline" size={20} color={iconColor} />
            {unreadCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-white text-[10px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => setMenuOpen(true)}>
            <UserAvatar name={username} />
          </Pressable>
        </View>
      </View>

      <Modal transparent visible={menuOpen} animationType="fade">
        <View className="flex-1">
          <Pressable
            className="absolute inset-0"
            onPress={() => setMenuOpen(false)}
          />
          <View
            className="absolute right-6 bg-surface rounded-2xl border border-border shadow-lg overflow-hidden min-w-[160px]"
            style={{ top: insets.top + 56 }}
          >
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                push("/(app)/journey" as never);
              }}
              className="flex-row items-center px-4 py-3.5 border-b border-border active:bg-primary/5"
            >
              <Ionicons name="map-outline" size={18} color="#276359" />
              <Text className="text-text text-sm ml-3">Journey</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                togglePreference(!isFullyEnabled);
              }}
              className="flex-row items-center justify-between px-4 py-3.5 border-b border-border active:bg-primary/5"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    isFullyEnabled ? "notifications" : (
                      "notifications-off-outline"
                    )
                  }
                  size={18}
                  color={isFullyEnabled ? "#276359" : "#64748b"}
                />
                <Text className="text-text text-sm ml-3">Reminders</Text>
              </View>
              <View
                className={`w-10 h-6 rounded-full p-1 justify-center ${isFullyEnabled ? "bg-primary" : "bg-border"}`}
              >
                <View
                  className={`w-4 h-4 rounded-full bg-surface shadow-sm transition-all ${isFullyEnabled ? "ml-auto" : ""}`}
                />
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setSignOut(true);
              }}
              className="flex-row items-center px-4 py-3.5 active:bg-primary/5"
            >
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              <Text className="text-red-600 text-sm ml-3">Logout</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Alert
        visible={signOut}
        type="warning"
        title="Sign Out"
        message="Are you sure you want log out? You will need to log in again to sync your progress."
        confirmText="Sign Out"
        cancelText="Stay"
        onConfirm={async () => {
          setSignOut(false);
          handleSignOut();
        }}
        onCancel={() => setSignOut(false)}
      />
      <Alert
        visible={errorVisible}
        type="delete"
        title="Sign Out Failed"
        message={errorMessage}
        confirmText="Try Again"
        onConfirm={() => {
          setErrorVisible(false);
          handleSignOut();
        }}
        onCancel={() => setErrorVisible(false)}
      />
    </View>
  );
};

export const UserAvatar = ({
  name,
  size = 40,
}: {
  name?: string;
  size?: number;
}) => {
  const initials =
    name ?
      name
        .split("")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";
  return (
    <View
      style={{ width: size, height: size }}
      className="bg-background rounded-full items-center justify-center border-2 border-border shadow-sm"
    >
      <Text style={{ fontSize: size * 0.4 }} className="text-muted ">
        {initials}
      </Text>

      <View className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-border" />
    </View>
  );
};
