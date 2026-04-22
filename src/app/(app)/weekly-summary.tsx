import { Text } from "@/src/components/common/ui/Text";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { markWeeklySummarySeen } from "@/src/features/habits/services/habitProgressService";
import { useSession } from "@/src/hooks/useSession";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { View, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AdaptiveEngineService, WeeklyPerformanceReport } from "@/src/services/AdaptiveEngineService";
import { subDays, format as formatDate } from "date-fns";

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { user } = useSession();
  const { analytics, progressByType } = useHabitProgress();
  const userId = user?.id ?? "local-user";

  const weekStart = formatDate(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data: report, isLoading } = useQuery({
    queryKey: ["weekly-performance-report", userId],
    queryFn: () => AdaptiveEngineService.evaluateWeeklyPerformance(db, userId, weekStart),
  });

  const handleContinue = async () => {
    if (report?.level === "RED") {
       await AdaptiveEngineService.applyRecommendation(db, userId, "RED");
    }
    await markWeeklySummarySeen(db, userId);
    router.back();
  };

  return (
    <Screen>
      <ScreenContent>
        <View className="rounded-3xl border border-slate-200 bg-white p-5 my-12">
          <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-500">
            Weekend Review
          </Text>
          <Text className="mt-2 text-2xl text-slate-900">Weekly Summary</Text>
          <Text className="mt-2 text-slate-500">
            Your local progress is saved offline and will sync in background when online.
          </Text>
        </View>

        <View className="mt-4 gap-y-3">
          {report && (
            <View 
              className={`rounded-2xl border p-4 ${
                report.level === "GREEN" ? "bg-emerald-50 border-emerald-200" :
                report.level === "RED" ? "bg-rose-50 border-rose-200" :
                "bg-amber-50 border-amber-200"
              }`}
            >
              <Text className={`font-bold uppercase tracking-wider text-[10px] ${
                report.level === "GREEN" ? "text-emerald-700" :
                report.level === "RED" ? "text-rose-700" :
                "text-amber-700"
              }`}>
                Adaptive Insight: {report.level}
              </Text>
              <Text className="mt-2 text-slate-800 font-medium">
                {report.recommendation}
              </Text>
              
              <View className="mt-4 flex-row justify-between">
                <View>
                  <Text className="text-[10px] text-slate-500 uppercase">Quality</Text>
                  <Text className="text-lg font-bold">{report.averageQuality.toFixed(1)}/5</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-slate-500 uppercase">Completion</Text>
                  <Text className="text-lg font-bold">{report.completionRate.toFixed(0)}%</Text>
                </View>
              </View>
            </View>
          )}

          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-slate-500">Total Minutes</Text>
            <Text className="text-xl text-slate-900">{analytics.totalMinutes}</Text>
          </View>
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-slate-500">Completed Pages</Text>
            <Text className="text-xl text-slate-900">{analytics.totalPages}</Text>
          </View>
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-slate-500">Current Streak</Text>
            <Text className="text-xl text-slate-900">{analytics.longestStreak} days</Text>
          </View>
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-slate-500">By Activity</Text>
            <Text className="mt-1 text-slate-900">
              Hifz: {progressByType.HIFZ.sessions} sessions
            </Text>
            <Text className="text-slate-900">
              Muraja: {progressByType.MURAJA.sessions} sessions
            </Text>
            <Text className="text-slate-900">
              Reading: {progressByType.NORMAL_READING.sessions} sessions
            </Text>
          </View>
        </View>

        <View className="mt-6">
          <Button onPress={handleContinue}>Back to Dashboard</Button>
        </View>
      </ScreenContent>
    </Screen>
  );
}
