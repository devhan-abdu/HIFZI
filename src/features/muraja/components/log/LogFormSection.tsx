import React from "react";
import { View, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/src/components/common/ui/Text";
import { StatusTab } from "@/src/features/hifz/components/StatusTab";
import { useColorScheme } from "nativewind";
import SurahDropdown, {
  SurahPageDropdown,
} from "@/src/features/muraja/components/SurahDropdown";

interface LogFormSectionProps {
  form: any;
  updateForm: (updates: Partial<any>) => void;
  items: any[];
  todayTask: any;
  recalcPages: (sp: number, ep: number) => number;
  showDetails: boolean;
  isLocked: boolean;
  heroPages: number;
}

export function LogFormSection({
  form,
  updateForm,
  items,
  todayTask,
  recalcPages,
  showDetails,
  isLocked,
  heroPages,
}: LogFormSectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const controlIconColor = isDark ? "#ffffff" : "#276359";
  const secondaryIconColor = isDark ? "#cbd5e1" : "#64748b";
  const shellClass = "bg-surface dark:bg-surface-muted border border-border dark:border-white/10";
  const controlShell = "bg-background dark:bg-background/30 border border-border dark:border-white/15";

  const {
    showCustomRange,
    startSurah,
    startPage,
    endSurah,
    endPage,
    pages,
    rangeError,
    status,
    mistakes,
    hesitations,
    min,
    note,
    error,
  } = form;

  if (isLocked) return null;

  return (
    <>
      <View className="mb-8">
        {!showCustomRange ?
          <Pressable
            onPress={() => updateForm({ showCustomRange: true })}
            className={`flex-row items-center justify-center gap-2 py-4 rounded-2xl active:bg-surface dark:active:bg-surface-muted ${controlShell}`}
          >
            <Ionicons name="options-outline" size={20} color={secondaryIconColor} />
            <Text className="text-muted">Add Custom Range</Text>
          </Pressable>
        : <View className={`p-5 rounded-3xl shadow-sm gap-y-4 ${shellClass}`}>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-text text-base ml-1">Study Range</Text>
              <Pressable
                onPress={() => {
                  updateForm({ showCustomRange: false, rangeError: "" });
                  if (todayTask) {
                    const sn =
                      items.find((s) => s.englishName === todayTask.startSurah)
                        ?.number || 1;
                    const en =
                      items.find((s) => s.englishName === todayTask.endSurah)
                        ?.number || 1;
                    updateForm({
                      startSurah: sn,
                      startPage: todayTask.startPage || 1,
                      endSurah: en,
                      endPage: todayTask.endPage || 1,
                      pages: recalcPages(todayTask.startPage, todayTask.endPage)
                    });
                  }
                }}
                className="p-1"
              >
                <Ionicons name="close" size={20} color={secondaryIconColor} />
              </Pressable>
            </View>
            <SurahDropdown
              label="Start Surah"
              surah={startSurah}
              setSurah={(newSurah) => {
                const found = items.find((s) => s.number === newSurah);
                const newStartPage = found?.startingPage ?? startPage;
                const updates: any = { startSurah: newSurah, startPage: newStartPage };
                if (newSurah > endSurah) {
                  updates.endSurah = newSurah;
                  updates.endPage = newStartPage;
                  updates.pages = 1;
                  updates.rangeError = "";
                } else {
                  updates.pages = recalcPages(newStartPage, endPage);
                  updates.rangeError = newStartPage > endPage ? "End page must be ≥ start page." : "";
                }
                updateForm(updates);
              }}
            />
            <SurahPageDropdown
              label="Start Page"
              surah={startSurah}
              page={startPage}
              setPage={(newPage) => {
                const updates: any = { startPage: newPage };
                if (newPage > endPage) {
                  updates.rangeError = "End page must be ≥ start page.";
                  updates.pages = 0;
                } else {
                  updates.rangeError = "";
                  updates.pages = recalcPages(newPage, endPage);
                }
                updateForm(updates);
              }}
            />
            <View className="h-[1px] bg-border dark:bg-white/10 my-2" />
            <SurahDropdown
              label="End Surah"
              surah={endSurah}
              setSurah={(newSurah) => {
                const found = items.find((s) => s.number === newSurah);
                const newEndPage = found?.startingPage ?? endPage;
                const updates: any = { endSurah: newSurah, endPage: newEndPage };
                if (newEndPage < startPage) {
                  updates.rangeError = "End page must be ≥ start page.";
                  updates.pages = 0;
                } else {
                  updates.rangeError = "";
                  updates.pages = recalcPages(startPage, newEndPage);
                }
                updateForm(updates);
              }}
            />
            <SurahPageDropdown
              label="End Page"
              surah={endSurah}
              page={endPage}
              setPage={(newPage) => {
                const updates: any = { endPage: newPage };
                if (newPage < startPage) {
                  updates.rangeError = "End page must be ≥ start page.";
                  updates.pages = 0;
                } else {
                  updates.rangeError = "";
                  updates.pages = recalcPages(startPage, newPage);
                }
                updateForm(updates);
              }}
            />
            {rangeError ?
              <View className="flex-row items-center gap-2 bg-red-50 dark:bg-rose-500/10 border border-red-100 dark:border-rose-500/20 px-4 py-3 rounded-xl mt-1">
                <Ionicons name="warning-outline" size={16} color="#ef4444" />
                <Text className="text-red-500 text-xs flex-1">
                  {rangeError}
                </Text>
              </View>
            : null}
          </View>
        }
      </View>

      {!showCustomRange && (
        <View className="mb-8">
          <Text className="text-text text-base mb-4 ml-1">
            How did it go?
          </Text>
          <View className="flex-row justify-between">
            <StatusTab
              label="Completed"
              icon="checkmark-circle"
              active={status === "completed"}
              onPress={() => {
                updateForm({ status: "completed", pages: recalcPages(startPage, endPage) });
              }}
            />
            <StatusTab
              label="Partial"
              icon="contrast"
              active={status === "partial"}
              onPress={() => {
                updateForm({
                  status: "partial",
                  pages: Math.max(1, Math.floor(recalcPages(startPage, endPage) / 2))
                });
              }}
            />
            <StatusTab
              label="Missed"
              icon="close-circle"
              active={status === "missed"}
              onPress={() => {
                updateForm({ status: "missed", pages: 0 });
              }}
            />
          </View>
        </View>
      )}

      {showDetails && (
        <View className="mb-8">
          <Text className="text-text text-base mb-4 ml-1">
            Reading Quality
          </Text>
          <View className="flex-row gap-4">
            <View className={`flex-1 p-4 rounded-2xl ${shellClass}`}>
              <View className="flex-row items-center gap-2 mb-3">
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text className="text-muted text-xs">Mistakes</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => updateForm({ mistakes: Math.max(0, mistakes - 1) })}
                  className={`w-8 h-8 items-center justify-center rounded-lg active:bg-surface dark:active:bg-surface-muted ${controlShell}`}
                >
                  <Ionicons name="remove" size={16} color={controlIconColor} />
                </Pressable>
                <Text className="text-lg text-text">{mistakes}</Text>
                <Pressable
                  onPress={() => updateForm({ mistakes: mistakes + 1 })}
                  className={`w-8 h-8 items-center justify-center rounded-lg active:bg-surface dark:active:bg-surface-muted ${controlShell}`}
                >
                  <Ionicons name="add" size={16} color="#ef4444" />
                </Pressable>
              </View>
            </View>
            <View className={`flex-1 p-4 rounded-2xl ${shellClass}`}>
              <View className="flex-row items-center gap-2 mb-3">
                <Ionicons name="timer-outline" size={16} color="#eab308" />
                <Text className="text-muted text-xs">Hesitations</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => updateForm({ hesitations: Math.max(0, hesitations - 1) })}
                  className={`w-8 h-8 items-center justify-center rounded-lg active:bg-surface dark:active:bg-surface-muted ${controlShell}`}
                >
                  <Ionicons name="remove" size={16} color={controlIconColor} />
                </Pressable>
                <Text className="text-lg text-text">{hesitations}</Text>
                <Pressable
                  onPress={() => updateForm({ hesitations: hesitations + 1 })}
                  className={`w-8 h-8 items-center justify-center rounded-lg active:bg-surface dark:active:bg-surface-muted ${controlShell}`}
                >
                  <Ionicons name="add" size={16} color="#eab308" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className="mb-8">
        <Text className="text-text text-base mb-4 ml-1">
          Actual Progress
        </Text>
        <View className={`p-5 rounded-3xl ${shellClass}`}>
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-text">Pages Completed</Text>
              <Text className="text-muted text-[10px]">
                {showCustomRange ?
                  `Range: ${startPage}–${endPage}`
                : "Adjust if you did more/less"}
              </Text>
            </View>
            <View className={`flex-row items-center rounded-xl p-1 ${controlShell}`}>
              <Pressable
                onPress={() => {
                  const newPages = Math.max(0, pages - 1);
                  const updates: any = { pages: newPages };
                  if (!showCustomRange) {
                    if (newPages === 0) updates.status = "missed";
                    else if (status === "completed") updates.status = "partial";
                  }
                  updateForm(updates);
                }}
                className={`w-9 h-9 items-center justify-center active:bg-surface dark:active:bg-surface-muted rounded-lg ${controlShell}`}
              >
                <Ionicons name="remove" size={18} color={controlIconColor} />
              </Pressable>
              <Text className="text-xl text-text px-4">{heroPages}</Text>
              <Pressable
                onPress={() => {
                  const newPages = pages + 1;
                  const updates: any = { pages: newPages };
                  if (!showCustomRange && status === "missed") updates.status = "partial";
                  updateForm(updates);
                }}
                className={`w-9 h-9 items-center justify-center active:bg-surface dark:active:bg-surface-muted rounded-lg ${controlShell}`}
              >
                <Ionicons name="add" size={18} color={controlIconColor} />
              </Pressable>
            </View>
          </View>
          {showDetails && (
            <View className="mb-5">
              <Text className="text-muted text-[10px] uppercase tracking-widest mb-2 ml-1">
                Time Spent (min)
              </Text>
              <TextInput
                placeholder="Minutes"
                placeholderTextColor="#cbd5e1"
                keyboardType="numeric"
                value={min}
                onChangeText={(val) => updateForm({ min: val })}
                className="bg-background/50 dark:bg-background/20 px-4 h-12 rounded-xl border border-border dark:border-white/10 text-text text-sm"
              />
            </View>
          )}
          <View>
            <Text className="text-muted text-[10px] uppercase tracking-widest mb-2 ml-1">
              Notes & Reflection
            </Text>
            <TextInput
              multiline
              placeholder="Any specific difficulties?"
              placeholderTextColor="#cbd5e1"
              value={note}
              onChangeText={(val) => updateForm({ note: val })}
              className="bg-background/50 dark:bg-background/20 p-4 rounded-2xl border border-border dark:border-white/10 h-24 text-text text-sm"
              textAlignVertical="top"
            />
          </View>
        </View>
        {error ?
          <Text className="text-red-500 mt-4 text-center text-xs">{error}</Text>
        : null}
      </View>
    </>
  );
}
