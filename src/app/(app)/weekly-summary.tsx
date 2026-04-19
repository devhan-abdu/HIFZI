import { Text } from "@/src/components/common/ui/Text";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { markWeeklySummarySeen } from "@/src/features/habits/services/habitProgressService";
import { useSession } from "@/src/hooks/useSession";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { View } from "react-native";

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { user } = useSession();
  const { analytics, progressByType } = useHabitProgress();
  const userId = user?.id ?? "local-user";

  const handleContinue = async () => {
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
