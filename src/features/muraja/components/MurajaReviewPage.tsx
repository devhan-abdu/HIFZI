import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import { WeeklyReviewView } from "./WeeklyReviewView";

import { useCreatePlan } from "../hooks/useCreatePlan";
import { useSession } from "@/src/hooks/useSession";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import {
  formatWeekRange,
  getPlannedDates,
} from "@/src/features/muraja/utils/dateHelpers";
import { DAY_NUMBER_MAP, getWeeklyPlanData } from "../utils/quranMapping";
import {
  IMonthHistory,
  IWeeklyMurajaDayInsert,
  WeeklyMurajaType,
} from "@/src/types";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "@/src/components/common/Alert";

export default function MurajaReviewPage({
  plan,
  analytics,
}: {
  plan: IMonthHistory;
  analytics: any;
}) {
  const { createPlan, isCreating } = useCreatePlan();
  const { user } = useSession();
  const { items } = useLoadSurahData();

  const { alertConfig, showSuccess, showError, hideAlert } = useAlert();

  const handleSubmit = async () => {
    if (!user?.id || !plan) return;

    try {
      const selectedDays = plan.weekly_plan_days.map(
        (day) => DAY_NUMBER_MAP[day.day_of_week],
      );
      const { weekly_plan_days, id, ...rest } = plan;
      const startDate = new Date().toISOString().slice(0, 10);
      const nextStartPage = rest.end_page + 1;

      const calculatedDays = getPlannedDates(
        startDate,
        selectedDays as number[],
        rest.planned_pages,
        nextStartPage,
      );
      const endDate = calculatedDays[calculatedDays.length - 1].date;
      const quranData = getWeeklyPlanData(
        rest.end_page + 1,
        rest.planned_pages,
        selectedDays.length,
        items,
      );

      if (!quranData.startSurah || !quranData.endSurah) {
        showError("Ups!", "Could not calculate Quranic range.");
        return;
      }

      const planPayload: WeeklyMurajaType = {
        ...rest,
        user_id: user.id,
        end_surah: quranData.endSurah,
        start_surah: quranData.startSurah,
        end_page: quranData.endPage,
        start_juz: quranData.startJuz!,
        end_juz: quranData.endJuz!,
        total_days: selectedDays.length,
        week_end_date: endDate,
        status: "active",
      };

      const daysPayload: IWeeklyMurajaDayInsert[] = calculatedDays.map(
        (day) => ({
          day_of_week: day.day_of_week,
          date: day.date,
          planned_start_page: day.planned_start_page!,
          planned_end_page: day.planned_end_page!,
          planned_pages: rest.planned_pages!,
          estimated_time_min: rest.estimated_time_min!,
        }),
      );

      await createPlan({ planData: planPayload, days: daysPayload });

      showSuccess("Success!", "Plan created!.", () => router.back());
    } catch (error: any) {
      showError("Ups!", "something went wrong");
    }
  };

  const weekRange = formatWeekRange(plan?.week_start_date, plan?.week_end_date);

  return (
    <Screen>
      <ScreenContent>
        <WeeklyReviewView
          plan={plan}
          analytics={analytics}
          weekRange={weekRange}
        />
      </ScreenContent>
      <ScreenFooter>
        <View className="flex-row gap-3 mb-10">
          <Button
            variant="outline"
            className="flex-1 h-14 border-slate-200 bg-white"
            onPress={handleSubmit}
            disabled={isCreating}
          >
            <Text className="text-slate-500  uppercase text-[10px] tracking-widest text-center">
              {isCreating ? "Setting up..." : "Continue Journey"}
            </Text>
          </Button>

          <Button
            onPress={() => router.push("/(app)/muraja/create-muraja-plan")}
            className="flex-[1.5] h-14 bg-primary shadow-lg shadow-primary/20"
          >
            <View className="flex-row items-center justify-center gap-2">
              <Ionicons name="rocket-outline" size={16} color="#fff" />
              <Text className="text-white  uppercase text-[10px] tracking-widest">
                Launch New Plan
              </Text>
            </View>
          </Button>
        </View>
      </ScreenFooter>
      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </Screen>
  );
}
