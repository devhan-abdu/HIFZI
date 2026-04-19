import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { Text } from "@/src/components/common/ui/Text";
import { useNotifications } from "@/src/hooks/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Screen>
      <ScreenContent>
        <View className="flex-row items-center justify-between my-12">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center bg-slate-100 mr-3"
            >
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <View>
              <Text className="text-slate-900 text-xl">Notifications</Text>
              <Text className="text-slate-500 text-xs">
                {unreadCount} unread
              </Text>
            </View>
          </View>
          <Pressable onPress={() => markAllAsRead()} className="px-3 py-2 rounded-xl bg-slate-100">
            <Text className="text-slate-700 text-xs">Mark all as read</Text>
          </Pressable>
        </View>

        {notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="notifications-off-outline" size={28} color="#94a3b8" />
            <Text className="text-slate-500 mt-3">No notifications yet</Text>
          </View>
        ) : (
          <View className="gap-y-3">
            {notifications.map((item) => {
              const icon =
                item.type === "xp" ? "sparkles"
                : item.type === "warning" ? "alert-circle"
                : "flame";
              const iconColor =
                item.type === "xp" ? "#7c3aed"
                : item.type === "warning" ? "#d97706"
                : "#ea580c";

              return (
                <Pressable
                  key={item.id}
                  onPress={() => markAsRead(item.id)}
                  className={`rounded-2xl border p-4 ${
                    item.is_read === 0
                      ? "bg-white border-slate-200"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <View className="flex-row items-start">
                    <View className="w-9 h-9 rounded-full bg-white items-center justify-center mr-3 border border-slate-100">
                      <Ionicons name={icon as never} size={16} color={iconColor} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-sm ${item.is_read === 0 ? "text-slate-900" : "text-slate-700"}`}>
                          {item.title}
                        </Text>
                        {item.is_read === 0 && <View className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                      </View>
                      <Text className="text-xs text-slate-600 mt-1">{item.message}</Text>
                      <Text className="text-[10px] text-slate-400 mt-2">{formatTime(item.created_at)}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScreenContent>
    </Screen>
  );
}
