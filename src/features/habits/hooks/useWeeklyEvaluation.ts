import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/src/hooks/useSession";
import { AdaptivePlanService, WeeklyPerformanceReport } from "@/src/features/habits/services/AdaptivePlanService";
import { habitSummaryService } from "@/src/features/habits/services/habitSummaryService";
import { useWeeklyEvaluationTrigger } from "@/src/features/habits/hooks/useWeeklyEvaluationTrigger";

export function useWeeklyEvaluation() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useSession();
    const { duePlanIds, weekStartDate } = useWeeklyEvaluationTrigger();

    const [report, setReport] = useState<WeeklyPerformanceReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [coachMessage, setCoachMessage] = useState<string>("");
    const [coachLoading, setCoachLoading] = useState(false);
    const [showCoach, setShowCoach] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    const loadReport = useCallback(async () => {
        if (!user?.id || duePlanIds.length === 0) return;
        
        setLoading(true);
        try {
            const data = await AdaptivePlanService.evaluateWeeklyPerformance(user.id, weekStartDate, duePlanIds);
            setReport(data);
            setLoading(false);
            
            const isHifzDue = data.evaluatedTypes.includes("HIFZ");
            const isMurajaDue = data.evaluatedTypes.includes("MURAJA");
            const needsHifzTest = isHifzDue && data.hifzTestPages.length > 0 && data.hifzTestScore === undefined;
            const needsMurajaTest = isMurajaDue && data.murajaTestPages.length > 0 && data.murajaTestScore === undefined;
            const isFinal = !(needsHifzTest || needsMurajaTest);

            const cachedMsg = await AdaptivePlanService.checkCachedMessage(user.id, data, isFinal);
            if (cachedMsg) {
                setCoachMessage(cachedMsg);
                setShowCoach(true);
            } else {
                setCoachMessage("");
            }
        } catch (e) {
            console.error("Evaluation Error:", e);
        } finally {
            setLoading(false);
            setCoachLoading(false);
        }
    }, [user?.id, duePlanIds, weekStartDate]);

    const fetchCoachMessage = async () => {
        if (!user?.id || !report || coachLoading) return;
        
        setCoachLoading(true);
        try {
            const isHifzDue = report.evaluatedTypes.includes("HIFZ");
            const isMurajaDue = report.evaluatedTypes.includes("MURAJA");
            const needsHifzTest = isHifzDue && report.hifzTestPages.length > 0 && report.hifzTestScore === undefined;
            const needsMurajaTest = isMurajaDue && report.murajaTestPages.length > 0 && report.murajaTestScore === undefined;
            const isFinal = !(needsHifzTest || needsMurajaTest);

            const msg = await AdaptivePlanService.getCoachMessage(user.id, report, isFinal);
            setCoachMessage(msg);
            setShowCoach(true);
        } catch (e) {
            console.error("Coach Fetch Error:", e);
        } finally {
            setCoachLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadReport();
        }, [loadReport])
    );

    const handleTakeExam = (type: "HIFZ" | "MURAJA") => {
        const pages = type === "HIFZ" ? report?.hifzTestPages : report?.murajaTestPages;
        if (!pages || pages.length === 0) return;
        router.push(`/(app)/test/exam?pages=${JSON.stringify(pages)}&type=${type}`);
    };

    const handleFinalize = async (shouldAdjust: boolean = true) => {
        if (!user?.id || !report || isFinalizing) return;
        
        setIsFinalizing(true);
        try {
            if (shouldAdjust) {
                await AdaptivePlanService.applyRecommendation(
                    user.id, 
                    report.suggestedHifzTarget, 
                    report.suggestedMurajaTarget,
                    report.evaluatedTypes
                );
            }
            
            await habitSummaryService.markWeeklySummarySeen(user.id);
            
            await queryClient.invalidateQueries({ queryKey: ["hifz", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["hifz-plan", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["muraja-dashboard", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["habit-progress", user.id] });
            await queryClient.invalidateQueries({ queryKey: ['weekly-evaluation-due', user.id] });
            await queryClient.invalidateQueries({ queryKey: ["adaptive-guidance", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["hifz-review-suggestions-v2", user.id] });
            
            router.replace("/(app)");
        } catch (e) {
            console.error("Finalize Error:", e);
        } finally {
            setIsFinalizing(false);
        }
    };

    return {
        report,
        loading,
        coachMessage,
        coachLoading,
        showCoach,
        setShowCoach,
        isFinalizing,
        fetchCoachMessage,
        handleTakeExam,
        handleFinalize
    };
}
