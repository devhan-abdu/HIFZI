import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type Status = "completed" | "pending" | "missed" | "partial";

interface StatusBadgeProps {
  status: Status;
  inverted?: boolean;
}

export default function StatusBadge({
  status,
  inverted = false,
}: StatusBadgeProps) {
  const getStatusStyle = (status: Status) => {
    if (inverted) {
      return {
        bg: "bg-white/20",
        text: "text-white",
        border: "border-white/20",
        iconColor: "#ffffff",
      };
    }

    switch (status) {
      case "completed":
        return {
          bg: "bg-green-50",
          text: "text-primary",
          border: "border-green-200",
          iconColor: "#0b6623",
        };
      case "pending":
        return {
          bg: "bg-amber-50",
          text: "text-amber-800",
          border: "border-amber-200",
          iconColor: "#92400e",
        };
      case "missed":
        return {
          bg: "bg-red-50",
          text: "text-red-800",
          border: "border-red-200",
          iconColor: "#991b1b",
        };
      case "partial":
        return {
          bg: "bg-yellow-50",
          text: "text-yellow-800",
          border: "border-yellow-200",
          iconColor: "#854d0e",
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-800",
          border: "border-gray-200",
          iconColor: "#1f2937",
        };
    }
  };

  const style = getStatusStyle(status);

  return (
    <View
      className={`flex-row items-center rounded-full px-3 py-1 border ${style.bg} ${style.border}`}
    >
      <Ionicons
        name="checkmark-circle"
        size={12}
        color={style.iconColor}
        style={{ marginRight: 4 }}
      />
      <Text className={` text-[10px] uppercase tracking-wider ${style.text}`}>
        {status}
      </Text>
    </View>
  );
}
