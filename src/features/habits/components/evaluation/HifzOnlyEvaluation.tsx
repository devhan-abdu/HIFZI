import { WeeklyPerformanceReport } from "@/src/features/habits/services/AdaptivePlanService";
import { View } from "react-native";
import {
  EvaluationHeader,
  ExamGateCard,
  LockedRecommendationCard,
  MetricTile,
  RecommendationCard,
  SectionCard,
  TargetRow,
} from "./shared";

export function HifzOnlyEvaluation({
  report,
  needsExam,
  examPassed,
  isFinalizing,
  error,
  onTakeExam,
  onFinalize,
}: {
  report: WeeklyPerformanceReport;
  needsExam: boolean;
  examPassed: boolean;
  isFinalizing: boolean;
  error: string | null;
  onTakeExam: () => void;
  onFinalize: () => void;
}) {
  const recommendationUnlocked = !needsExam || examPassed;

  return (
    <View className="pb-20">
      <EvaluationHeader
        eyebrow="Evaluation Due"
        title="Hifz Weekly Review"
        description="Your Hifz cycle is ready for evaluation. This screen stays focused on memorization only."
      />

      <View className="gap-6">
        <SectionCard>
          <View className="flex-row flex-wrap gap-4">
            <MetricTile label="Hifz Completion" value={`${report.hifzCompletion.toFixed(0)}%`} accent="primary" />
            <MetricTile label="Pages Completed" value={`${report.hifzTotalCompletedPages}`} />
            <MetricTile
              label="Days Missed"
              value={`${report.hifzMissedDays}`}
              accent={report.hifzMissedDays > 0 ? "muted" : "default"}
            />
          </View>
        </SectionCard>

        {needsExam ? (
          <ExamGateCard
            title="Hifz Mastery Exam"
            description="This exam is scoped to the exact pages you memorized in this cycle. Pass the exam to unlock your next Hifz recommendation."
            buttonLabel={report.hifzTestScore !== undefined ? `Retake Hifz Exam (${report.hifzTestScore.toFixed(0)}%)` : "Start Hifz Exam"}
            onPress={onTakeExam}
            footerNote={report.hifzTestScore !== undefined && !examPassed ? "A passing score is 75% or higher." : undefined}
          />
        ) : null}

        {recommendationUnlocked ? (
          <RecommendationCard
            title="Adjusted Hifz Target"
            description={report.recommendation}
            actionLabel="Accept & Adjust Plan"
            onAction={onFinalize}
            isLoading={isFinalizing}
            error={error}
          >
            <TargetRow
              label="Daily Hifz"
              detail="Revised pages per day"
              value={`${report.suggestedHifzTarget} pgs`}
            />
          </RecommendationCard>
        ) : (
          <LockedRecommendationCard message="Your recommendation will unlock after you pass the Hifz mastery exam." />
        )}
      </View>
    </View>
  );
}
