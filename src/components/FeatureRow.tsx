import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

export function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <View className="flex-row items-start px-2">
      <View className="bg-surface p-3 rounded-full mr-4 border border-border">
        <Ionicons name={icon} size={22} color="#276359" />
      </View>
      <View className="flex-1">
        <Text className="  text-text text-lg">{title}</Text>
        <Text className="text-muted text-sm leading-5">{desc}</Text>
      </View>
    </View>
  );
}
