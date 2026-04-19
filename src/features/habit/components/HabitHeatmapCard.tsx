import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";

type Point = { date: string; count: number };

function intensityClass(count: number) {
  if (count <= 0) return "bg-slate-200";
  if (count === 1) return "bg-emerald-200";
  if (count === 2) return "bg-emerald-400";
  return "bg-emerald-700";
}

export function HabitHeatmapCard({ points }: { points: Point[] }) {
  const last90 = points.slice(-90);
  const totalActiveDays = points.filter((item) => item.count > 0).length;

  return (
    <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
      <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-400">
        Qur&apos;an Activity (90 days)
      </Text>
      <Text className="mt-1 text-sm text-slate-700">{totalActiveDays} active days this year</Text>
      <View className="mt-3 flex-row flex-wrap gap-1">
        {last90.map((point) => (
          <View
            key={point.date}
            className={`h-3 w-3 rounded-[3px] ${intensityClass(point.count)}`}
          />
        ))}
      </View>
    </View>
  );
}
