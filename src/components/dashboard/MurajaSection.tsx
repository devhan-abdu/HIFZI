import { WeeklyOverviewCard } from "@/src/features/muraja/components/WeeklyOverviewCard";
import { useMurajaAnalytics } from "@/src/features/muraja/hooks/useMurajaAnalytics";
import { View } from "react-native";
import { SectionSkeleton } from "./Skeleton";
import { SectionHeader } from "../SectionHeader";

export function MurajaSection() {
  const { loading, planOverview, stats } = useMurajaAnalytics();

  if (loading) return <SectionSkeleton />;
  if (!planOverview) return null;

  return (
    <View>
      <SectionHeader title="Muraja Plan" />
      <WeeklyOverviewCard weeklyPlan={planOverview} stats={stats} />
    </View>
  );
}
