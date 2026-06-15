import { useMurajaCardState } from "@/src/features/muraja/hooks/useMurajaCardState";
import { useMurajaAnalytics } from "@/src/features/muraja/hooks/useMurajaAnalytics";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";
import { MurajaActionCard } from "./MurajaActionCard";
import { EvaluationRequiredCard,RestDayCardSingle } from "@/src/components/dashboard/TodayTask";
import { CardSkeleton } from "@/src/components/dashboard/Skeleton";

export const MurajaCard = ({ onLog }: { onLog: () => void }) => {
  const state = useMurajaCardState();
  const { weeklyPlan } = useMurajaAnalytics() ?? {};

  switch (state.type) {
    case "LOADING":
      return <CardSkeleton />;
    case "NO_PLAN":
      return null;
    case "EVALUATION_DUE":
      return <EvaluationRequiredCard type="muraja" planId={weeklyPlan?.id} />;
    case "PLAN_FINISHED":
      return (
        <PlanEndCard
          activityType="MURAJA"
          localRefId={weeklyPlan?.id ?? 0}
          title="Muraja Plan"
        />
      );
    case "COMPLETED_TODAY":
    case "PLANNED_DAY":
    case "CATCHUP_DAY":
      return (
        <MurajaActionCard
          todayPlan={state.task}
          weeklyPlan={weeklyPlan ?? null}
          onDetails={onLog}
        />
      );
    default:
       return <RestDayCardSingle type="muraja" onLog={onLog} />;
  }
};
