import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { AdaptivePlanService, WeeklyPerformanceReport } from "@/src/features/habits/services/AdaptivePlanService";
import { useWeeklyEvaluationTrigger } from "@/src/features/habits/hooks/useWeeklyEvaluationTrigger";
import type { DuePlanInfo } from "../services/habitSummaryService";
import type { IHifzPlan } from "@/src/features/hifz/types";

type EvaluationCase = "HIFZ_ONLY" | "MURAJA_ONLY" | "DUAL" | null;

function computeMurajaEndDate(currentData: any, murajaTarget: number) {
  if (!currentData || !murajaTarget || murajaTarget <= 0) {
    return currentData?.weekEndDate ?? currentData?.week_end_date ?? null;
  }

  const endPage = currentData.endPage ?? currentData.end_page ?? 0;
  const lastPage = currentData.muraja_last_page ?? 0;
  const remainingPages = Math.max(0, endPage - lastPage);

  const selectedDaysRaw = currentData.selectedDays ?? currentData.selected_days ?? [];
  const parsedDays = typeof selectedDaysRaw === "string"
    ? JSON.parse(selectedDaysRaw)
    : selectedDaysRaw;
  const weeklyFreq = parsedDays?.length || 7;
  const dailyRate = Math.max(1, murajaTarget);
  const sessionNeeded = Math.ceil(remainingPages / dailyRate);
  let daysNeeded = 1;
  if (sessionNeeded > 1) {
    daysNeeded = Math.ceil(((sessionNeeded - 1) / weeklyFreq) * 7) + 1;
  }

  const nextEndDate = new Date();
  nextEndDate.setDate(nextEndDate.getDate() + (daysNeeded - 1));
  return nextEndDate.toISOString().slice(0, 10);
}

function getOptimisticHifzTarget(report: WeeklyPerformanceReport) {
  if (report.evaluatedTypes.includes("HIFZ")) {
    return report.suggestedHifzTarget;
  }

  return report.hifzAdaptiveSuggestion?.suggestedHifzTarget;
}

