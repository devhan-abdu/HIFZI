import { useColorScheme } from "nativewind";
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
import { SectionHeader } from "@/src/components/SectionHeader";
import { useNotificationPermissions } from "@/src/hooks/useNotificationPermissions";
import { NotificationPermissionModal } from "@/src/components/common/NotificationPermissionModal";

export default function CreateHifzPlan() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationModalLoading, setNotificationModalLoading] = useState(false);
  const { user } = useSession();
  const { hifz: existingPlan, isLoading } = useHifzPlan();
  const { savePlan, updatePlan, isSaving } = useSaveHifzPlanHifz();
  const { isFullyEnabled, togglePreference } = useNotificationPermissions();

  const { alertConfig, showSuccess, showError, hideAlert } = useAlert();

  const {
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    getValues,
    reset,
  } = useForm<HifzPlanSchemaFormType>({
    resolver: yupResolver(HifzPlanSchema) as any,
    defaultValues: {
      start_date: new Date().toISOString().split("T")[0],
      selectedDays: [(new Date().getDay() + 6) % 7],
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
  const selectedEvalDay = useWatch({ control, name: 'evaluation_day' });
  const startDate = useWatch({ control, name: "start_date" });
  const { items } = useLoadSurahData();

  useEffect(() => {
    if (existingPlan) {
      reset({
        start_date: existingPlan.startDate,
        selectedDays: typeof existingPlan.selectedDays === "string" ? JSON.parse(existingPlan.selectedDays as any) : (existingPlan.selectedDays ?? []),
        pages_per_day: existingPlan.pagesPerDay,
        start_surah: items.find((s) => s.startingPage <= (existingPlan.startPage ?? 1) && s.endingPage >= (existingPlan.startPage ?? 1))?.number ?? existingPlan.startSurah,
        start_page: existingPlan.startPage,
        direction: existingPlan.direction,
        evaluation_day: existingPlan.evaluationDay ?? 6,
        preferred_time: existingPlan.preferredTime ?? "fajr",
        is_custom_time: existingPlan.isCustomTime ?? false,
      });
    }
  }, [existingPlan, items]);

  useEffect(() => {
    if (startSurah && items.length > 0) {
      const found = items.find((s) => s.number === Number(startSurah));
      if (found) {
        setValue("start_page", found.startingPage);
      }
    }
  }, [startSurah, items]);

  useEffect(() => {
    const currentDays = getValues('selectedDays') || [];
    if (currentDays.includes(selectedEvalDay)) {
      setValue('selectedDays', currentDays.filter((d: number) => d !== selectedEvalDay));
    }
  }, [selectedEvalDay]);

  const onSubmit = async (data: HifzPlanSchemaFormType) => {
    if (!user?.id) return;
    try {
      const stats = calculatePlanStats(data, items);
      
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
      
      const isFundamentalChange = 
        !existingPlan ||
        existingPlan.startDate !== data.start_date ||
        existingPlan.startPage !== data.start_page ||
        existingPlan.totalPages !== stats.totalPages;

      if (isFundamentalChange) {
        await savePlan(planData);
      } else {
        await updatePlan({ planId: existingPlan.id!, payload: planData });
      }

      showSuccess(
        existingPlan && !isFundamentalChange ? "Plan Updated!" : "Journey started!",
        existingPlan && !isFundamentalChange 
          ? "Your Hifz plan has been updated successfully."
          : "Your new Hifz plan has been created successfully.",
        () => {
          if (!existingPlan && !isFullyEnabled) {
            setShowNotificationModal(true);
          } else {
            router.back();
          }
        },
      );
    } catch (error: any) {
      showError("Error", formatErrorMessage(error));
    }
  };

  const formattedStartDate = startDate ? new Date(startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : "Select Start Date";

  if (isLoading) return <PlanFormSkeleton />;

  return (
    <>
      <View className="h-16 px-4 flex-row items-center">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-surface-muted"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#ecedee" : "#11181c"}
          />
        </Pressable>

        <View className="flex-1 ml-2">
          <Text className="text-lg  text-text leading-tight">
            {existingPlan ? "Edit Hifz Plan" : "Create Hifz Plan"}
          </Text>
        </View>
      </View>

      <Screen>
        <ScreenContent>
          <SectionHeader title="Plan Strategy" />
          <View className="p-5 mb-10 rounded-[32px] border border-border bg-surface-muted">
            <View className="mb-6">
              <Text className="text-muted text-[10px] uppercase mb-3 ml-1 tracking-widest">
                Journey Direction
              </Text>
              <Controller
                control={control}
                name="direction"
                render={({ field: { value, onChange } }) => (
                  <View className="flex-row bg-background p-1.5 rounded-2xl border border-border">
                    <Pressable
                      onPress={() => onChange("forward")}
                      className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                        value === "forward" ? "bg-primary " : "bg-transparent"
                      }`}
                    >
                      <Text
                        className={`text-[11px]  uppercase tracking-wider ${
                          value === "forward" ?
                            "text-primary-foreground"
                          : "text-muted"
                        }`}
                      >
                        Forward
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onChange("backward")}
                      className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                        value === "backward" ? "bg-primary " : "bg-transparent"
                      }`}
                    >
                      <Text
                        className={`text-[11px]  uppercase tracking-wider ${
                          value === "backward" ?
                            "text-primary-foreground"
                          : "text-muted"
                        }`}
                      >
                        Juz Amma First
                      </Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>

            <Controller
              control={control}
              name="start_date"
              render={({ field: { value, onChange } }) => (
                <View>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className={`flex-row items-center justify-between active:opacity-60 ${
                      errors.start_date ?
                        "border border-red-100 p-2 rounded-xl"
                      : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center ${
                          errors.start_date ? "bg-red-50" : "bg-primary/10"
                        }`}
                      >
                        <Ionicons
                          name="calendar"
                          size={20}
                          color={errors.start_date ? "#ef4444" : "#276359"}
                        />
                      </View>
                      <View>
                        <Text className="text-muted text-[10px] uppercase tracking-widest mb-0.5">
                          Start Date
                        </Text>
                        <Text
                          className={`text-base ${errors.start_date ? "text-red-500" : "text-text"}`}
                        >
                          {formattedStartDate}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={errors.start_date ? "#ef4444" : "#94a3b8"}
                    />
                  </Pressable>
                  {errors.start_date && (
                    <View className="flex-row items-center mt-2 ml-1 gap-x-1">
                      <Ionicons
                        name="alert-circle-outline"
                        size={12}
                        color="#ef4444"
                      />
                      <Text className="text-red-500 text-[10px] uppercase tracking-tight">
                        {errors.start_date.message}
                      </Text>
                    </View>
                  )}
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(value)}
                      onChange={(e, d) => {
                        setShowDatePicker(false);
                        if (d) onChange(d.toISOString().split("T")[0]);
                      }}
                    />
                  )}
                </View>
              )}
            />
          </View>

          <SectionHeader title="Target & Rate" />
          <View className="p-5 mb-10 rounded-[32px] border border-border bg-surface-muted gap-y-4">
            <Text className="text-muted text-[10px] uppercase tracking-widest mb-4 ml-1">
              Starting Point
            </Text>
            <Controller
              control={control}
              name="start_surah"
              render={({ field: { value, onChange } }) => (
                <View>
                  <SurahDropdown surah={value} setSurah={onChange} />
                  {errors.start_surah && (
                    <Text className="text-[10px] text-red-500 mt-1 ml-1 uppercase">
                      {errors.start_surah.message}
                    </Text>
                  )}
                </View>
              )}
            />
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
                    <Text className="text-[10px] text-red-500 mt-1 ml-1 uppercase">
                      {errors.start_page.message}
                    </Text>
                  )}
                </View>
              )}
            />
            <Controller
              control={control}
              name="pages_per_day"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="DAILY PAGES GOAL"
                  value={String(value)}
                  setValue={(v) => onChange(Number(v))}
                  keyboardType="numeric"
                  leftIcon={
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#94a3b8"
                    />
                  }
                  error={errors.pages_per_day?.message}
                />
              )}
            />
          </View>

          <SectionHeader title="Daily Routine" />
          <View className="p-5 mb-10 rounded-[32px] border border-border bg-surface-muted">
            <Controller
              name="preferred_time"
              control={control}
              render={({ field: { value, onChange } }) => (
                <HabitTriggerSelector
                  value={value}
                  onChange={onChange}
                  isCustom={useWatch({ control, name: "is_custom_time" })}
                  setIsCustom={(val) => setValue("is_custom_time", val)}
                  error={errors.preferred_time?.message}
                />
              )}
            />

            <View className="mb-8">
              <Text className="text-muted text-[10px] uppercase tracking-widest mb-4 ml-1">
                Weekly Commitment
              </Text>
              <Controller
                name="selectedDays"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View>
                    <SelectDays
                      value={value ?? []}
                      onChange={onChange}
                      disabledDay={selectedEvalDay}
                      mode="multi"
                    />
                    {errors.selectedDays && (
                      <Text className="text-[10px] text-red-500 mt-2 uppercase tracking-tight">
                        {errors.selectedDays.message}
                      </Text>
                    )}
                  </View>
                )}
              />
            </View>

            <View className="mb-4">
              <Text className="text-muted text-[10px] uppercase tracking-widest mb-4 ml-1">
                Weekly Evaluation Day <Text className="text-red-500">*</Text>
              </Text>
              <Controller
                name="evaluation_day"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <SelectDays
                    value={value ?? 4}
                    onChange={onChange}
                    mode="single"
                  />
                )}
              />
              {errors.evaluation_day && (
                <Text className="text-[10px] text-red-500 mt-2 uppercase tracking-tight">
                  {errors.evaluation_day.message}
                </Text>
              )}
              <Text className="text-[10px] text-muted mt-4 ml-1 italic leading-relaxed">
                Your progress will be evaluated every{" "}
                {
                  [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ][selectedEvalDay ?? 4]
                }
                .
              </Text>
            </View>
          </View>

          <SectionHeader title="Plan Summary" />
          <View className="p-5 mb-10 rounded-[32px] border border-border bg-surface-muted">
            <StatsSummary control={control} />
          </View>
        </ScreenContent>

        <ScreenFooter>
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 h-14 border-border"
              onPress={() => router.back()}
            >
              <Text className="text-muted uppercase text-[11px] tracking-widest ">
                Cancel
              </Text>
            </Button>
            <Button
              onPress={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="flex-[2] bg-primary h-14 rounded-2xl shadow-lg shadow-primary/20"
            >
              {isSaving ?
                <ActivityIndicator color="#276359" size="small" />
              : <View className="flex-row items-center justify-center gap-2">
                  <Ionicons name="sparkles-outline" size={18} color="#fff" />
                  <Text className="text-primary-foreground uppercase tracking-widest text-[11px] ">
                    {existingPlan ? "Update Plan" : "Launch Plan"}
                  </Text>
                </View>
              }
            </Button>
          </View>
        </ScreenFooter>
      </Screen>
      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
      <NotificationPermissionModal
        visible={showNotificationModal}
        loading={notificationModalLoading}
        onEnable={async () => {
          setNotificationModalLoading(true);
          try {
            await togglePreference(true);
            setShowNotificationModal(false);
            router.back();
          } finally {
            setNotificationModalLoading(false);
          }
        }}
        onSkip={() => {
          setShowNotificationModal(false);
          router.back();
        }}
      />
    </>
  );
}