import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

type ReflectionItem = {
  id: number;
  date: string;
  reflection_text: string;
};

export function ReflectionHistoryCard({ items }: { items: ReflectionItem[] }) {
  return (
    <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
      <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-400">
        Reflection History
      </Text>
      {items.length === 0 ? (
        <Text className="mt-3 text-sm text-slate-500">
          Start journaling after sessions to track your spiritual growth.
        </Text>
      ) : (
        items.slice(0, 4).map((item) => (
          <View key={item.id} className="mt-3 rounded-xl bg-slate-50 p-3">
            <Text className="text-[11px] text-slate-400">{item.date}</Text>
            <Text className="mt-1 text-sm text-slate-800">{item.reflection_text}</Text>
          </View>
        ))
      )}
    </View>
  );
}
