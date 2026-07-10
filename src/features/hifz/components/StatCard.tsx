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
  const { colorScheme } = require("react-native").useColorScheme();
  const isDark = colorScheme === "dark";

  const primaryIcon = isDark ? "#4ade80" : "#276359";
  const primaryText = isDark ? "text-emerald-400" : "text-primary";
  const primaryBg = isDark ? "bg-emerald-900/20" : "bg-primary/10";

  const themes: any = {
    success: { bg: primaryBg, icon: primaryIcon, text: primaryText },
    danger: { bg: isDark ? "bg-rose-900/30" : "bg-rose-500/10", icon: isDark ? "#fb7185" : "#e11d48", text: isDark ? "text-rose-400" : "text-rose-500" },
    info: { bg: isDark ? "bg-blue-900/30" : "bg-blue-500/10", icon: isDark ? "#60a5fa" : "#2563eb", text: isDark ? "text-blue-400" : "text-blue-500" },
    warning: { bg: isDark ? "bg-amber-900/30" : "bg-amber-500/10", icon: isDark ? "#fbbf24" : "#d97706", text: isDark ? "text-amber-400" : "text-amber-500" },
    hifz: { bg: primaryBg, icon: primaryIcon, text: primaryText },
    muraja: { bg: primaryBg, icon: primaryIcon, text: primaryText },
  };

  const theme = themes[type] || themes.success;

  return (
    <View className="w-[48%] bg-surface dark:bg-surface-muted rounded-xl px-4 py-5 mb-4 border border-border shadow-sm relative">
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
