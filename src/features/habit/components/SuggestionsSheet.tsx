import { PlanSuggestion } from "../services/planningEngine";
import { Modal, Pressable, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";

type SuggestionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  suggestion: PlanSuggestion | null;
  explanation: string;
  completionRate: number;
  streak: number;
  revisionFrequency: number;
};

function mapAdjustmentLabel(value: PlanSuggestion["hifzAdjustment"] | undefined) {
  if (value === "increase") return "Increase Hifz load";
  if (value === "decrease") return "Reduce Hifz load";
  return "Keep Hifz load stable";
}

export function SuggestionsSheet({
  visible,
  onClose,
  loading = false,
  suggestion,
  explanation,
  completionRate,
  streak,
  revisionFrequency,
}: SuggestionsSheetProps) {
  const focusPages = suggestion?.focusPages ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end ">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-3xl bg-white p-5 border-t border-slate-200 ">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-900 text-xl">Adaptive Suggestions</Text>
            <Pressable onPress={onClose} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>

          <View className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4">
            <Text className="text-[10px] uppercase tracking-[2px] text-slate-500 mb-2">Next Task</Text>
            <Text className="text-slate-900 text-base">
              {mapAdjustmentLabel(suggestion?.hifzAdjustment)}
            </Text>
            <Text className="text-slate-600 mt-2 text-sm">
              {loading ? "Preparing your recommendations..." : explanation}
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 border border-slate-200 mb-4">
            <Text className="text-[10px] uppercase tracking-[2px] text-slate-500 mb-2">Plan Insights</Text>
            <Text className="text-slate-800 text-sm">Completion: {completionRate}%</Text>
            <Text className="text-slate-800 text-sm mt-1">Current streak: {streak} day(s)</Text>
            <Text className="text-slate-800 text-sm mt-1">
              Revision frequency: {revisionFrequency} sessions/week
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 border border-slate-200 mb-24">
            <Text className="text-[10px] uppercase tracking-[2px] text-slate-500 mb-2">Adaptive Focus</Text>
            {focusPages.length > 0 ? (
              <Text className="text-slate-800 text-sm">Review pages: {focusPages.join(", ")}</Text>
            ) : (
              <Text className="text-slate-600 text-sm">
                No weak pages detected. Keep your consistency and log your next session.
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
