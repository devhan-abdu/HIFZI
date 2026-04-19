import React, { useMemo, useState } from "react";
import { Text, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { HistoryCalendar } from "@/src/features/muraja/components/HistoryCalendar";
import WeeklyReviewCard from "@/src/features/muraja/components/WeeklyReviewCard";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { SectionHeader } from "@/src/components/SectionHeader";

const StatCard = ({
  label,
  value,
  sub,
  icon,
  color = "text-primary",
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  color?: string;
}) => (
  <View className="bg-white border border-slate-100 rounded-[28px] p-4 shadow-sm w-[48%] mb-1">
    <View className="flex-row justify-between items-center mb-3">
      <Text className="text-[9px] uppercase tracking-[2px] text-gray-400 ">
        {label}
      </Text>
      <View className="bg-gray-50 p-1.5 rounded-lg">
        <Ionicons name={icon} size={12} color="#94a3b8" />
      </View>
    </View>
    <Text className={`text-2xl  tracking-tight ${color}`}>{value}</Text>
    <Text className="text-[10px] text-gray-400  mt-1">{sub}</Text>
  </View>
);

export default function History() {
  const [viewDate, setViewDate] = useState(() => new Date());

  const { userHistory, weekHistory, isLoading, analytics, historyEntries } = useHabitProgress(viewDate);

  const hasData =
    analytics && (analytics.totalPages > 0 || analytics.longestStreak > 0);
  const recentEvents = useMemo(() => historyEntries.slice(0, 20), [historyEntries]);

  const describeEvent = (event: (typeof historyEntries)[number]) => {
    if (event.type === "HIFZ_COMPLETED") {
      return `Completed ${event.units || 0} page${event.units === 1 ? "" : "s"} of Hifz`;
    }
    if (event.type === "MURAJA_COMPLETED") {
      return `Completed ${event.units || 0} page${event.units === 1 ? "" : "s"} of Muraja`;
    }
    if (event.type === "TASK_MISSED") {
      return `Missed ${event.activityType === "HIFZ" ? "Hifz" : "Muraja"} session`;
    }
    if (event.type === "TASK_UNDONE") {
      return "Updated previous log";
    }
    return "Logged reading activity";
  };

  return (
    <Screen>
      <ScreenContent>
        <SectionHeader title="History" />
        <HistoryCalendar userHistory={userHistory} setViewDate={setViewDate} />
        {hasData && (
          <View className="mb-8">
            <SectionHeader title="Monthly Insights" />

            <View className="flex-row flex-wrap justify-between gap-y-3">
              <StatCard
                label="Completion"
                value={`${analytics.completionRate}%`}
                sub="Monthly Success"
                icon="pie-chart-outline"
              />
              <StatCard
                label="Pages"
                value={`${analytics.totalPages}`}
                sub="Total Reviewed"
                icon="book-outline"
              />
              <StatCard
                label="Streak"
                value={`${analytics.longestStreak}d`}
                sub="Current Flow"
                icon="flame"
                color={
                  analytics.longestStreak > 0 ?
                    "text-orange-500"
                  : "text-gray-400"
                }
              />
              <StatCard
                label="Time"
                value={`${analytics.totalMinutes}m`}
                sub="Total Effort"
                icon="time-outline"
              />
            </View>
          </View>
        )}
        <View className="mb-8">
  <SectionHeader
    title="Event History"
    badge={`${recentEvents.length} Events`}
  />

  {recentEvents.length > 0 ? (
    <View className="rounded-2xl border border-slate-200 bg-white">
      
      <View className="p-3 border-b border-slate-100">
        <Text className="text-slate-500 text-xs uppercase tracking-[2px]">
          Recent Activity Timeline
        </Text>
      </View>

      <View className="p-3">
        {recentEvents.slice(0, 6).map((event) => (
          <View
            key={event.id}
            className="py-3 border-b border-slate-100 last:border-b-0"
          >
            <Text className="text-[10px] uppercase tracking-[2px] text-slate-500">
              {event.activityType}
            </Text>

            <Text className="text-slate-900 text-sm mt-1">
              {describeEvent(event)}
            </Text>

            <Text className="text-slate-600 text-xs mt-1">
              {event.date}
              {event.reference ? ` · ${event.reference}` : ""}
            </Text>

            <Text className="text-slate-500 text-xs mt-1">
              {event.timestamp.replace("T", " ").slice(0, 16)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  ) : (
    <View className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
      <Text className="text-slate-500 text-sm">
        No activity events yet. Start logging Hifz or Muraja to build your timeline.
      </Text>
    </View>
  )}
</View>
        <View className="mb-10">
          <SectionHeader
            title="Weekly Reviews"
            badge={`${weekHistory?.length || 0} Sessions`}
          />

          {isLoading ?
            <View className="py-20 items-center">
              <Text className="text-gray-400  italic">Loading history...</Text>
            </View>
          : weekHistory?.length > 0 ?
            <WeeklyReviewCard weekHistory={weekHistory} />
          : <View className="p-12 bg-gray-50 rounded-[40px] border border-dashed border-gray-200 items-center">
              <View className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Ionicons name="file-tray-outline" size={32} color="#cbd5e1" />
              </View>
              <Text className="text-center text-gray-900   text-lg">
                No history found
              </Text>
              <Text className="text-center text-gray-400 text-sm mt-1 px-6">
                Complete your weekly plans to see your progress reports here.
              </Text>
            </View>
          }
        </View>
      </ScreenContent>
    </Screen>
  );
}
