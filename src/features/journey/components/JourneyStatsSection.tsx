import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import StatCard from "@/src/features/hifz/components/StatCard";
import type { JourneyStats, JourneyTestStats } from "../types";

export function JourneyStatsSection({
  stats,
  testStats,
}: {
  stats: JourneyStats;
  testStats: JourneyTestStats;
}) {
  const lastTestLabel = testStats.lastTestDate
    ? new Date(testStats.lastTestDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <View>
      <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-1 px-1">
        Insights
      </Text>
      <Text className="text-xl text-text mb-4 px-1">Your progress</Text>

      <View className="flex-row flex-wrap justify-between">
        <StatCard
          title="Current streak"
          value={stats.currentStreak}
          unit="Days"
          icon="flame-outline"
          type="warning"
        />
        <StatCard
          title="Best streak"
          value={stats.bestStreak}
          unit="Days"
          icon="trophy-outline"
          type="success"
        />
        <StatCard
          title="Sessions"
          value={stats.totalSessions}
          unit="Logged"
          icon="checkmark-done-circle-outline"
          type="hifz"
        />
        <StatCard
          title="Pages logged"
          value={stats.totalPagesLogged}
          unit="Total"
          icon="book-outline"
          type="muraja"
        />
      </View>

      <Text className="text-muted uppercase tracking-[2px] text-[10px] mb-1 px-1 mt-2">
        Tests
      </Text>
      <Text className="text-xl text-text mb-4 px-1">Exam performance</Text>

      <View className="flex-row flex-wrap justify-between">
        <StatCard
          title="Tests taken"
          value={testStats.totalTests}
          unit="Total"
          icon="help-circle-outline"
          type="info"
        />
        <StatCard
          title="Average score"
          value={testStats.totalTests > 0 ? testStats.averageScorePercent : "—"}
          unit={testStats.totalTests > 0 ? "%" : ""}
          icon="stats-chart-outline"
          type="success"
        />
        <StatCard
          title="Perfect scores"
          value={testStats.perfectTests}
          unit="Tests"
          icon="ribbon-outline"
          type="hifz"
        />
        <StatCard
          title="Last test"
          value={lastTestLabel}
          unit=""
          icon="time-outline"
          type="muraja"
        />
      </View>

      {testStats.totalTests > 0 ? (
        <View className="flex-row gap-2 px-1 mt-1">
          <MiniTag label={`Hifz ${testStats.hifzTests}`} />
          <MiniTag label={`Muraja ${testStats.murajaTests}`} />
        </View>
      ) : (
        <Text className="text-muted text-sm px-1 mt-1">
          Complete weekly evaluations to build your test history.
        </Text>
      )}
    </View>
  );
}

function MiniTag({ label }: { label: string }) {
  return (
    <View className="bg-surface px-2.5 py-1 rounded-full">
      <Text className="text-muted text-[10px] uppercase tracking-wide">{label}</Text>
    </View>
  );
}
