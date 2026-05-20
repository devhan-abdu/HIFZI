import { View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "@/src/components/navigation/Header";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { Text } from "@/src/components/common/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { useJourney } from "@/src/features/journey/hooks/useJourney";
import { JourneyOverviewSection } from "@/src/features/journey/components/JourneyOverviewSection";
import { JourneyStatsSection } from "@/src/features/journey/components/JourneyStatsSection";
import { JourneyPlansSection } from "@/src/features/journey/components/JourneyPlansSection";
import { JourneyTimelineSection } from "@/src/features/journey/components/JourneyTimelineSection";
import { JourneyMilestonesSection } from "@/src/features/journey/components/JourneyMilestonesSection";
import { SyncStatusPill } from "@/src/components/common/SyncStatusPill";

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-slate-900 text-lg mb-3 mt-8">{children}</Text>
  );
}

export default function JourneyScreen() {
  const router = useRouter();
  const {
    data,
    loading,
    loadMorePlans,
    hasMorePlans,
    loadMoreSessions,
    hasMoreSessions,
    sessionsLoading,
    totalPlans,
  } = useJourney();

  return (
    <>
      <Header title="Journey" />
      <Screen className="px-0">
      <ScreenContent>
        <View
          className="flex-row items-center mb-6 px-4"
        >
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center bg-slate-100 mr-3"
          >
            <Ionicons name="arrow-back" size={18} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-slate-900 text-xl">Journey</Text>
            <Text className="text-slate-500 text-xs">
              Your Hifz & Muraja progress
            </Text>
            <View className="mt-2">
              <SyncStatusPill />
            </View>
          </View>
        </View>

        {loading ? (
          <View className="py-24 items-center px-4">
            <ActivityIndicator size="large" color="#276359" />
            <Text className="text-slate-500 text-sm mt-4">Loading journey…</Text>
          </View>
        ) : !data ? (
          <View className="mx-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 items-center">
            <Text className="text-slate-900 text-base text-center">
              Start your journey
            </Text>
            <Text className="text-slate-500 text-sm mt-2 text-center">
              Create a Hifz or Muraja plan to track progress, streaks, and milestones.
            </Text>
            <Button
              onPress={() => router.push("/(app)/hifz/create-hifz-plan")}
              className="mt-6 w-full"
            >
              Create Hifz plan
            </Button>
            <Button
              variant="outline"
              onPress={() => router.push("/(app)/muraja/create-muraja-plan")}
              className="mt-3 w-full"
            >
              Create Muraja plan
            </Button>
          </View>
        ) : (
          <View className="px-4">
            <JourneyOverviewSection overview={data.overview} />

            <View className="mt-8">
              <JourneyStatsSection stats={data.stats} testStats={data.testStats} />
            </View>

            <SectionTitle>All plans</SectionTitle>
            <JourneyPlansSection
              plans={data.plans}
              totalCount={totalPlans}
              hasMore={hasMorePlans}
              onLoadMore={loadMorePlans}
            />
            {totalPlans === 0 ? (
              <View className="flex-row gap-2 mt-3">
                <Button
                  onPress={() => router.push("/(app)/hifz/create-hifz-plan")}
                  className="flex-1"
                >
                  Hifz plan
                </Button>
                <Button
                  variant="outline"
                  onPress={() => router.push("/(app)/muraja/create-muraja-plan")}
                  className="flex-1"
                >
                  Muraja plan
                </Button>
              </View>
            ) : null}

            <SectionTitle>Session log</SectionTitle>
            <JourneyTimelineSection
              sessions={data.sessions}
              hasMore={hasMoreSessions}
              loadingMore={sessionsLoading}
              onLoadMore={loadMoreSessions}
            />

            <SectionTitle>Achievements</SectionTitle>
            <JourneyMilestonesSection milestones={data.milestones} />
          </View>
        )}

        <View className="h-16" />
      </ScreenContent>
      </Screen>
    </>
  );
}
