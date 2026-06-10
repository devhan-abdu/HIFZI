import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import type { JourneyPlanCard, JourneyPlanStatus } from "../types";

const STATUS_STYLES: Record<
  JourneyPlanStatus,
  { bg: string; text: string; label: string }
> = {
  active: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Active" },
  paused: { bg: "bg-amber-100", text: "text-amber-800", label: "Paused" },
  finished: { bg: "bg-slate-200", text: "text-slate-700", label: "Finished" },
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
  if (totalCount === 0) {
    return (
      <View className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
        <Text className="text-slate-900 text-base">No plans yet</Text>
        <Text className="text-slate-500 text-sm mt-1">
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
            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm"
          >
            <View className="flex-row items-start mb-3">
              <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mr-3">
                <Ionicons
                  name={TYPE_ICONS[plan.type]}
                  size={18}
                  color="#276359"
                />
              </View>
              <View className="flex-1 pr-2">
                <Text className="text-[10px] uppercase tracking-widest text-slate-400">
                  {plan.type === "HIFZ" ? "Hifz" : "Muraja"}
                </Text>
                <Text className="text-slate-900 text-base mt-0.5">
                  {plan.name}
                </Text>
                {plan.juzLabel ?
                  <Text className="text-slate-500 text-xs mt-0.5">
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

            <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${plan.progressPercent}%` }}
              />
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-slate-600 text-xs">
                {plan.pagesDone} / {plan.pagesTotal} pages ·{" "}
                {plan.progressPercent}%
              </Text>
              <Text className="text-slate-400 text-xs">
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
          className="flex-row items-center justify-center py-3 border border-slate-200 rounded-xl bg-white"
        >
          <Text className="text-primary text-sm mr-1">
            Show more plans ({totalCount - plans.length} remaining)
          </Text>
          <Ionicons name="chevron-down" size={16} color="#276359" />
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
