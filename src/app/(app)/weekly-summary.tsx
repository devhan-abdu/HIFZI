import { Text } from "@/src/components/common/ui/Text";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import { useHabitProgress } from "@/src/features/habits/hooks/useHabitProgress";
import { habitSummaryService } from "@/src/features/habits/services/habitSummaryService";
import { useSession } from "@/src/hooks/useSession";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { AdaptiveEngineService } from "@/src/services/AdaptiveEngineService";
import { subDays, format as formatDate } from "date-fns";
import { useWeeklyPerformance } from "@/src/hooks/useWeeklyPerformance";
import { Ionicons } from "@expo/vector-icons";

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { analytics, progressByType } = useHabitProgress();
  const userId = user?.id ?? "local-user";

  const weekStart = formatDate(subDays(new Date(), 7), "yyyy-MM-dd");
  const { data: report, isLoading } = useWeeklyPerformance(userId, weekStart);

  const needsTest = report?.testPages && report.testPages.length > 0 && report.testScore === undefined;

  const handleContinue = async () => {
    if (needsTest) return;
    if (report?.status) {
       await AdaptiveEngineService.applyRecommendation(userId, report.status);
    }
    await habitSummaryService.markWeeklySummarySeen(userId);
    router.replace("/(app)/(tabs)");
  };

  const handleTakeExam = (type: "HIFZ" | "MURAJA") => {
    if (!report?.testPages) return;
    router.push(`/(app)/test/exam?pages=${JSON.stringify(report.testPages)}&type=${type}`);
  };

  if (isLoading) return (
    <Screen><ScreenContent><Text>Analyzing your week...</Text></ScreenContent></Screen>
  );

  return (
    <Screen>
      <ScreenContent>
        <View className="rounded-3xl border border-slate-200 bg-white p-5 my-8">
          <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-500">
            Sunday Pivot
          </Text>
          <Text className="mt-2 text-2xl font-bold text-slate-900">Weekly Consultation</Text>
        </View>

        {report && (
          <View className="gap-y-4">
            <View className="bg-emerald-900 rounded-[32px] p-6 shadow-xl">
               <View className="flex-row items-center gap-3 mb-4">
                 <View className="w-10 h-10 rounded-full bg-emerald-800 items-center justify-center">
                   <Ionicons name="sparkles" size={20} color="#fbbf24" />
                 </View>
                 <Text className="text-emerald-100 font-bold uppercase tracking-widest text-[10px]">
                   Hifzi AI Coach
                 </Text>
               </View>
               <Text className="text-white text-lg leading-7 font-medium italic">
                 "{report.coachMessage}"
               </Text>
            </View>

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
                  <Text className="text-slate-500 uppercase text-[10px] tracking-widest font-bold">Current Path</Text>
                  <Text className={`text-2xl font-bold ${
                    report.status === "Elite" ? "text-amber-700" :
                    report.status === "Retake" ? "text-emerald-700" :
                    report.status === "Polishing" ? "text-rose-700" :
                    "text-slate-700"
                  }`}>
                    {report.status === "Elite" ? "Elite Path" : 
                     report.status === "Retake" ? "Retake Opportunity" : 
                     report.status === "Polishing" ? "Aggressive Recovery" : 
                     "Spark Goal"}
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
                <View>
                  <Text className="text-[10px] text-slate-500 uppercase font-bold">Quality</Text>
                  <Text className="text-xl font-bold text-slate-900">{report.averageQuality.toFixed(1)}</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-slate-500 uppercase font-bold">Done</Text>
                  <Text className="text-xl font-bold text-slate-900">{report.completionRate.toFixed(0)}%</Text>
                </View>
                {report.testScore !== undefined && (
                  <View>
                    <Text className="text-[10px] text-slate-500 uppercase font-bold">Exam</Text>
                    <Text className="text-xl font-bold text-emerald-600">{report.testScore.toFixed(0)}%</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Test Gateway */}
            {needsTest && (
              <View className="bg-rose-50 border border-rose-200 rounded-[32px] p-6">
                <Text className="text-rose-800 font-bold">Mandatory Weekly Exam</Text>
                <Text className="text-rose-600 mt-2 mb-4">
                  To finalize your evaluation and ensure mastery, please take a quick recall test on the {report.testPages?.length} pages covered this week.
                </Text>
                <View className="flex-row gap-3">
                  <Button variant="outline" className="flex-1" onPress={() => handleTakeExam("HIFZ")}>
                    Hifz Exam
                  </Button>
                  <Button variant="outline" className="flex-1" onPress={() => handleTakeExam("MURAJA")}>
                    Muraja Exam
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}

        <View className="mt-8 gap-y-3">
          <View className="rounded-2xl border border-slate-100 bg-white p-4 flex-row justify-between items-center">
            <Text className="text-slate-500 font-medium">Total Minutes Spent</Text>
            <Text className="text-lg font-bold text-slate-900">{analytics.totalMinutes}m</Text>
          </View>
          <View className="rounded-2xl border border-slate-100 bg-white p-4 flex-row justify-between items-center">
            <Text className="text-slate-500 font-medium">Pages Completed</Text>
            <Text className="text-lg font-bold text-slate-900">{analytics.totalPages}</Text>
          </View>
        </View>

        <View className="mt-10 mb-20">
          <Button 
            onPress={handleContinue} 
            disabled={needsTest}
            className={needsTest ? "opacity-50" : ""}
          >
            {needsTest ? "Finish Exam to Continue" : "Accept & Adjust Plan"}
          </Button>
        </View>
      </ScreenContent>
    </Screen>
  );
}
