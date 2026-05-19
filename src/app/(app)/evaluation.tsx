import React from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
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
import { DualEvaluation } from "@/src/features/habits/components/evaluation/DualEvaluation";
export default function EvaluationScreen() {
  const insets = useSafeAreaInsets();
  const currentDayName = format(new Date(), "EEEE");

  const {
    report,
    loading,
    screenError,
    inlineError,
    isFinalizing,
    isAccessible,
    caseType,
    hifzExamRequired,
    murajaExamRequired,
    hifzExamPassed,
    murajaExamCompleted,
    nextExamType,
    handleTakeExam,
    handleFinalize,
    reload,
  } = useWeeklyEvaluation();

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

  if (screenError || !report || !caseType) {
    return (
      <Screen>
        <View style={{ paddingTop: insets.top }} />
        <ScreenContent>
          <View className="flex-1 items-center justify-center py-24">
            <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-400">{currentDayName} Evaluation</Text>
            <Text className="mt-3 text-center text-2xl text-slate-900">Unable to load evaluation</Text>
            <Text className="mt-3 max-w-[280px] text-center text-sm leading-6 text-slate-500">
              {screenError ?? "This evaluation could not be resolved right now."}
            </Text>
            <Button onPress={() => void reload()} className="mt-6 bg-primary" textClassName="text-white">
              Retry
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
        {caseType === "HIFZ_ONLY" ? (
          <HifzOnlyEvaluation
            report={report}
            needsExam={hifzExamRequired}
            examPassed={!!hifzExamPassed}
            isFinalizing={isFinalizing}
            error={inlineError}
            onTakeExam={() => handleTakeExam("HIFZ")}
            onFinalize={handleFinalize}
          />
        ) : null}

        {caseType === "MURAJA_ONLY" ? (
          <MurajaOnlyEvaluation
            report={report}
            needsExam={murajaExamRequired}
            isFinalizing={isFinalizing}
            error={inlineError}
            onTakeExam={() => handleTakeExam("MURAJA")}
            onFinalize={handleFinalize}
          />
        ) : null}

        {caseType === "DUAL" ? (
          <DualEvaluation
            report={report}
            hifzExamRequired={hifzExamRequired}
            murajaExamRequired={murajaExamRequired}
            hifzExamPassed={!!hifzExamPassed}
            murajaExamCompleted={!!murajaExamCompleted}
            nextExamType={nextExamType}
            isFinalizing={isFinalizing}
            error={inlineError}
            onTakeHifzExam={() => handleTakeExam("HIFZ")}
            onTakeMurajaExam={() => handleTakeExam("MURAJA")}
            onFinalize={handleFinalize}
          />
        ) : null}
      </ScreenContent>
    </Screen>
  );
}
