import { PlanSuggestion } from "../services/planningEngine";
import { Modal, Pressable, View, ScrollView, Dimensions } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";

import { useRefreshGuidance } from "../hooks/useAdaptiveGuidance";

type SuggestionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  isStale?: boolean;
  suggestion: PlanSuggestion | null;
  explanation: string;
  completionRate: number;
  streak: number;
  revisionFrequency: number;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

function mapAdjustmentLabel(value: PlanSuggestion["hifzAdjustment"] | undefined) {
  if (value === "increase") return "Increase Hifz load";
  if (value === "decrease") return "Reduce Hifz load";
  return "Keep Hifz load stable";
}

export function SuggestionsSheet({
  visible,
  onClose,
  loading = false,
  isStale = false,
  suggestion,
  explanation,
  completionRate,
  streak,
  revisionFrequency,
}: SuggestionsSheetProps) {
  const focusPages = suggestion?.focusPages ?? [];
  const refreshMutation = useRefreshGuidance();
  const isRefreshing = refreshMutation.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View 
          className="rounded-t-3xl bg-white border-t border-slate-200"
          style={{ maxHeight: SCREEN_HEIGHT * 0.85 }}
        >
          <View className="flex-row items-center justify-between p-5 pb-2">
            <View>
              <Text className="text-slate-900 text-xl font-bold">Adaptive Suggestions</Text>
              {isStale && !isRefreshing && (
                <Text className="text-orange-500 text-xs font-medium">New progress detected</Text>
              )}
            </View>
            <View className="flex-row items-center gap-2">
              {(isStale || isRefreshing) && (
                <Pressable 
                  onPress={() => refreshMutation.mutate()}
                  disabled={isRefreshing}
                  className={`flex-row items-center px-3 py-2 rounded-full ${isRefreshing ? 'bg-slate-100' : 'bg-blue-50'}`}
                >
                  <Ionicons 
                    name={isRefreshing ? "sync" : "sparkles"} 
                    size={14} 
                    color={isRefreshing ? "#64748b" : "#2563eb"} 
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                  <Text className={`ml-1 text-xs font-semibold ${isRefreshing ? 'text-slate-500' : 'text-blue-600'}`}>
                    {isRefreshing ? "Updating..." : "Refresh"}
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
                <Ionicons name="close" size={20} color="#0f172a" />
              </Pressable>
            </View>
          </View>

          <ScrollView 
            className="px-5" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4">
              <Text className="text-[10px] uppercase font-bold tracking-[2px] text-slate-500 mb-2">Next Task</Text>
              <Text className="text-slate-900 text-base font-semibold">
                {mapAdjustmentLabel(suggestion?.hifzAdjustment)}
              </Text>
              <Text className="text-slate-600 mt-2 text-sm leading-5">
                {loading ? "Preparing your recommendations..." : explanation}
              </Text>
            </View>

            <View className="bg-white rounded-2xl p-4 border border-slate-200 mb-4">
              <Text className="text-[10px] uppercase font-bold tracking-[2px] text-slate-500 mb-2">Plan Insights</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-600 text-sm">Completion</Text>
                <Text className="text-slate-900 font-semibold">{completionRate}%</Text>
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-slate-600 text-sm">Current streak</Text>
                <Text className="text-slate-900 font-semibold">{streak} day(s)</Text>
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-slate-600 text-sm">Revision frequency</Text>
                <Text className="text-slate-900 font-semibold">{revisionFrequency} / week</Text>
              </View>
            </View>

            <View className="bg-white rounded-2xl p-4 border border-slate-200">
              <Text className="text-[10px] uppercase font-bold tracking-[2px] text-slate-500 mb-2">Adaptive Focus</Text>
              {focusPages.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {focusPages.map((page) => (
                    <View key={page} className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      <Text className="text-blue-700 text-xs font-medium">Page {page}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-slate-600 text-sm italic">
                  No weak pages detected. Keep your consistency!
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
