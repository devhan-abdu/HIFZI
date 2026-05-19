import { WeeklyPerformanceReport } from "@/src/features/habits/services/AdaptivePlanService";
import { Text } from "@/src/components/common/ui/Text";
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

export function DualEvaluation({
  report,
  hifzExamRequired,
  murajaExamRequired,
  hifzExamPassed,
  murajaExamCompleted,
  nextExamType,
  isFinalizing,
  error,
  onTakeHifzExam,
  onTakeMurajaExam,
  onFinalize,
}: {
  report: WeeklyPerformanceReport;
  hifzExamRequired: boolean;
  murajaExamRequired: boolean;
  hifzExamPassed: boolean;
  murajaExamCompleted: boolean;
  nextExamType: "HIFZ" | "MURAJA" | null;
  isFinalizing: boolean;
  error: string | null;
  onTakeHifzExam: () => void;
  onTakeMurajaExam: () => void;
  onFinalize: () => void;
}) {
  const recommendationUnlocked =
    (!hifzExamRequired || hifzExamPassed) &&
    (!murajaExamRequired || murajaExamCompleted);

  return (
    <View className="pb-20">
      <EvaluationHeader
        eyebrow="Evaluation Due"
        title="Dual Weekly Review"
        description="Both plans reached evaluation together, so this review keeps Hifz and Muraja aligned without mixing in unrelated states."
      />

      <View className="gap-6">
        <SectionCard>
          <View className="flex-row flex-wrap gap-4">
            <MetricTile label="Hifz Done" value={`${report.hifzCompletion.toFixed(0)}%`} accent="primary" />
            <MetricTile label="Muraja Done" value={`${report.murajaCompletion.toFixed(0)}%`} accent="primary" />
            <MetricTile label="Pages Completed" value={`${report.windowCompletedPages}`} />
            <MetricTile label="Days Missed" value={`${report.windowMissedDays}`} accent={report.windowMissedDays > 0 ? "amber" : "primary"} />
          </View>
        </SectionCard>

        {(hifzExamRequired || murajaExamRequired) ? (
          <SectionCard>
            <View className="mb-5">
              <Text className="text-[10px] uppercase tracking-[1.6px] text-slate-500">Sequential Exams</Text>
              <Text className="mt-2 text-2xl text-slate-900">Assessment Gate</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-500">
                Complete the required exams in order. Only the next valid exam is unlocked at each step.
              </Text>
            </View>

            <View className="gap-4">
              {hifzExamRequired ? (
                <ExamGateCard
                  title="Hifz Exam"
                  description="This Hifz exam covers the exact pages memorized in this cycle."
                  buttonLabel={report.hifzTestScore !== undefined ? `Retake Hifz Exam (${report.hifzTestScore.toFixed(0)}%)` : "Start Hifz Exam"}
                  onPress={onTakeHifzExam}
                  headerTone="rose"
                  disabled={nextExamType !== "HIFZ"}
                  footerNote={
                    report.hifzTestScore !== undefined && !hifzExamPassed
                      ? "A passing score is 75% or higher."
                      : undefined
                  }
                />
              ) : null}

              {murajaExamRequired ? (
                <ExamGateCard
                  title="Muraja Exam"
                  description="This Muraja exam covers the exact pages revised in this cycle."
                  buttonLabel={report.murajaTestScore !== undefined ? `Retake Muraja Exam (${report.murajaTestScore.toFixed(0)}%)` : "Start Muraja Exam"}
                  onPress={onTakeMurajaExam}
                  headerTone="amber"
                  disabled={nextExamType !== "MURAJA"}
                />
              ) : null}
            </View>
          </SectionCard>
        ) : null}

        {recommendationUnlocked ? (
          <RecommendationCard
            title="Adjusted Plan Targets"
            description={report.recommendation}
            actionLabel="Accept & Adjust Plan"
            onAction={onFinalize}
            isLoading={isFinalizing}
            error={error}
          >
            <TargetRow label="Daily Hifz" detail="Revised pages per day" value={`${report.suggestedHifzTarget} pgs`} />
            <TargetRow label="Daily Muraja" detail="Revised pages per day" value={`${report.suggestedMurajaTarget} pgs`} />
          </RecommendationCard>
        ) : (
          <LockedRecommendationCard message="Your joint recommendation will unlock after the required exams are completed in sequence." />
        )}
      </View>
    </View>
  );
}
