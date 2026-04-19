import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

type NotificationType = "xp" | "warning" | "milestone";

export function NotificationCard({
  title,
  message,
  type,
}: {
  title: string;
  message: string;
  type: NotificationType;
}) {
  const theme =
    type === "xp" ?
      {
        bg: "bg-violet-50",
        border: "border-violet-200",
        icon: "sparkles",
        iconColor: "#7c3aed",
      }
    : type === "warning" ?
      {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: "alert-circle",
        iconColor: "#d97706",
      }
    : {
        bg: "bg-orange-50",
        border: "border-orange-200",
        icon: "flame",
        iconColor: "#ea580c",
      };

  return (
    <View className={`rounded-2xl border p-4 shadow-sm ${theme.bg} ${theme.border}`}>
      <View className="flex-row items-start">
        <View className="w-8 h-8 rounded-full bg-white items-center justify-center mr-3">
          <Ionicons name={theme.icon as never} size={16} color={theme.iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-slate-900 text-sm">{title}</Text>
          <Text className="text-slate-600 text-xs mt-1">{message}</Text>
        </View>
      </View>
    </View>
  );
}
