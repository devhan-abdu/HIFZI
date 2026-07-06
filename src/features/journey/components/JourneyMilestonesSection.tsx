import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import type { JourneyMilestone } from "../types";

export function JourneyMilestonesSection({
  milestones,
}: {
  milestones: JourneyMilestone[];
}) {
  if (milestones.length === 0) {
    return (
      <View className="rounded-2xl border border-dashed border-border bg-background p-6">
        <Text className="text-text">No achievements yet</Text>
        <Text className="text-muted text-sm mt-1">
          Keep logging sessions and passing tests to unlock milestones.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {milestones.map((m) => (
        <View
          key={m.id}
          className="w-[48%] rounded-2xl border border-primary/20 bg-surface p-4 shadow-sm"
        >
          <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mb-3">
            <Ionicons name={m.icon} size={20} color="#276359" />
          </View>
          <Text className="text-text text-sm leading-5">{m.title}</Text>
          <Text className="text-muted text-[10px] mt-2">
            {new Date(m.achievedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
      ))}
    </View>
  );
}
