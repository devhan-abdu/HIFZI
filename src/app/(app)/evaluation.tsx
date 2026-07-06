import React from "react";
import { View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent } from "@/src/components/screen/ScreenContent";
import { Text } from "@/src/components/common/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { useWeeklyEvaluation } from "@/src/features/habits/hooks/useWeeklyEvaluation";
import { EvaluationSkeleton } from "@/src/features/habits/components/evaluation/EvaluationSkeleton";
import { HifzOnlyEvaluation } from "@/src/features/habits/components/evaluation/HifzOnlyEvaluation";
import { MurajaOnlyEvaluation } from "@/src/features/habits/components/evaluation/MurajaOnlyEvaluation";
export default function EvaluationScreen() {
  const insets = useSafeAreaInsets();
  const currentDayName = format(new Date(), "EEEE");
   const { type, planId: planIdStr } = useLocalSearchParams<{
     type: "HIFZ" | "MURAJA";
     planId: string;
   }>();

  const {
    report,
    loading,
    screenError,
    inlineError,
    isFinalizing,
    isAccessible,
    isHifz,
    isMuraja,
    examRequired,
    examPassed,
    handleTakeExam,
    handleFinalize,
    reload,
  } = useWeeklyEvaluation(type, Number(planIdStr));

  if (loading) {
    return (
      <Screen>
        <View style={{ paddingTop: insets.top }} />
        <ScreenContent>
          <EvaluationSkeleton />
        </ScreenContent>
      </Screen>
    );
  }

  if (!isAccessible) {
    return <Redirect href="/(app)" />;
  }

  if (screenError || !report) {
    return (
      <Screen>
        <View style={{ paddingTop: insets.top }} />
        <ScreenContent>
          <View className="flex-1 items-center justify-center py-24">
            <Text className="text-[10px] uppercase tracking-[1.8px] text-muted">
              {format(new Date(), "EEEE")} Evaluation
            </Text>
            <Text className="mt-3 text-center text-2xl text-text">
              Unable to load evaluation
            </Text>
            <Text className="mt-3 max-w-[280px] text-center text-sm leading-6 text-muted">
              {screenError ??
                "This evaluation could not be resolved right now."}
            </Text>
            <Button onPress={() => void reload()} className="mt-6 bg-primary">
              <Text className="text-white">Retry</Text>
            </Button>
          </View>
        </ScreenContent>
      </Screen>
    );
  }

 return (
   <Screen>
     <View style={{ paddingTop: insets.top }} />
     <ScreenContent>
       {isHifz && (
         <HifzOnlyEvaluation
           report={report}
           needsExam={examRequired}
           examPassed={examPassed}
           isFinalizing={isFinalizing}
           error={inlineError}
           onTakeExam={handleTakeExam}
           onFinalize={handleFinalize}
         />
       )}
       {isMuraja && (
         <MurajaOnlyEvaluation
           report={report}
           needsExam={examRequired}
           examPassed={examPassed}
           isFinalizing={isFinalizing}
           error={inlineError}
           onTakeExam={handleTakeExam}
           onFinalize={handleFinalize}
         />
       )}
     </ScreenContent>
   </Screen>
 );
}