export function useWeeklyEvaluation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { duePlans, duePlanIds, weekStartDate, isLoading: dueLoading } = useWeeklyEvaluationTrigger();

  const [report, setReport] = useState<WeeklyPerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const loadReport = useCallback(async () => {
    if (!user?.id) {
      setReport(null);
      setLoading(false);
      return;
    }

    if (dueLoading) {
      return;
    }

    if (duePlanIds.length === 0) {
      setReport(null);
      setScreenError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setScreenError(null);

    try {
      const data = await AdaptivePlanService.evaluateWeeklyPerformance(user.id, weekStartDate, duePlanIds);
      setReport(data);
    } catch (error) {
      console.error("Evaluation Error:", error);
      setScreenError("We couldn't load this evaluation right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dueLoading, duePlanIds, user?.id, weekStartDate]);

  useFocusEffect(
    useCallback(() => {
      void loadReport();
    }, [loadReport])
  );

  const isHifzDue = useMemo(
    () => duePlans.some((plan) => plan.activityType === "HIFZ"),
    [duePlans]
  );
  const isMurajaDue = useMemo(
    () => duePlans.some((plan) => plan.activityType === "MURAJA"),
    [duePlans]
  );

  const caseType = useMemo<EvaluationCase>(() => {
    if (isHifzDue && isMurajaDue) return "DUAL";
    if (isHifzDue) return "HIFZ_ONLY";
    if (isMurajaDue) return "MURAJA_ONLY";
    return null;
  }, [isHifzDue, isMurajaDue]);

  const hifzExamRequired = !!report && isHifzDue && report.hifzTestPages.length > 0;
  const murajaExamRequired = !!report && isMurajaDue && report.murajaTestPages.length > 0;
  const hifzExamPassed = report?.hifzTestScore !== undefined && report.hifzTestScore >= 75;
  const murajaExamCompleted = report?.murajaTestScore !== undefined;

  const nextExamType = useMemo<"HIFZ" | "MURAJA" | null>(() => {
    if (caseType !== "DUAL") return null;
    if (hifzExamRequired && !hifzExamPassed) return "HIFZ";
    if (murajaExamRequired && !murajaExamCompleted) return "MURAJA";
    return null;
  }, [caseType, hifzExamPassed, hifzExamRequired, murajaExamCompleted, murajaExamRequired]);

  const handleTakeExam = useCallback(
    (type: "HIFZ" | "MURAJA") => {
      if (!report) return;

      const pages = type === "HIFZ" ? report.hifzTestPages : report.murajaTestPages;
      const planId = duePlans.find((plan) => plan.activityType === type)?.localRefId;

      if (pages.length === 0) return;

      const encodedPages = encodeURIComponent(JSON.stringify(pages));
      const encodedType = encodeURIComponent(type);
      const planSegment = planId ? `&planId=${planId}` : "";

      router.push(`/(app)/test/exam?pages=${encodedPages}&type=${encodedType}${planSegment}`);
    },
    [duePlans, report, router]
  );

  const handleFinalize = useCallback(async () => {
    if (!user?.id || !report || isFinalizing) return;

    setInlineError(null);
    setIsFinalizing(true);

    const optimisticHifzTarget = getOptimisticHifzTarget(report);
    const dueActivityPlanIds = duePlans.map((plan) => plan.id);

    await Promise.all([
      queryClient.cancelQueries({ queryKey: ["hifz", user.id] }),
      queryClient.cancelQueries({ queryKey: ["hifz-plan", user.id] }),
      queryClient.cancelQueries({ queryKey: ["muraja-dashboard", user.id] }),
      queryClient.cancelQueries({ queryKey: ["weekly-evaluation-due", user.id] }),
    ]);

    const snapshots = {
      hifz: queryClient.getQueryData(["hifz", user.id]),
      hifzPlan: queryClient.getQueryData(["hifz-plan", user.id]),
      murajaDashboard: queryClient.getQueryData(["muraja-dashboard", user.id]),
      weeklyDue: queryClient.getQueryData(["weekly-evaluation-due", user.id]),
    };

    if (optimisticHifzTarget !== undefined) {
      const applyHifzTarget = (current: unknown) => {
        if (!current) return current;
        return { ...(current as IHifzPlan), pagesPerDay: optimisticHifzTarget };
      };

      queryClient.setQueryData(["hifz", user.id], applyHifzTarget);
      queryClient.setQueryData(["hifz-plan", user.id], applyHifzTarget);
    }

    if (report.evaluatedTypes.includes("MURAJA")) {
      queryClient.setQueryData(["muraja-dashboard", user.id], (current: any) => {
        if (!current) return current;

        const optimisticEndDate = computeMurajaEndDate(current, report.suggestedMurajaTarget);

        return {
          ...current,
          plannedPagesPerDay: report.suggestedMurajaTarget,
          planned_pages_per_day: report.suggestedMurajaTarget,
          weekEndDate: optimisticEndDate,
          week_end_date: optimisticEndDate,
        };
      });
    }

    queryClient.setQueryData(["weekly-evaluation-due", user.id], (current: DuePlanInfo[] | undefined) => {
      if (!current) return [];
      return current.filter((plan) => !dueActivityPlanIds.includes(plan.id));
    });

    try {
      await AdaptivePlanService.applyRecommendation(
        user.id,
        optimisticHifzTarget ?? report.suggestedHifzTarget,
        report.suggestedMurajaTarget,
        report.evaluatedTypes,
        dueActivityPlanIds
      );

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hifz", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["hifz-plan", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["muraja-dashboard", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["habit-progress", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["weekly-evaluation-due", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["adaptive-guidance", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions-v2", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["finished-plans", user.id] }),
      ]);

      router.replace("/(app)");
    } catch (error) {
      console.error("Finalize Error:", error);
      queryClient.setQueryData(["hifz", user.id], snapshots.hifz);
      queryClient.setQueryData(["hifz-plan", user.id], snapshots.hifzPlan);
      queryClient.setQueryData(["muraja-dashboard", user.id], snapshots.murajaDashboard);
      queryClient.setQueryData(["weekly-evaluation-due", user.id], snapshots.weeklyDue);
      setInlineError("We couldn't save your updated plan. Your previous settings have been restored.");
    } finally {
      setIsFinalizing(false);
    }
  }, [duePlans, isFinalizing, queryClient, report, router, user?.id]);

  return {
    report,
    loading: dueLoading || loading,
    screenError,
    inlineError,
    isFinalizing,
    isAccessible: duePlanIds.length > 0,
    isHifzDue,
    isMurajaDue,
    caseType,
    hifzExamRequired,
    murajaExamRequired,
    hifzExamPassed,
    murajaExamCompleted,
    nextExamType,
    handleTakeExam,
    handleFinalize,
    reload: loadReport,
  };
}
