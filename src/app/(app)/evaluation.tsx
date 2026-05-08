import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, ScrollView } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import { useSession } from "@/src/hooks/useSession";
import { useRouter } from "expo-router";
import { AdaptivePlanService, WeeklyPerformanceReport } from "@/src/features/habits/services/AdaptivePlanService";
import { habitSummaryService } from "@/src/features/habits/services/habitSummaryService";
import { useWeeklyEvaluationTrigger } from "@/src/features/habits/hooks/useWeeklyEvaluationTrigger";
import { Ionicons } from "@expo/vector-icons";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { format } from "date-fns";

export default function EvaluationScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useSession();
    const { analytics } = useHabitProgress();
    const { duePlanIds, weekStartDate } = useWeeklyEvaluationTrigger();
    
    const currentDayName = format(new Date(), "EEEE");
    
    const [report, setReport] = useState<WeeklyPerformanceReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [coachMessage, setCoachMessage] = useState<string>("");
    const [coachLoading, setCoachLoading] = useState(false);

    const loadReport = useCallback(async () => {
        if (!user?.id || duePlanIds.length === 0) return;
        
        setLoading(true);
        try {
            const data = await AdaptivePlanService.evaluateWeeklyPerformance(user!.id, weekStartDate, duePlanIds);
            setReport(data);
            setLoading(false);
            
            const isHifzDue = data.evaluatedTypes.includes("HIFZ");
            const isMurajaDue = data.evaluatedTypes.includes("MURAJA");
            const needsHifzTest = isHifzDue && data.hifzTestPages.length > 0 && data.hifzTestScore === undefined;
            const needsMurajaTest = isMurajaDue && data.murajaTestPages.length > 0 && data.murajaTestScore === undefined;
            const isFinal = !(needsHifzTest || needsMurajaTest);

            setCoachLoading(true);
            const msg = await AdaptivePlanService.getCoachMessage(
                data.avgRate,
                data.avgQuality,
                data.hifzTestScore || data.murajaTestScore,
                data.evaluatedTypes.includes("HIFZ") ? "HIFZ" : "MURAJA",
                data.status,
                data.recommendation,
                isFinal
            );
            setCoachMessage(msg);
        } catch (e) {
            console.error("Evaluation Error:", e);
        } finally {
            setLoading(false);
            setCoachLoading(false);
        }
    }, [user?.id, duePlanIds, weekStartDate]);

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

    const handleFinalize = async () => {
        if (!user?.id || !report) return;
        await AdaptivePlanService.applyRecommendation(
            user.id, 
            report.suggestedHifzTarget, 
            report.suggestedMurajaTarget,
            report.evaluatedTypes
        );
        await habitSummaryService.markWeeklySummarySeen(user.id);
        await queryClient.invalidateQueries({ queryKey: ['weekly-evaluation-due', user.id] });
        router.replace("/(app)");
    };

    if (loading) {
        return (
            <Screen>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#276359" />
                    <Text className="mt-4 text-slate-500">Analyzing your week...</Text>
                </View>
            </Screen>
        );
    }

    const isHifzDue = report?.evaluatedTypes.includes("HIFZ");
    const isMurajaDue = report?.evaluatedTypes.includes("MURAJA");

    const needsHifzTest = isHifzDue && report?.hifzTestPages && report.hifzTestPages.length > 0 && report.hifzTestScore === undefined;
    const needsMurajaTest = isMurajaDue && report?.murajaTestPages && report.murajaTestPages.length > 0 && report.murajaTestScore === undefined;
    const needsAnyTest = needsHifzTest || needsMurajaTest;

    return (
        <Screen>
            <ScreenContent>
                <ScrollView showsVerticalScrollIndicator={false} className="pb-20">
                    <View className="rounded-3xl border border-slate-200 bg-white p-5 my-8">
                        <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-500">
                            {currentDayName} Pivot
                        </Text>
                        <Text className="mt-2 text-2xl text-slate-900">Weekly Consultation</Text>
                    </View>

                    {report && (
                        <View className="gap-y-4">
                            {/* AI Coach Card */}
                            <View className="bg-emerald-900 rounded-[32px] p-6 shadow-xl">
                                <View className="flex-row items-center gap-3 mb-4">
                                    <View className="w-10 h-10 rounded-full bg-emerald-800 items-center justify-center">
                                        <Ionicons name="sparkles" size={20} color="#fbbf24" />
                                    </View>
                                    <Text className="text-emerald-100 uppercase tracking-widest text-[10px]">
                                        Hifzi AI Coach
                                    </Text>
                                </View>
                                {coachLoading ? (
                                    <View className="py-4">
                                        <ActivityIndicator color="#fbbf24" size="small" />
                                        <Text className="text-emerald-400 text-xs text-center mt-2 italic">Coach is thinking...</Text>
                                    </View>
                                ) : (
                                    <Text className="text-white text-lg leading-7 font-medium italic">
                                        "{coachMessage || report.recommendation || "Analyzing your path..."}"
                                    </Text>
                                )}
                            </View>

                            {/* Performance Path Card */}
                            <View 
                                className={`rounded-[32px] border p-6 ${
                                    report.status === "Elite" ? "bg-amber-50 border-amber-200" :
                                    report.status === "Retake" ? "bg-emerald-50 border-emerald-200" :
                                    report.status === "Polishing" ? "bg-rose-50 border-rose-200" :
                                    "bg-slate-50 border-slate-200"
                                }`}
                            >
                                <View className="flex-row justify-between items-center mb-6">
                                    <View>
                                        <Text className="text-slate-500 uppercase text-[10px] tracking-widest">Current Path</Text>
                                        <Text className={`text-2xl ${
                                            report.status === "Elite" ? "text-amber-700" :
                                            report.status === "Retake" ? "text-emerald-700" :
                                            report.status === "Polishing" ? "text-rose-700" :
                                            "text-slate-700"
                                        }`}>
                                            {report.status} Path
                                        </Text>
                                    </View>
                                    <Ionicons 
                                        name={report.status === "Elite" ? "trophy" : report.status === "Retake" ? "refresh" : report.status === "Polishing" ? "alert-circle" : "flash"} 
                                        size={32} 
                                        color={report.status === "Elite" ? "#b45309" : report.status === "Retake" ? "#059669" : report.status === "Polishing" ? "#e11d48" : "#f59e0b"} 
                                    />
                                </View>

                                <Text className="text-slate-800 font-medium mb-6">
                                    {report.recommendation}
                                </Text>
                                
                                <View className="flex-row gap-6 border-t border-black/5 pt-6">
                                    {isHifzDue && (
                                        <View>
                                            <Text className="text-[10px] text-slate-500 uppercase">Hifz Done</Text>
                                            <Text className="text-xl text-slate-900">{report.hifzCompletion.toFixed(0)}%</Text>
                                        </View>
                                    )}
                                    {isMurajaDue && (
                                        <View>
                                            <Text className="text-[10px] text-slate-500 uppercase">Muraja Done</Text>
                                            <Text className="text-xl text-slate-900">{report.murajaCompletion.toFixed(0)}%</Text>
                                        </View>
                                    )}
                                    {isHifzDue && report.hifzTestScore !== undefined && (
                                        <View>
                                            <Text className="text-[10px] text-slate-500 uppercase">Hifz Exam</Text>
                                            <Text className={`text-xl ${report.hifzTestScore >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                                                {report.hifzTestScore.toFixed(0)}%
                                            </Text>
                                        </View>
                                    )}
                                    {isMurajaDue && report.murajaTestScore !== undefined && (
                                        <View>
                                            <Text className="text-[10px] text-slate-500 uppercase">Muraja Exam</Text>
                                            <Text className={`text-xl ${report.murajaTestScore >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                                                {report.murajaTestScore.toFixed(0)}%
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Test Gateway / Retake Logic */}
                            {(needsAnyTest || (report.hifzTestScore !== undefined && report.hifzTestScore < 75) || (report.murajaTestScore !== undefined && report.murajaTestScore < 75)) && (
                                <View className={`rounded-[32px] p-6 border ${needsAnyTest ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}>
                                    <View className="flex-row items-center gap-2 mb-2">
                                        <Ionicons 
                                            name={needsAnyTest ? "medal" : "refresh-circle"} 
                                            size={20} 
                                            color={needsAnyTest ? "#e11d48" : "#475569"} 
                                        />
                                        <Text className={`${needsAnyTest ? "text-rose-800" : "text-slate-800"} `}>
                                            {needsAnyTest ? "Mandatory Weekly Exam" : "Boost Your Evaluation"}
                                        </Text>
                                    </View>
                                    <Text className={`${needsAnyTest ? "text-rose-600" : "text-slate-600"} mb-4 text-sm`}>
                                        {needsAnyTest 
                                            ? "Complete your recall test to finalize your path and targets for the coming week."
                                            : "Your recent score is below 75%. You can retake the exam now to improve your performance path."
                                        }
                                    </Text>
                                    <View className="flex-row gap-3">
                                        {(needsHifzTest || (report.hifzTestScore !== undefined && report.hifzTestScore < 75)) && (
                                            <Button variant="outline" className="flex-1" onPress={() => handleTakeExam("HIFZ")}>
                                                {report.hifzTestScore !== undefined ? "Retake Hifz" : "Hifz Exam"}
                                            </Button>
                                        )}
                                        {(needsMurajaTest || (report.murajaTestScore !== undefined && report.murajaTestScore < 75)) && (
                                            <Button variant="outline" className="flex-1" onPress={() => handleTakeExam("MURAJA")}>
                                                {report.murajaTestScore !== undefined ? "Retake Muraja" : "Muraja Exam"}
                                            </Button>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Recommended Targets */}
                            {/* Recommended Targets - Only shown after exams are complete */}
                            {!needsAnyTest ? (
                                <View className="bg-white border border-slate-100 p-6 rounded-[32px] mb-4">
                                    <Text className="text-slate-500 uppercase tracking-widest text-[10px] mb-4">Recommended Next Steps</Text>
                                    
                                    {isHifzDue && (
                                        <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-slate-50">
                                            <View>
                                                <Text className="text-slate-900 font-medium">Hifz Target</Text>
                                                <Text className="text-xs text-slate-500">Adjusted for quality</Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="text-lg  text-primary">{report.suggestedHifzTarget} pgs/day</Text>
                                            </View>
                                        </View>
                                    )}

                                    {isMurajaDue && (
                                        <View className="flex-row items-center justify-between">
                                            <View>
                                                <Text className="text-slate-900 font-medium">Muraja Target</Text>
                                                <Text className="text-xs text-slate-500">Revision goal</Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="text-lg  text-primary">{report.suggestedMurajaTarget} pgs/day</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View className="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-[32px] items-center justify-center">
                                    <Ionicons name="lock-closed" size={24} color="#94a3b8" />
                                    <Text className="text-slate-400 text-sm mt-2 text-center">
                                        Plan recommendations will be unlocked after your mastery assessment.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View className="mt-8 gap-y-3">
                        <View className="rounded-2xl border border-slate-100 bg-white p-4 flex-row justify-between items-center">
                            <Text className="text-slate-500 font-medium">Total Minutes Spent</Text>
                            <Text className="text-lg text-slate-900">{analytics.totalMinutes}m</Text>
                        </View>
                        <View className="rounded-2xl border border-slate-100 bg-white p-4 flex-row justify-between items-center">
                            <Text className="text-slate-500 font-medium">Total Pages Completed</Text>
                            <Text className="text-lg text-slate-900">{analytics.totalPages}</Text>
                        </View>
                    </View>

                    <View className="mt-10 mb-20">
                        <Button 
                            onPress={handleFinalize} 
                            disabled={needsAnyTest}
                            className={needsAnyTest ? "opacity-50" : ""}
                        >
                            {needsAnyTest ? "Finish Exam to Continue" : "Accept & Adjust Plan"}
                        </Button>
                    </View>
                </ScrollView>
            </ScreenContent>
        </Screen>
    );
}
