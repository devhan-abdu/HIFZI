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
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EvaluationScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useSession();
    const insets = useSafeAreaInsets();
    const { analytics } = useHabitProgress();
    const { duePlanIds, weekStartDate } = useWeeklyEvaluationTrigger();
    
    const currentDayName = format(new Date(), "EEEE");
    
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
            const data = await AdaptivePlanService.evaluateWeeklyPerformance(user!.id, weekStartDate, duePlanIds);
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
            await queryClient.invalidateQueries({ queryKey: ["muraja-dashboard", user.id] });
            await queryClient.invalidateQueries({ queryKey: ["habit-progress", user.id] });
            await queryClient.invalidateQueries({ queryKey: ['weekly-evaluation-due', user.id] });
            
            router.replace("/(app)");
        } catch (e) {
            console.error("Finalize Error:", e);
        } finally {
            setIsFinalizing(false);
        }
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
            <View style={{ paddingTop: insets.top }} />
            <ScreenContent>
                <View className="pb-20">
                    <View className="my-8">
                        <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-500">
                            {currentDayName} Pivot
                        </Text>
                        <Text className="mt-2 text-3xl text-slate-900">Weekly Consultation</Text>
                        <Text className="text-slate-500 mt-1">
                            {needsAnyTest ? "Analyzing your consistency before the final assessment." : "Your week has been evaluated. Review your new path below."}
                        </Text>
                    </View>

                    <Pressable 
                        onPress={() => {
                            if (!coachMessage && !coachLoading) {
                                fetchCoachMessage();
                            } else {
                                setShowCoach(!showCoach);
                            }
                        }}
                        className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                                <Ionicons name="sparkles" size={16} color="#276359" />
                            </View>
                            <Text className="text-slate-700 text-sm">
                                {coachLoading ? "Coach is thinking..." : coachMessage ? "Review Coach Insights" : "Ask Coach for Insights"}
                            </Text>
                        </View>
                        {coachMessage ? (
                            <Ionicons name={showCoach ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
                        ) : (
                            !coachLoading && <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
                        )}
                    </Pressable>

                    {showCoach && coachMessage && (
                        <View className="bg-primary/5 border border-primary/10 rounded-3xl p-6 mb-6">
                            <Text className="text-primary text-lg leading-7 ">
                                "{coachMessage}"
                            </Text>
                        </View>
                    )}

                    {report && (
                        <View className="gap-y-6">

                            <View className="bg-white rounded-[40px] p-7 shadow-2xl shadow-primary/40 overflow-hidden relative">
                                <View className="flex-row justify-between items-center mb-6">
                                    <View>
                                        <Text className="text-primary/60 uppercase text-[10px] tracking-widest">
                                            {needsAnyTest ? "Current Effort" : "Final Path"}
                                        </Text>
                                        <Text className={`text-2xl ${
                                            !needsAnyTest && report.status === "Elite" ? "text-amber-600" :
                                            !needsAnyTest && report.status === "Retake" ? "text-primary" :
                                            !needsAnyTest && report.status === "Polishing" ? "text-rose-600" :
                                            "text-primary"
                                        }`}>
                                            {needsAnyTest ? "Week Analysis" : `${report.status} Path`}
                                        </Text>
                                    </View>
                                    <Ionicons 
                                        name={
                                            needsAnyTest ? "analytics" : 
                                            report.status === "Elite" ? "trophy" : 
                                            report.status === "Retake" ? "refresh" : 
                                            report.status === "Polishing" ? "diamond-outline" :
                                            report.status === "Recovery" ? "shield-checkmark" : "sparkles"
                                        } 
                                        size={28} 
                                        color={
                                            needsAnyTest ? "#64748b" : 
                                            report.status === "Elite" ? "#d97706" : 
                                            report.status === "Retake" ? "#059669" : 
                                            report.status === "Polishing" ? "#e11d48" :
                                            "#276359"
                                        } 
                                    />
                                </View>

                                {needsAnyTest ? (
                                    <Text className="text-slate-600 mb-6 leading-6">
                                        Your effort this week was <Text className="text-slate-900">{report.avgRate.toFixed(0)}%</Text>. 
                                        {report.avgRate >= 80 ? " You've been remarkably consistent!" : " There's room for more consistency next week."} 
                                        Please complete the mastery exam to unlock your adjusted targets.
                                    </Text>
                                ) : (
                                    <Text className="text-slate-800 mb-6 leading-6">
                                        {report.recommendation}
                                    </Text>
                                )}
                                
                                <View className="flex-row flex-wrap gap-x-8 gap-y-4 border-t border-slate-50 pt-6">
                                    {isHifzDue && (
                                        <View>
                                            <Text className="text-[10px] text-slate-400 uppercase">Hifz Done</Text>
                                            <Text className="text-xl ">{report.hifzCompletion.toFixed(0)}%</Text>
                                        </View>
                                    )}
                                    {isMurajaDue && (
                                        <View>
                                            <Text className="text-[10px] text-slate-400 uppercase">Muraja Done</Text>
                                            <Text className="text-xl ">{report.murajaCompletion.toFixed(0)}%</Text>
                                        </View>
                                    )}
                                    {isHifzDue && report.hifzTestScore !== undefined && (
                                        <View>
                                            <Text className="text-[10px] text-slate-400 uppercase">Hifz Exam</Text>
                                            <Text className={`text-xl ${report.hifzTestScore >= 75 ? "text-primary" : "text-rose-600"}`}>
                                                {report.hifzTestScore.toFixed(0)}%
                                            </Text>
                                        </View>
                                    )}
                                    {isMurajaDue && report.murajaTestScore !== undefined && (
                                        <View>
                                            <Text className="text-[10px] text-slate-400 uppercase">Muraja Exam</Text>
                                            <Text className={`text-xl ${report.murajaTestScore >= 75 ? "text-primary" : "text-rose-600"}`}>
                                                {report.murajaTestScore.toFixed(0)}%
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Test Gateway */}
                            {(needsAnyTest || (report.hifzTestScore !== undefined && report.hifzTestScore < 75) || (report.murajaTestScore !== undefined && report.murajaTestScore < 75)) && (
                                <View className={`rounded-[32px] p-6 border ${needsAnyTest ? "bg-rose-50 border-rose-100" : "bg-white border-slate-100 shadow-sm"}`}>
                                    <View className="flex-row items-center gap-2 mb-2">
                                        <Ionicons 
                                            name={needsAnyTest ? "medal" : "refresh-circle"} 
                                            size={20} 
                                            color={needsAnyTest ? "#e11d48" : "#64748b"} 
                                        />
                                        <Text className={` ${needsAnyTest ? "text-rose-800" : "text-slate-800"}`}>
                                            {needsAnyTest ? "Final Mastery Exam" : "Boost Your Score"}
                                        </Text>
                                    </View>
                                    <Text className={`${needsAnyTest ? "text-rose-600" : "text-slate-500"} mb-6 text-sm leading-5`}>
                                        {needsAnyTest 
                                            ? "Complete your recall test to verify your retention and finalize next week's targets."
                                            : "Your recent exam score was below 75%. You can retake it now to move into a better performance path."
                                        }
                                    </Text>
                                    <View className="flex-row gap-3">
                                        {(needsHifzTest || (report.hifzTestScore !== undefined && report.hifzTestScore < 75)) && (
                                            <Button variant="outline" className="flex-1 bg-white" onPress={() => handleTakeExam("HIFZ")}>
                                                {report.hifzTestScore !== undefined ? "Retake Hifz" : "Hifz Exam"}
                                            </Button>
                                        )}
                                        {(needsMurajaTest || (report.murajaTestScore !== undefined && report.murajaTestScore < 75)) && (
                                            <Button variant="outline" className="flex-1 bg-white" onPress={() => handleTakeExam("MURAJA")}>
                                                {report.murajaTestScore !== undefined ? "Retake Muraja" : "Muraja Exam"}
                                            </Button>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Recommended Targets */}
                            {!needsAnyTest ? (
                                <View className="bg-white rounded-[32px] p-6 border border-emerald-100 shadow-sm">
                                    <View className="flex-row items-center gap-2 mb-6">
                                        <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                                            <Ionicons name="options" size={16} color="#059669" />
                                        </View>
                                        <Text className=" uppercase tracking-widest text-[10px]">New Plan Targets</Text>
                                    </View>
                                    
                                    <View className="gap-y-4">
                                        {isHifzDue && (
                                            <View className="flex-row items-center justify-between p-4 rounded-2xl border border-primary/10">
                                                <View>
                                                    <Text className="text-slate-900 text-lg">Hifz</Text>
                                                    <Text className="text-slate-500 text-xs">Target per day</Text>
                                                </View>
                                                <Text className="text-2xl text-primary">{report.suggestedHifzTarget} pgs</Text>
                                            </View>
                                        )}

                                        {isMurajaDue && (
                                            <View className="flex-row items-center justify-between  p-4 rounded-2xl border border-primary/10">
                                                <View>
                                                    <Text className="text-slate-900 text-lg">Muraja</Text>
                                                    <Text className="text-slate-500 text-xs">Revision goal</Text>
                                                </View>
                                                <Text className="text-2xl text-primary">{report.suggestedMurajaTarget} pgs</Text>
                                            </View>
                                        )}
                                    </View>
                                    
                                    <View className="mt-8 gap-y-3">
                                        <Button 
                                            onPress={() => handleFinalize(true)}
                                            className="bg-primary h-14"
                                            textClassName="text-white"
                                            loading={isFinalizing}
                                            disabled={isFinalizing}
                                        >
                                            Accept & Adjust Plan
                                        </Button>
                                        <Button 
                                            onPress={() => handleFinalize(false)}
                                            variant="ghost"
                                            className="h-14"
                                            textClassName="text-slate-500"
                                            disabled={isFinalizing}
                                        >
                                            Keep Current Plan
                                        </Button>
                                    </View>
                                </View>
                            ) : (
                                <View className="bg-white border border-dashed border-slate-200 p-8 rounded-[32px] items-center justify-center">
                                    <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center mb-4">
                                        <Ionicons name="lock-closed" size={24} color="#94a3b8" />
                                    </View>
                                    <Text className="text-slate-400 text-sm text-center px-6 leading-5">
                                        Final targets will be unlocked after your mastery assessment is complete.
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View className="mt-12 gap-y-3 px-2">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-slate-400 text-xs uppercase tracking-widest">Week Summary</Text>
                            <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                        </View>
                        <View className="flex-row gap-3">
                            <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-primary/10">
                                <Text className="text-slate-500 text-[10px] uppercase mb-1">Consistency</Text>
                                <Text className="text-xl text-primary">{analytics.completionRate.toFixed(0)}%</Text>
                            </View>
                            <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-primary/10">
                                <Text className="text-slate-500 text-[10px] uppercase mb-1">Weekly Streak</Text>
                                <Text className="text-xl text-primary">{analytics.currentStreak} Days</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScreenContent>
        </Screen>
    );
}
