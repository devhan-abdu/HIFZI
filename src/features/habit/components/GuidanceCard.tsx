import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { PlanSuggestion } from "../services/planningEngine";

type GuidanceCardProps = {
  suggestion: PlanSuggestion | null;
  explanation: string;
  loading?: boolean;
};

function getActionText(suggestion: PlanSuggestion | null): string {
  if (!suggestion) return "Analyzing your recent activity...";
  if (suggestion.hifzAdjustment === "increase") return "Suggested action: Increase your hifz load.";
  if (suggestion.hifzAdjustment === "decrease") return "Suggested action: Reduce hifz load and stabilize.";
  return "Suggested action: Keep your current hifz load stable.";
}

export function GuidanceCard({ suggestion, explanation, loading = false }: GuidanceCardProps) {
  const focusPages = suggestion?.focusPages ?? [];

  return (
    <View className="mt-6 rounded-2xl bg-white border border-slate-200 p-4">
      <Text className="text-gray-400 uppercase tracking-[2px] text-[10px] mb-2">Guidance</Text>
      <Text className="text-lg text-slate-900 mb-2">{getActionText(suggestion)}</Text>
      {focusPages.length > 0 ? (
        <Text className="text-sm text-slate-700 mb-2">Focus pages: {focusPages.join(", ")}</Text>
      ) : null}
      <Text className="text-sm text-slate-600 leading-5">
        {loading ? "Preparing your explanation..." : explanation}
      </Text>
    </View>
  );
}
