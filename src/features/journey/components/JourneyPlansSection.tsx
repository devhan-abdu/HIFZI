import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import type { JourneyPlanCard, JourneyPlanStatus } from "../types";

const STATUS_STYLES: Record<
  JourneyPlanStatus,
  { bg: string; text: string; label: string }
> = {
  active: { bg: "bg-", text: "text-emerald-800 dark:text-emerald-400", label: "Active" },
  paused: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-400", label: "Paused" },
  finished: { bg: "bg-surface dark:bg-white/5", text: "text-muted", label: "Finished" },
};

const TYPE_ICONS = {
  HIFZ: "ribbon-outline" as const,
  MURAJA: "sync-outline" as const,
};

export function JourneyPlansSection({
  plans,
  totalCount,
  hasMore,
  onLoadMore,
}: {
  plans: JourneyPlanCard[];
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const { colorScheme } = require("react-native").useColorScheme();
  const isDark = colorScheme === "dark";

  if (totalCount === 0) {
    return (
      <View className="rounded-2xl border border-dashed border-border bg-background p-6">
        <Text className="text-text text-base">No plans yet</Text>
        <Text className="text-muted text-sm mt-1">
          Create a Hifz or Muraja plan to start tracking your journey.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {plans.map((plan, idx) => {
        const badge = STATUS_STYLES[plan.status];
        return (
          <View
            key={`${plan.type}-${plan.activityPlanId}-${plan.id}-${idx}`}
            className=" bg-surface dark:bg-surface-muted border border-border rounded-2xl p-6 shadow-sm"
          >
            <View className="flex-row items-start mb-3">
              <View className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center mr-3">
                <Ionicons
                  name={TYPE_ICONS[plan.type]}
                  size={18}
                  color={isDark ? "#4ade80" : "#276359"}
                />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-[10px] uppercase tracking-widest text-muted">
                  {plan.type === "HIFZ" ? "Hifz" : "Muraja"}
                </Text>
                <Text className="text-text text-base mt-0.5">
                  {plan.name}
                </Text>
                {plan.juzLabel ?
                  <Text className="text-muted text-xs mt-0.5">
                    {plan.juzLabel}
                  </Text>
                : null}
              </View>
              <View className={`px-2 py-0.5 rounded-full ${badge.bg}`}>
                <Text className={`text-[10px] uppercase ${badge.text}`}>
                  {badge.label}
                </Text>
              </View>
            </View>

            <View className="h-1.5 bg-surface rounded-full overflow-hidden mb-2">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${plan.progressPercent}%` }}
              />
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-muted text-xs">
                {plan.pagesDone} / {plan.pagesTotal} pages ·{" "}
                {plan.progressPercent}%
              </Text>
              <Text className="text-muted text-xs">
                {formatDate(plan.startDate)}
                {plan.endDate ? ` → ${formatDate(plan.endDate)}` : ""}
              </Text>
            </View>
          </View>
        );
      })}

      {hasMore ?
        <Pressable
          onPress={onLoadMore}
          className="flex-row items-center justify-center py-3 border border-border rounded-xl bg-surface dark:bg-surface-muted"
        >
          <Text className="text-primary dark:text-emerald-400 text-sm mr-1">
            Show more plans ({totalCount - plans.length} remaining)
          </Text>
          <Ionicons name="chevron-down" size={16} color={isDark ? "#4ade80" : "#276359"} />
        </Pressable>
      : null}
    </View>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}
