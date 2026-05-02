import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { View, ActivityIndicator, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Input from "@/src/components/ui/Input";
import SurahDropdown, {
  SurahPageDropdown,
} from "@/src/features/muraja/components/SurahDropdown";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { useSession } from "@/src/hooks/useSession";
import {
  HifzPlanSchema,
  HifzPlanSchemaFormType,
} from "@/src/features/hifz/types";
import SelectDays from "@/src/features/muraja/components/SelectDays";
import StatsSummary from "@/src/features/hifz/components/StatsSummary";
import { useSaveHifzPlanHifz } from "@/src/features/hifz/hooks/useSaveHifzPlan";
import PlanFormSkeleton from "@/src/features/hifz/components/skeleton";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import Screen from "@/src/components/screen/Screen";
import { calculatePlanStats } from "@/src/features/hifz/utils/plan-calculations";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "@/src/components/common/Alert";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { Text } from "@/src/components/common/ui/Text";
import { formatErrorMessage } from "@/src/utils/error-utils";
import { useHifzPlan } from "@/src/features/hifz/hooks/useHifzPlan";
import { HabitTriggerSelector } from "@/src/components/common/HabitTriggerSelector";

export default function CreateHifzPlan() {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { user } = useSession();
  const { hifz: existingPlan, isLoading } = useHifzPlan();
  const { savePlan, isSaving } = useSaveHifzPlanHifz();

  const { alertConfig, showSuccess, showError, hideAlert } = useAlert();

  const {
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset,
  } = useForm({
    resolver: yupResolver(HifzPlanSchema),
    defaultValues: {
      start_date: new Date().toISOString().split("T")[0],
      selectedDays: [],
      pages_per_day: 2,
      start_surah: 1,
      start_page: 1,
      direction: "forward",
      preferred_time: "fajr",
      is_custom_time: false,
    },
  });
  const startSurah = useWatch({ control, name: "start_surah" });
  const { items } = useLoadSurahData();

  useEffect(() => {
    if (existingPlan) {
      reset({
        start_date: existingPlan.start_date,
        selectedDays: existingPlan.selected_days,
        pages_per_day: existingPlan.pages_per_day,
        start_surah: existingPlan.start_surah,
        start_page: existingPlan.start_page,
        direction: existingPlan.direction,
      });
    }
  }, [existingPlan, reset]);

  useEffect(() => {
    if (startSurah && items.length > 0) {
      const found = items.find((s) => s.number === Number(startSurah));

      if (found) {
        setValue("start_page", found.startingPage);
      }
    }
  }, [startSurah, items, setValue]);

  const onSubmit = async (data: HifzPlanSchemaFormType) => {
    if (!user?.id) return;
    try {
      const stats = calculatePlanStats(data);
      const { selectedDays, ...rest } = data;
      const planData = {
        ...rest,
        selected_days: selectedDays,
        total_pages: stats.totalPages,
        estimated_end_date: stats.finishDate.toISOString().slice(0, 10),
        days_per_week: data.selectedDays.length,
      };
      await savePlan(planData);
      showSuccess(
        "Success",
        existingPlan ? "Plan updated!" : "Journey started!",
        () => router.back(),
      );
      console.log("after calling savePlan")
    } catch (error: any) {
      showError("Error", formatErrorMessage(error));
    }
  };

  if (isLoading) return <PlanFormSkeleton />;

  return (
    <>
      <View className="bg-white border-b border-slate-100">
        <View className="h-16 px-4 flex-row items-center">
          <Pressable
            onPress={() => router.replace("/(app)/hifz")}
            className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </Pressable>

          <View className="flex-1 ml-2">
            <Text className="text-lg  text-primary leading-tight">
              Create Hifz Plan
            </Text>
          </View>
        </View>
      </View>
      <Screen>
        <ScreenContent>
          <View className="mb-10">
            <Text className="text-gray-400 text-[10px] uppercase mb-3 ml-1 tracking-widest ">
              Step 1: Choose Direction
            </Text>
            <Controller
              control={control}
              name="direction"
              render={({ field: { value, onChange } }) => (
                <View className="flex-row bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <Button
                    onPress={() => onChange("forward")}
                    className={`flex-1 py-3 rounded-xl ${
                      value === "forward" ? "bg-primary shadow-sm" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`text-center  text-xs uppercase tracking-widest ${
                        value === "forward" ? "text-white" : "text-slate-500"
                      }`}
                    >
                      Forward
                    </Text>
                  </Button>
                  <Button
                    onPress={() => onChange("backward")}
                    className={`flex-1 py-3 rounded-xl ${
                      value === "backward" ? "bg-primary shadow-sm" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`text-center  text-xs uppercase tracking-widest ${
                        value === "backward" ? "text-white" : "text-slate-500"
                      }`}
                    >
                      Juz Amma First
                    </Text>
                  </Button>
                </View>
              )}
            />
          </View>

          <View className="mb-10">
            <Text className="text-gray-400 text-[10px] uppercase mb-4 ml-1 tracking-widest ">
              Step 2: Define Range
            </Text>
            
            <View className="mb-6">
              <Controller
                control={control}
                name="pages_per_day"
                render={({ field: { value, onChange } }) => (
                  <Input
                    label="PAGES PER DAY"
                    value={String(value)}
                    setValue={(v) => onChange(Number(v))}
                    keyboardType="numeric"
                    leftIcon={<Ionicons name="document-text-outline" size={18} color="#94a3b8" />}
                    error={errors.pages_per_day?.message}
                  />
                )}
              />
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] uppercase mb-2 ml-1 tracking-tight">
                  Start Surah
                </Text>
                <Controller
                  control={control}
                  name="start_surah"
                  render={({ field: { value, onChange } }) => (
                    <View>
                      <SurahDropdown surah={value} setSurah={onChange} />
                      {errors.start_surah && (
                        <Text className="text-[10px] text-red-500 mt-1">
                          {errors.start_surah.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] uppercase mb-2 ml-1 tracking-tight">
                  Start Page
                </Text>
                <Controller
                  control={control}
                  name="start_page"
                  render={({ field: { value, onChange } }) => (
                    <View>
                      <SurahPageDropdown
                        surah={startSurah}
                        page={value}
                        setPage={onChange}
                      />
                      {errors.start_page && (
                        <Text className="text-[10px] text-red-500 mt-1">
                          {errors.start_page.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
              </View>
            </View>
          </View>

          <View className="mb-10">
            <Text className="text-gray-400 text-[10px] uppercase mb-4 ml-1 tracking-widest ">
              Step 3: Schedule & Routine
            </Text>

            <View className="mb-8">
              <Text className="text-slate-400 text-[10px] uppercase mb-2 ml-1 tracking-tight">
                Start Date
              </Text>
              <Controller
                control={control}
                name="start_date"
                render={({ field: { value, onChange } }) => (
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className={`bg-slate-50 border p-4 rounded-2xl flex-row justify-between items-center ${
                      errors.start_date ? "border-red-200" : "border-slate-100"
                    }`}
                  >
                    <Text className="text-slate-700 font-medium">
                      {new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#276359" />
                    {showDatePicker && (
                      <DateTimePicker
                        value={new Date(value)}
                        onChange={(e, d) => {
                          setShowDatePicker(false);
                          if (d) onChange(d.toISOString().split("T")[0]);
                        }}
                      />
                    )}
                  </Pressable>
                )}
              />
            </View>

            <View className="mb-8">
              <Text className="text-slate-400 text-[10px] uppercase mb-4 ml-1 tracking-tight">
                Weekly Commitment
              </Text>
              <Controller
                name="selectedDays"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View>
                    <SelectDays value={value ?? []} onChange={onChange} />
                    {errors.selectedDays && (
                      <Text className="text-xs text-red-500 mt-2">
                        {errors.selectedDays.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <Controller
              name="preferred_time"
              control={control}
              render={({ field: { value, onChange } }) => (
                <HabitTriggerSelector 
                  value={value} 
                  onChange={onChange}
                  isCustom={useWatch({ control, name: 'is_custom_time' })}
                  setIsCustom={(val) => setValue('is_custom_time', val)}
                  error={errors.preferred_time?.message}
                />
              )}
            />
          </View>

          <View className="mb-6">
            <Text className="text-gray-400 text-[10px] uppercase mb-4 ml-1 tracking-widest ">
              Step 4: Review & Launch
            </Text>
            <StatsSummary control={control} />
          </View>
        </ScreenContent>

        <ScreenFooter>
          <Button
            onPress={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="bg-primary h-14 rounded-2xl "
          >
            {isSaving ?
              <ActivityIndicator color="white" />
            : <Text className="text-white  uppercase tracking-widest">
                {existingPlan ? "Update Plan" : "Create Plan"}
              </Text>
            }
          </Button>
        </ScreenFooter>
      </Screen>
      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </>
  );
}
