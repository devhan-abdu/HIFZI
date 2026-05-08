import { Text } from "@/src/components/common/ui/Text";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type HabitProgressRingProps = {
  completedPages: number;
  goalPages: number;
  streak: number;
};

export function HabitProgressRing({
  completedPages,
  goalPages = 5,
  streak,
}: HabitProgressRingProps) {
  const size = 112;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const rawProgress = goalPages > 0 ? completedPages / goalPages : 0;
  const displayProgress = Math.min(1, rawProgress);
  const strokeDashoffset = circumference * (1 - displayProgress);
  
  const isOverflow = completedPages > goalPages;
  const extraPages = completedPages - goalPages;

  return (
    <View className="rounded-3xl w-full p-4">
      <Text className="text-[10px] uppercase tracking-[1.8px] text-slate-400 ">
        Daily Reading Goal
      </Text>
      <View className="mt-3 flex-row items-center justify-between">
        <View style={{ width: size, height: size }} className="items-center justify-center">
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e9f0ef"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isOverflow ? "#3c8a7c" : "#276359"}
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
            <Text className="text-xl text-black text-primary">{Math.round(rawProgress * 100)}%</Text>
            <Text className="text-[8px]  text-primary/60 uppercase tracking-tighter">
              {completedPages} / {goalPages} pages
            </Text>
          </View>
        </View>

        <View className="flex-1 pl-6 justify-center">
          <View className="flex-row items-center gap-1.5 mb-1">
             <Text className="text-sm  text-slate-900">Today's Progress</Text>
             {isOverflow && (
               <View className="bg-primary/10 px-1.5 py-0.5 rounded-md">
                 <Text className="text-[8px]  text-primary">+{extraPages} EXTRA</Text>
               </View>
             )}
          </View>
          
          <Text className="text-[11px] text-slate-500 leading-4">
            {isOverflow 
              ? "Amazing! You exceeded your daily goal. Mastery is near." 
              : rawProgress >= 1 
                ? "Goal completed! Your consistency is paying off."
                : "Keep your daily touch with Qur'an, even with one ayah."}
          </Text>
          
          <View className="mt-4 flex-row items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100">
            <Text className="text-[10px]  uppercase tracking-widest text-slate-400">Streak</Text>
            <View className="flex-row items-center gap-1">
               <Text className="text-sm  text-slate-900">{streak}</Text>
               <Text className="text-[10px]  text-slate-400">days</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
