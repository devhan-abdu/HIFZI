import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { ReviewSkeleton } from "@/src/features/muraja/components/skeletons";
import { useWeeklyReview } from "@/src/features/muraja/hooks/useWeeklyReview";
import { formatWeekRange } from "@/src/features/muraja/utils/dateHelpers";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { WeeklyReviewView } from "@/src/features/muraja/components/WeeklyReviewView";
import { SectionHeader } from "@/src/components/SectionHeader";

export default function WeeklyReviewPage() {
  const router = useRouter();
  const { review } = useLocalSearchParams<{ review: string }>();
  const { plan, analytics, isLoading, isError, refetch } = useWeeklyReview(
    review ? Number(review) : undefined,
  );

  if (isLoading) return <ReviewSkeleton />;

  if (isError) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text className="text-lg   mt-4">Something went wrong</Text>
          <Text className="text-gray-500 text-center mb-6">
            We couldn't load your review data.
          </Text>
          <Button onPress={() => refetch()} className="w-full">
            Try Again
          </Button>
        </View>
      </Screen>
    );
  }
  if (!plan || !analytics) {
    return (
      <Screen>
        {/* <Stack.Screen
          options={{
            headerTitle: "Weekly Review",
            headerShadowVisible: true
          }}
        /> */}
        <View className="flex-1 items-center justify-center p-6 mt-20">
          <View className="bg-gray-100 p-6 rounded-full mb-4">
            <Ionicons name="calendar-outline" size={60} color="#94a3b8" />
          </View>
          <Text className="text-xl   text-gray-900 mb-2 text-center">
            No Review Found
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            We couldn't find the plan data for this week. It might have been
            deleted or not yet completed.
          </Text>
          <Button onPress={() => router.back()} className="w-full">
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  const weekRange = formatWeekRange(plan?.week_start_date, plan?.week_end_date);

  return (
    <>
      <Screen>
        <ScreenContent>
          <SectionHeader
            title="Weekly Review"
            badge={`${plan.weekly_plan_days.length || 0} Sessions`}
          />
          <WeeklyReviewView
            plan={plan}
            analytics={analytics}
            weekRange={weekRange}
          />
        </ScreenContent>
      </Screen>
    </>
  );
}
