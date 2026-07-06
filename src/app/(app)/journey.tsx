import { View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Header } from "@/src/components/navigation/Header";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { Text } from "@/src/components/common/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { useJourney } from "@/src/features/journey/hooks/useJourney";
import { JourneyActivePlanHero } from "@/src/features/journey/components/JourneyActivePlanHero";
import { JourneyStatsSection } from "@/src/features/journey/components/JourneyStatsSection";
import { JourneyPlansSection } from "@/src/features/journey/components/JourneyPlansSection";
import { JourneyTimelineSection } from "@/src/features/journey/components/JourneyTimelineSection";
import { SyncStatusPill } from "@/src/components/common/SyncStatusPill";
import { AchievementSection } from "@/src/components/dashboard/AchievementSection";
import { useUserBadges } from "@/src/hooks/useUserBadges";
import { useNavigate } from "@/src/hooks/useNavigate";
import { useAppActiveRefresh } from "@/src/hooks/useAppActiveRefresh";

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-text text-lg mb-3 mt-8">{children}</Text>
  );
}

export default function JourneyScreen() {
  const { push, back } = useNavigate();
  const {
    data,
    loading,
    loadMorePlans,
    hasMorePlans,
    loadMoreSessions,
    hasMoreSessions,
    sessionsLoading,
    totalPlans,
    refetch,
  } = useJourney();

  const { data: badges = [] } = useUserBadges();

  
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  useAppActiveRefresh(useCallback(() => {
    refetch();
  }, [refetch]));

  const activePlan = data?.plans.find((p) => p.status === "active") ?? null;

  return (
    <>
      <Header title="Journey" />
      <Screen className="px-0">
        <ScreenContent>
          {/* Page header */}
          <View className="flex-row items-center mb-6 px-4">
            <Pressable
              onPress={() => back()}
              className="w-10 h-10 rounded-full items-center justify-center bg-surface mr-3"
            >
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-text text-xl">Journey</Text>
              <Text className="text-muted text-xs">
                Your Hifz & Muraja progress
              </Text>
              <View className="mt-2">
                <SyncStatusPill />
              </View>
            </View>
          </View>

          {/* ── Loading ── */}
          {loading ? (
            <View className="py-24 items-center px-4">
              <ActivityIndicator size="large" color="#276359" />
              <Text className="text-muted text-sm mt-4">
                Loading journey…
              </Text>
            </View>

          ) : !data ? (
            <View className="mx-4 rounded-2xl border border-dashed border-border bg-background p-8 items-center">
              <Text className="text-text text-base text-center">
                Start your journey
              </Text>
              <Text className="text-muted text-sm mt-2 text-center">
                Create a Hifz or Muraja plan to track progress, streaks, and
                milestones.
              </Text>
              <Button
                onPress={() => push("/(app)/hifz/create-hifz-plan")}
                className="mt-6 w-full"
              >
                Create Hifz plan
              </Button>
              <Button
                variant="outline"
                onPress={() => push("/(app)/muraja/create-muraja-plan")}
                className="mt-3 w-full"
              >
                Create Muraja plan
              </Button>
            </View>

          ) : (
            <View className="px-4">

              <JourneyActivePlanHero
                activePlan={activePlan}
                overview={data.overview}
              />

              <View className="mt-8">
                <JourneyStatsSection
                  stats={data.stats}
                  testStats={data.testStats}
                />
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
                    onPress={() => push("/(app)/hifz/create-hifz-plan")}
                    className="flex-1"
                  >
                    Hifz plan
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => push("/(app)/muraja/create-muraja-plan")}
                    className="flex-1"
                  >
                    Muraja plan
                  </Button>
                </View>
              ) : null}

              {/* ── Session log ── */}
              <SectionTitle>Session log</SectionTitle>
              <JourneyTimelineSection
                sessions={data.sessions}
                hasMore={hasMoreSessions}
                loadingMore={sessionsLoading}
                onLoadMore={loadMoreSessions}
              />

              {/* ── Real achievements from local DB (same as dashboard) ── */}
              <SectionTitle>Achievements</SectionTitle>
              {badges.length === 0 ? (
                <View className="rounded-2xl border border-dashed border-border bg-background p-6 mb-4">
                  <Text className="text-text">No achievements yet</Text>
                  <Text className="text-muted text-sm mt-1">
                    Keep logging sessions and passing evaluations to earn
                    badges.
                  </Text>
                </View>
              ) : (
                <View className="mb-4">
                  <AchievementSection badges={badges} />
                </View>
              )}
            </View>
          )}

          <View className="h-16" />
        </ScreenContent>
      </Screen>
    </>
  );
}
