import { useCallback, useEffect, useState } from "react";
import {  useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { AdaptivePlanService, WeeklyPerformanceReport } from "@/src/features/habits/services/AdaptivePlanService";
import type { IHifzPlan } from "@/src/features/hifz/types";
import { getLocalDateString } from "../../muraja/utils/murajaAnalytics";
import { activityPlans } from "../database/habitSchema";
import { db } from "@/src/lib/db/local-client";
import { eq, and } from "drizzle-orm";

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

export function useWeeklyEvaluation(type: "HIFZ" | "MURAJA", planId: number | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
   const isHifz = type === 'HIFZ';
  const isMuraja = type === 'MURAJA';

  const [report, setReport] = useState<WeeklyPerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const loadReport = useCallback(async () => {
   if (!user?.id || !planId || !type) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setScreenError(null);

      try {
      const todayStr = getLocalDateString(new Date());
      const data = await AdaptivePlanService.evaluateWeeklyPerformance(
        user.id,
        todayStr,
        [planId]
      );
      setReport(data);
    } catch {
      setScreenError("We couldn't load this evaluation right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, planId, type]);

  useEffect(() => { void loadReport(); }, [loadReport]);

   const examRequired = !!report && (
    isHifz ? report.hifzTestPages.length > 0
            : report.murajaTestPages.length > 0
  );
  const examPassed = isHifz
    ? (report?.hifzTestScore !== undefined && report.hifzTestScore >= 75)
    : (report?.murajaTestScore !== undefined);

 

  const handleTakeExam = useCallback(() => {
    if (!report || !planId) return;
    const pages = isHifz ? report.hifzTestPages : report.murajaTestPages;
    if (pages.length === 0) return;
    router.push(
      `/(app)/test/exam?pages=${encodeURIComponent(JSON.stringify(pages))}&type=${type}&planId=${planId}`
    );
  }, [report, planId, isHifz, type, router]);

 const handleFinalize = useCallback(async () => {
  if (!user?.id || !report || !planId || isFinalizing) return;

  setInlineError(null);
  setIsFinalizing(true);

  const todayStr = getLocalDateString(new Date());
  const optimisticHifzTarget = getOptimisticHifzTarget(report);

  await Promise.all([
    queryClient.cancelQueries({ queryKey: ['hifz', user.id] }),
    queryClient.cancelQueries({ queryKey: ['hifz-plan', user.id] }),
    queryClient.cancelQueries({ queryKey: ['muraja-dashboard', user.id] }),
  ]);

  const snapshots = {
    hifz: queryClient.getQueryData(['hifz', user.id]),
    hifzPlan: queryClient.getQueryData(['hifz-plan', user.id]),
    murajaDashboard: queryClient.getQueryData(['muraja-dashboard', user.id]),
  };

  if (isHifz && optimisticHifzTarget !== undefined) {
    const applyHifzTarget = (current: unknown) => {
      if (!current) return current;
      return { ...(current as IHifzPlan), pagesPerDay: optimisticHifzTarget };
    };
    queryClient.setQueryData(['hifz', user.id], applyHifzTarget);
    queryClient.setQueryData(['hifz-plan', user.id], applyHifzTarget);
  }

  if (isMuraja && report.evaluatedTypes.includes('MURAJA')) {
    queryClient.setQueryData(['muraja-dashboard', user.id], (current: any) => {
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

  try {
    await AdaptivePlanService.applyRecommendation(
      user.id,
      optimisticHifzTarget ?? report.suggestedHifzTarget,
      report.suggestedMurajaTarget,
      report.evaluatedTypes,
      [planId]
    );

    await db.update(activityPlans)
      .set({ lastEvaluationDate: todayStr })
      .where(and(
        eq(activityPlans.userId, user.id),
        eq(activityPlans.localRefId, planId),
        eq(activityPlans.activityType, type)
      ));

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hifz', user.id] }),
      queryClient.invalidateQueries({ queryKey: ['hifz-plan', user.id] }),
      queryClient.invalidateQueries({ queryKey: ['muraja-dashboard', user.id] }),
      queryClient.invalidateQueries({ queryKey: ['habit-progress', user.id] }),
      queryClient.invalidateQueries({ queryKey: ['adaptive-guidance', user.id] }),
      queryClient.invalidateQueries({ queryKey: ['hifz-review-suggestions', user.id] }),
      queryClient.invalidateQueries({ queryKey: ['hifz-review-suggestions-v2', user.id] }),
    ]);

    router.replace('/(app)');
  } catch (error) {
    console.error('Finalize Error:', error);

    queryClient.setQueryData(['hifz', user.id], snapshots.hifz);
    queryClient.setQueryData(['hifz-plan', user.id], snapshots.hifzPlan);
    queryClient.setQueryData(['muraja-dashboard', user.id], snapshots.murajaDashboard);

    setInlineError("We couldn't save your updated plan. Your previous settings have been restored.");
  } finally {
    setIsFinalizing(false);
  }
}, [user?.id, report, planId, isFinalizing, isHifz, isMuraja, type, queryClient, router]);

 return {
    report,
    loading,
    screenError,
    inlineError,
    isFinalizing,
    isAccessible: !!type && !!planId,
    isHifz,
    isMuraja,
    examRequired,
    examPassed,
    handleTakeExam,
    handleFinalize,
    reload: loadReport,
  };
}
