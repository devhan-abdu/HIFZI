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
  } = useForm<HifzPlanSchemaFormType>({
    resolver: yupResolver(HifzPlanSchema) as any,
    defaultValues: {
      start_date: new Date().toISOString().split("T")[0],
      selectedDays: [],
      pages_per_day: 2,
      start_surah: 1,
      start_page: 1,
      total_pages: undefined,
      direction: "forward",
      preferred_time: "fajr",
      is_custom_time: false,
      evaluation_day: 5,
    },
  });
  const startSurah = useWatch({ control, name: "start_surah" });
  const { items } = useLoadSurahData();

  useEffect(() => {
    if (existingPlan) {
      reset({
        start_date: existingPlan.startDate,
        selectedDays: existingPlan.selectedDays,
        pages_per_day: existingPlan.pagesPerDay,
        start_surah: existingPlan.startSurah,
        start_page: existingPlan.startPage,
        direction: existingPlan.direction,
        evaluation_day: existingPlan.evaluationDay ?? 6,
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
      if (data.selectedDays.includes(data.evaluation_day)) {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        showError("Invalid Schedule", `You cannot select ${dayNames[data.evaluation_day]} as a work day because it is your Evaluation Day.`);
        return;
      }
      const stats = calculatePlanStats(data);
      
      const planData = {
        startDate: data.start_date,
        startSurah: data.start_surah,
        startPage: data.start_page,
        direction: data.direction as 'forward' | 'backward',
        pagesPerDay: data.pages_per_day,
        preferredTime: data.preferred_time,
        isCustomTime: data.is_custom_time,
        isReinforcementEnabled: data.is_reinforcement_enabled,
        evaluationDay: data.evaluation_day,
        selectedDays: data.selectedDays,
        totalPages: stats.totalPages,
        estimatedEndDate: stats.finishDate.toISOString().slice(0, 10),
        daysPerWeek: data.selectedDays.length,
      };
      
      await savePlan(planData);
      showSuccess(
        "Success",
        existingPlan ? "Plan updated!" : "Journey started!",
        () => router.back(),
      );
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
            <Text className="text-gray-400 text-[10px] uppercase mb-3 ml-1 tracking-widest">
              Choose Direction
            </Text>
            <Controller
              control={control}
              name="direction"
              render={({ field: { value, onChange } }) => (
                <View className="flex-row bg-slate-100 rounded-xl border border-slate-200">
                  <Button
                    onPress={() => onChange("forward")}
                    className={`flex-1  py-2 rounded-xl ${
                      value === "forward" ? "bg-primary" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`text-center text-xs uppercase tracking-widest ${
                        value === "forward" ? "text-white" : "text-slate-500"
                      }`}
                    >
                      Forward
                    </Text>
                  </Button>
                  <Button
                    onPress={() => onChange("backward")}
                    className={`flex-1 py-2 rounded-xl ${
                      value === "backward" ? "bg-primary" : "bg-transparent"
                    }`}
                  >
                    <Text
                      className={`text-center text-xs uppercase tracking-widest ${
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
            <Text className="text-gray-400 text-[10px] uppercase mb-4 ml-1 tracking-widest">
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

          <View className="mb-10">
            <Text className="text-gray-400 text-[10px] uppercase mb-4 ml-1 tracking-widest">
              Define Range & Rate
            </Text>
            
            <View className="flex-col gap-4 mb-6">
              <View>
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
              <View>
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

          <View className="mb-10">
            <Text className="text-gray-400 text-[10px] uppercase mb-4 ml-1 tracking-widest">
              Weekly Commitment
            </Text>

            <View className="mb-8">
              <Controller
                name="selectedDays"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View>
                    <SelectDays 
                      value={value ?? []} 
                      onChange={onChange} 
                      disabledDay={useWatch({ control, name: 'evaluation_day' })}
                    />
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
          <View className="mb-10">
            <Text className="text-gray-400 text-[10px] uppercase mb-4 ml-1 tracking-widest">
              Weekly Evaluation Day <Text className="text-red-500">*</Text>
            </Text>
            <Controller
              name="evaluation_day"
              control={control}
              render={({ field: { value, onChange } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <Pressable
                      key={day}
                      onPress={() => onChange(index)}
                      className={`px-3 py-2 rounded-xl border ${
                        value === index ? "bg-primary border-primary" : "bg-white border-slate-100"
                      }`}
                    >
                      <Text className={`text-xs ${value === index ? "text-white" : "text-slate-600"}`}>{day}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
            {errors.evaluation_day && (
              <Text className="text-xs text-red-500 mt-2">{errors.evaluation_day.message}</Text>
            )}
            <Text className="text-[10px] text-slate-400 mt-2 ml-1 italic">
              Your weekly progress will be evaluated every {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][useWatch({ control, name: 'evaluation_day' }) ?? 4]}.
            </Text>
          </View>
        </View>

          <View className="mt-4">
            <Text className="text-gray-400 text-[10px] uppercase mb-4 ml-1 tracking-widest">
              Plan Summary
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
