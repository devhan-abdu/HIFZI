import React from "react";
import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { SectionHeader } from "@/src/components/SectionHeader";
import { WeeklyReportCard } from "../../hifz/components/WeeklyReportCard";
import { DayByDay } from "./DayByDay";
import { IMonthHistory } from "@/src/types";

interface ReviewProps {
  plan: IMonthHistory;
  analytics: any;
  weekRange: string;
}

export function WeeklyReviewView({ plan, analytics, weekRange }: ReviewProps) {
  const metrics = [
    {
      label: "Total Time",
      value: `${analytics.totalTime}m`,
      icon: "time-outline",
    },
    {
      label: "Avg/Session",
      value: `${analytics.avgSession}m`,
      icon: "speedometer-outline",
    },
    {
      label: "Best Streak",
      value: `${analytics.longestStreak}d`,
      icon: "flame-outline",
    },
    { label: "Peak Day", value: analytics.bestDay, icon: "trophy-outline" },
  ];

  return (
    <View>
      <WeeklyReportCard
        rate={analytics.completionRate}
        completed={analytics.completed}
        partial={analytics.partial}
        missed={analytics.missed}
        weekRange={weekRange}
      />

      <View className="mb-8">
        <SectionHeader title="Performance Summary" />
        <DayByDay days={plan.weekly_plan_days ?? []} />
      </View>

      <View className="flex-row flex-wrap justify-between gap-3 mb-8">
        {metrics.map((m, i) => (
          <View
            key={i}
            className="w-[47%] bg-white rounded-[24px] p-4 border border-slate-100 flex-row items-center gap-3 shadow-sm shadow-slate-200/50"
          >
            <View className="p-2 rounded-xl bg-slate-50">
              <Ionicons name={m.icon as any} size={18} color="#276359" />
            </View>
            <View>
              <Text className="text-slate-400  text-[9px] uppercase tracking-widest">
                {m.label}
              </Text>
              <Text className="text-sm   text-slate-900">{m.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
