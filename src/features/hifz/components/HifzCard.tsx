import { useHifzCardState } from "@/src/features/hifz/hooks/useHifzCardState";
import { useHifzPlan } from "@/src/features/hifz/hooks/useHifzPlan";
import { PlanEndCard } from "@/src/features/habits/components/PlanEndCard";
import { HifzActionCard } from "./HifzActionCard";
import { CardSkeleton } from "@/src/components/dashboard/Skeleton";
import { EvaluationRequiredCard, RestDayCardSingle } from "@/src/components/dashboard/TodayTask";

export const HifzCard = ({ onLog }: { onLog: () => void }) => {
  const state = useHifzCardState();
  const { hifz } = useHifzPlan();

  switch (state.type) {
    case 'LOADING':
      return <CardSkeleton />;
    case 'NO_PLAN':
      return null;
    case 'EVALUATION_DUE':
      return <EvaluationRequiredCard type="hifz" planId={hifz?.id} />;
    case 'PLAN_FINISHED':
      return <PlanEndCard activityType="HIFZ" localRefId={hifz?.id ?? 0} title={hifz?.startSurah?.toString() ?? ''} />;
    case 'COMPLETED_TODAY':
    case 'PLANNED_DAY':
    case 'CATCHUP_DAY':
      return (
        <HifzActionCard
          hifz={hifz!}
          task={state.task}
          title={state.task.displaySurah}
          subTitle={`Target: ${state.task.totalTarget} pages · Pages ${state.task.startPage}–${state.task.endPage}`}
          onDetails={onLog}
        />
      );
    default:
      return <RestDayCardSingle type="hifz" onLog={onLog} />;
  }
};