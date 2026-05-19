import React, { useState, useEffect } from "react";
import {
  Pressable,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import Screen from "@/src/components/screen/Screen";
import {
  ScreenContent,
  ScreenFooter,
} from "@/src/components/screen/ScreenContent";
import { Button } from "@/src/components/ui/Button";
import Input from "@/src/components/ui/Input";
import SelectDays from "@/src/features/muraja/components/SelectDays";
import SurahDropdown, {
  SurahPageDropdown,
} from "@/src/features/muraja/components/SurahDropdown";
import { HabitTriggerSelector } from "@/src/components/common/HabitTriggerSelector";

import { useSession } from "@/src/hooks/useSession";
import { useLoadSurahData } from "@/src/hooks/useFetchQuran";
import { useCreatePlan } from "@/src/features/muraja/hooks/useCreatePlan";
import { useQuery } from "@tanstack/react-query";
import { murajaService } from "@/src/features/muraja/services/murajaService";
import {
  IWeeklyMurajaPLan,
  WeeklyMurajaFormType,
  WeeklyMurajaSchema,
} from "@/src/features/muraja/types/index";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useAlert } from "@/src/hooks/useAlert";
import { Alert } from "@/src/components/common/Alert";

export default function CreateWeeklyPlan() {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { user } = useSession();
  const { items } = useLoadSurahData();
  const { createPlan, isCreating } = useCreatePlan();
  const { alertConfig, showSuccess, showError, hideAlert } = useAlert();

  const { data: existingPlan } = useQuery({
    queryKey: ["muraja-dashboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await murajaService.getDashboardState(user.id);
    },
    enabled: !!user?.id,
  });

  const {
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    getValues,
    reset,
  } = useForm({
    resolver: yupResolver(WeeklyMurajaSchema),
    defaultValues: {
      week_start_date: new Date().toISOString().slice(0, 10),
      planned_pages_per_day: 20,
      start_surah: 1,
      start_page: 1,
      end_surah: 114,
      end_page: 604,
      estimated_time_min: 20,
      selectedDays: [(new Date().getDay() + 6) % 7],
      place: "",
      note: "",
      preferred_time: "fajr",
      is_custom_time: false,
      evaluation_day: 5,
    },
  });

  const selectedSurah = useWatch({ control, name: "start_surah" });
  const selectedEndSurah = useWatch({ control, name: "end_surah" });
  const selectedStartPage = useWatch({ control, name: "start_page" });
  const selectedEndPage = useWatch({ control, name: "end_page" });
  const selectedEvalDay = useWatch({ control, name: 'evaluation_day' });
  const weekStart = useWatch({ control, name: "week_start_date" });

  React.useEffect(() => {
    if (selectedSurah && items.length > 0) {
      const found = items.find((s) => s.number === Number(selectedSurah));
      if (found) {
        setValue("start_page", found.startingPage);
      }
    }
  }, [selectedSurah, items]);

  React.useEffect(() => {
    if (selectedEndSurah && items.length > 0) {
      const found = items.find((s) => s.number === Number(selectedEndSurah));
      if (found) {
        setValue("end_page", found.startingPage);
      }
    }
  }, [selectedEndSurah, items]);

  React.useEffect(() => {
    if (selectedStartPage > selectedEndPage) {
      setValue("end_page", selectedStartPage);
      setValue("end_surah", selectedSurah);
    }
  }, [selectedStartPage]);

  React.useEffect(() => {
    if (selectedSurah > selectedEndSurah) {
      setValue("end_surah", selectedSurah);
    }
  }, [selectedSurah]);

  React.useEffect(() => {
    const currentDays = getValues('selectedDays') || [];
    if (currentDays.includes(selectedEvalDay)) {
      setValue('selectedDays', currentDays.filter(d => d !== selectedEvalDay));
    }
  }, [selectedEvalDay]);

  // Pre-fill form from existing plan when available
  useEffect(() => {
    if (existingPlan) {
      const parsedDays = typeof existingPlan.selectedDays === "string"
        ? JSON.parse(existingPlan.selectedDays as any)
        : (existingPlan.selectedDays ?? []);

      reset({
        week_start_date: existingPlan.weekStartDate ?? new Date().toISOString().slice(0, 10),
        planned_pages_per_day: existingPlan.plannedPagesPerDay ?? 20,
        start_page: existingPlan.startPage ?? 1,
        end_page: existingPlan.endPage ?? 604,
        estimated_time_min: existingPlan.estimatedTimeMin ?? 20,
        selectedDays: parsedDays,
        place: "",
        note: "",
        preferred_time: existingPlan.preferredTime ?? "fajr",
        is_custom_time: existingPlan.isCustomTime ?? false,
        evaluation_day: existingPlan.evaluationDay ?? 5,
      });
    }
  }, [existingPlan]);

  const onSubmit = async (data: WeeklyMurajaFormType) => {
    if (!user?.id) return;

    try {
      const totalPages = data.end_page - data.start_page + 1;
      const daysNeeded = Math.ceil(totalPages / data.planned_pages_per_day);
      
      const startDate = new Date(data.week_start_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + daysNeeded);

      const planPayload: Omit<IWeeklyMurajaPLan, "id"> = {
        user_id: user.id,
        remote_id: null,
        week_start_date: data.week_start_date,
        week_end_date: endDate.toISOString().slice(0, 10),
        planned_pages_per_day: data.planned_pages_per_day,
        start_page: data.start_page,
        end_page: data.end_page,
        is_active: 1,
        selected_days: JSON.stringify(data.selectedDays),
        sync_status: 0,
        estimated_time_min: data.estimated_time_min,
        place: data.place || null,
        note: data.note || null,
        preferred_time: data.preferred_time,
        is_custom_time: data.is_custom_time ?? false,
        evaluationDay: data.evaluation_day,
      };

     
      await createPlan(planPayload);

      showSuccess(
        existingPlan ? "Plan Updated!" : "Plan Launched!",
        existingPlan
          ? "Your Muraja plan has been updated successfully."
          : "Your weekly Muraja journey has been created successfully.",
        () => router.back(),
      );
    } catch (error: any) {
      showError("Oops!", "We couldn't create your plan right now. Please  try again.");
    }
  };

  const formattedWeekStart =
    weekStart ?
      new Date(weekStart).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  const ErrorMessage = ({ error }: { error: any }) => {
    if (!error) return null;
    return (
      <View className="flex-row items-center mt-1 ml-1 gap-x-1">
        <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
        <Text className="text-red-500 text-[10px]   uppercase tracking-tight">
          {error.message}
        </Text>
      </View>
    );
  };

  return (
    <>
      <View className="h-16 px-4 flex-row items-center">
        <Pressable
          onPress={() => router.replace('/(app)/muraja')}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>

        <View className="flex-1 ml-2">
          <Text className="text-lg  text-primary leading-tight">
            {existingPlan ? "Edit Muraja Plan" : "Create Muraja Plan"}
          </Text>
        </View>
      </View>
      <Screen>
        <ScreenContent>
          <View className="mb-10 p-5  rounded-[32px] border border-slate-100">
            <Text className="text-slate-400 text-[10px] uppercase mb-4 ml-1 tracking-widest ">
              Plan Focus
            </Text>
            <Controller
              control={control}
              name="week_start_date"
              render={({ field: { value, onChange } }) => (
                <View>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className={`flex-row items-center justify-between active:opacity-60 ${
                      errors.week_start_date ?
                        "border border-red-100 p-2 rounded-xl"
                      : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                        <Ionicons name="calendar" size={20} color="#276359" />
                      </View>
                      <View>
                        <Text
                          className={`text-base  ${
                            formattedWeekStart ? "text-slate-900" : (
                              "text-slate-600"
                            )
                          }`}
                        >
                          {formattedWeekStart || "Select Start Date"}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#0f172a" />
                  </Pressable>
                  <ErrorMessage error={errors.week_start_date} />
                  {showDatePicker && (
                    <DateTimePicker
                      value={value ? new Date(value) : new Date()}
                      mode="date"
                      onChange={(e, date) => {
                        setShowDatePicker(false);
                        if (date) onChange(date.toISOString().slice(0, 10));
                      }}
                    />
                  )}
                </View>
              )}
            />
          </View>

          <SectionHeader title="Target Range" />
          <View className="p-5 mb-10  rounded-[32px] border border-slate-100 gap-y-4">
            <Controller
              control={control}
              name="start_surah"
              render={({ field: { value, onChange } }) => (
                <View>
                  <SurahDropdown surah={value} setSurah={onChange} />
                  <ErrorMessage error={errors.start_surah} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="start_page"
              render={({ field: { value, onChange } }) => (
                <View>
                  <SurahPageDropdown
                    label="Start Page"
                    surah={selectedSurah}
                    setPage={onChange}
                    page={value}
                  />
                  <ErrorMessage error={errors.start_page} />
                </View>
              )}
            />

            <View className="h-[1px]  my-2" />

            <Controller
              control={control}
              name="end_surah"
              render={({ field: { value, onChange } }) => (
                <View>
                  <SurahDropdown label="End Surah" surah={value} setSurah={onChange} />
                  <ErrorMessage error={errors.end_surah} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="end_page"
              render={({ field: { value, onChange } }) => (
                <View>
                  <SurahPageDropdown
                    label="End Page"
                    surah={selectedEndSurah}
                    setPage={onChange}
                    page={value}
                  />
                  <ErrorMessage error={errors.end_page} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="planned_pages_per_day"
              render={({ field: { value, onChange } }) => (
                <View className="mt-2">
                  <Input
                    label="Daily Page Goal"
                    placeholder="20"
                    value={value ? String(value) : " "}
                    setValue={(v) => onChange(v)}
                    keyboardType="numeric"
                    leftIcon={
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color="#94a3b8"
                      />
                    }
                  />
                  <ErrorMessage error={errors.planned_pages_per_day} />
                </View>
              )}
            />
          </View>

          {/* STEP 3: TIME & SCHEDULE */}
          <SectionHeader title="Daily Routine" />
          <View className="p-5 mb-10  rounded-[32px] border border-slate-100">
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
            <Controller
              name="selectedDays"
              control={control}
              render={({ field: { value, onChange } }) => (
                <View className="mb-8">
                  <Text className="text-slate-400 text-[10px] uppercase tracking-widest mb-4 ml-1 ">
                    Weekly Commitment
                  </Text>
                  <SelectDays 
                    value={value ?? []} 
                    onChange={onChange} 
                    mode="multi"
                    disabledDay={useWatch({ control, name: 'evaluation_day' })}
                  />
                  <ErrorMessage error={errors.selectedDays} />
                </View>
              )}
            />

            <View className="mb-4">
              <Text className="text-slate-400 text-[10px] uppercase mb-4 ml-1 tracking-widest ">
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
              <ErrorMessage error={errors.evaluation_day} />
              <Text className="text-[10px] text-slate-400 mt-4 ml-1 italic leading-relaxed">
                Your weekly progress will be evaluated every {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][useWatch({ control, name: 'evaluation_day' }) ?? 4]}.
              </Text>
            </View>
          </View>

          <SectionHeader title="Duration & Details" />
          <View className="p-5 mb-10  rounded-[32px] border border-slate-100 gap-y-5">
            <Controller
              control={control}
              name="estimated_time_min"
              render={({ field: { value, onChange } }) => (
                <View>
                  <Input
                    label="Estimated Daily Duration"
                    value={String(value)}
                    setValue={(v) => onChange(Number(v))}
                    keyboardType="numeric"
                    leftIcon={
                      <Ionicons name="time-outline" size={18} color="#94a3b8" />
                    }
                    rightIcon={
                      <Text className="text-slate-400 text-[10px] uppercase">
                        min
                      </Text>
                    }
                  />
                  <ErrorMessage error={errors.estimated_time_min} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="place"
              render={({ field: { value, onChange } }) => (
                <View>
                  <Input
                    label="Location"
                    placeholder="e.g. Mosque"
                    value={value ?? ""}
                    setValue={onChange}
                    leftIcon={
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color="#94a3b8"
                      />
                    }
                  />
                  <ErrorMessage error={errors.place} />
                </View>
              )}
            />
            <View>
              <Text className="text-slate-400 text-[10px] uppercase tracking-widest mb-2 ml-1 ">
                Personal Intentions
              </Text>
              <Controller
                name="note"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View>
                    <TextInput
                      style={{
                        fontFamily: "Rosemary",
                      }}
                      className={`bg-white rounded-2xl p-4 min-h-[100px] text-slate-900 border ${
                        errors.note ? "border-red-500" : "border-slate-100"
                      } focus:border-primary/40`}
                      onChangeText={onChange}
                      value={value ?? ""}
                      placeholder="Set a reminder for yourself..."
                      multiline
                      textAlignVertical="top"
                    />
                    <ErrorMessage error={errors.note} />
                  </View>
                )}
              />
            </View>
          </View>
        </ScreenContent>

        <ScreenFooter>
          <View className="flex-row gap-3 ">
            <Button
              variant="outline"
              className="flex-1 h-14 border-slate-200"
              onPress={() => router.back()}
            >
              <Text className="text-slate-500  uppercase text-[11px] tracking-widest">
                Cancel
              </Text>
            </Button>
            <Button
              className="flex-[2] h-14 bg-primary shadow-lg shadow-primary/20"
              onPress={handleSubmit(onSubmit)}
              disabled={isCreating}
            >
              {isCreating ?
                <ActivityIndicator color="white" size="small" />
              : <View className="flex-row items-center justify-center gap-2">
                  <Ionicons name="rocket-outline" size={18} color="#fff" />
                  <Text className="text-white  uppercase text-[11px] tracking-widest">
                    Launch Plan
                  </Text>
                </View>
              }
            </Button>
          </View>
        </ScreenFooter>
      </Screen>

      <Alert {...alertConfig} onCancel={hideAlert} confirmText="OK" />
    </>
  );
}
