import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type HabitProgressRingProps = {
  currentMinutes: number;
  goalMinutes?: number;
  streak: number;
};

export function HabitProgressRing({
  currentMinutes,
  goalMinutes = 20,
  streak,
}: HabitProgressRingProps) {
  const size = 112;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, currentMinutes / goalMinutes));
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
      <Text className="text-[10px] uppercase tracking-[1.8px] text-amber-700">
        Daily Reading Goal
      </Text>
      <View className="mt-3 flex-row items-center justify-between">
        <View style={{ width: size, height: size }} className="items-center justify-center">
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#fde68a"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#d97706"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <View className="absolute items-center">
            <Text className="text-xl text-amber-900">{Math.round(progress * 100)}%</Text>
            <Text className="text-[10px] text-amber-700">
              {currentMinutes} / {goalMinutes} min
            </Text>
          </View>
        </View>

        <View className="flex-1 pl-4">
          <Text className="text-sm text-slate-900">Consistency score</Text>
          <Text className="mt-1 text-[11px] text-slate-600">
            Keep your daily touch with Qur&apos;an, even with one ayah.
          </Text>
          <View className="mt-3 rounded-xl bg-white px-3 py-2">
            <Text className="text-[10px] uppercase tracking-widest text-slate-500">Streak</Text>
            <Text className="text-xl text-slate-900">{streak} days</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
