import { WeeklyPerformanceReport } from "@/src/features/habits/services/AdaptivePlanService";
import { View } from "react-native";
import {
  EvaluationHeader,
  ExamGateCard,
  LockedRecommendationCard,
  MetricTile,
  RecommendationCard,
  SectionCard,
  SuggestionAlert,
  TargetRow,
} from "./shared";

export function MurajaOnlyEvaluation({
  report,
  needsExam,
  isFinalizing,
  error,
  onTakeExam,
  onFinalize,
}: {
  report: WeeklyPerformanceReport;
  needsExam: boolean;
  isFinalizing: boolean;
  error: string | null;
  onTakeExam: () => void;
  onFinalize: () => void;
}) {
  const recommendationUnlocked = !needsExam || report.murajaTestScore !== undefined;

  return (
    <View className="pb-20">
      <EvaluationHeader
        eyebrow="Evaluation Due"
        title="Muraja Weekly Review"
        description="Your revision cycle is ready for evaluation. This screen stays focused on Muraja pacing and consistency."
      />

      <View className="gap-6">
        <SectionCard>
          <View className="flex-row flex-wrap gap-4">
            <MetricTile label="Muraja Consistency" value={`${report.murajaCompletion.toFixed(0)}%`} accent="primary" />
            <MetricTile label="Pages Revised" value={`${report.murajaTotalCompletedPages}`} />
            <MetricTile label="Days Missed" value={`${report.murajaMissedDays}`} accent={report.murajaMissedDays > 0 ? "amber" : "primary"} />
          </View>
        </SectionCard>

        {needsExam ? (
          <ExamGateCard
            title="Muraja Revision Test"
            description="This test is scoped to the pages you revised in this cycle. Complete it before finalizing the new revision pace."
            buttonLabel={report.murajaTestScore !== undefined ? `Retake Muraja Exam (${report.murajaTestScore.toFixed(0)}%)` : "Start Muraja Exam"}
            onPress={onTakeExam}
            headerTone="amber"
          />
        ) : null}

        {recommendationUnlocked ? (
          <RecommendationCard
            title="Adjusted Revision Goal"
            description={report.recommendation}
            actionLabel="Accept & Adjust Plan"
            onAction={onFinalize}
            isLoading={isFinalizing}
            error={error}
          >
            {report.hifzAdaptiveSuggestion ? (
              <SuggestionAlert
                title="Pace Balance Recommended"
                message={report.hifzAdaptiveSuggestion.message}
                currentValue={`${report.hifzAdaptiveSuggestion.currentHifzTarget} pgs/day`}
                suggestedValue={
                  report.hifzAdaptiveSuggestion.action === "pause"
                    ? "Pause new Hifz"
                    : `${report.hifzAdaptiveSuggestion.suggestedHifzTarget} pgs/day`
                }
              />
            ) : null}

            <TargetRow
              label="Daily Muraja"
              detail="Revised pages per day"
              value={`${report.suggestedMurajaTarget} pgs`}
            />
          </RecommendationCard>
        ) : (
          <LockedRecommendationCard message="Your recommendation will unlock after you complete the Muraja revision test." />
        )}
      </View>
    </View>
  );
}
