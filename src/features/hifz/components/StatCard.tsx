import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

interface StatCardProps {
  title: string;
  value: string | number;
  unit: string;
  type?: "success" | "danger" | "info" | "warning" | "hifz" | "muraja"; // Added new types
  icon: keyof typeof Ionicons.glyphMap;
  category?: string;
}

export default function StatCard({
  title,
  value,
  unit,
  type = "success",
  icon,
  category,
}: StatCardProps) {
  const themes: any = {
    success: { bg: "bg-primary/10", icon: "#276359", text: "text-primary" },
    danger: { bg: "bg-rose-500/10", icon: "#e11d48", text: "text-rose-500" },
    info: { bg: "bg-blue-500/10", icon: "#2563eb", text: "text-blue-500" },
    warning: { bg: "bg-amber-500/10", icon: "#d97706", text: "text-amber-500" },
    hifz: { bg: "bg-primary/10", icon: "#276359", text: "text-primary" },
    muraja: { bg: "bg-primary/10", icon: "#276359", text: "text-primary" },
  };

  const theme = themes[type] || themes.success;

  return (
    <View className="w-[48%] bg-surface rounded-xl px-4 py-5 mb-4 border border-border shadow-sm relative">
      {category && (
        <Text
          className={`absolute top-3 right-3 text-[7px]  uppercase tracking-[1px] ${theme.text}`}
        >
          {category}
        </Text>
      )}

      <View className="flex-row items-center mt-1">
        <View
          className={`w-10 h-10 rounded-full ${theme.bg} items-center justify-center mr-3`}
        >
          <Ionicons name={icon} size={18} color={theme.icon} />
        </View>

        <View className="flex-1">
          <Text className="text-muted text-xs  uppercase tracking-widest mb-0.5">
            {title}
          </Text>

          <View className="flex-row items-baseline">
            <Text className="text-text text-xl  tracking-tight">
              {value}
            </Text>
            {unit && (
              <Text className="text-muted text-[9px]   ml-1 uppercase">
                {unit}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
