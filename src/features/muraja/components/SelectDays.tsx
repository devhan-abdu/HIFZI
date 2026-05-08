import { Pressable, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

interface Props {
  value: number[];
  onChange: (value: number[]) => void;
  disabledDay?: number;
}

const dayObjects = [
  { name: "Mon", offset: 0 },
  { name: "Tue", offset: 1 },
  { name: "Wed", offset: 2 },
  { name: "Thu", offset: 3 },
  { name: "Fri", offset: 4 },
  { name: "Sat", offset: 5 },
  { name: "Sun", offset: 6 },
];

export default function SelectDays({ value, onChange, disabledDay }: Props) {
  return (
    <View className="flex-row flex-wrap gap-x-2 gap-y-2">
      {dayObjects.map((day) => {
        const isSelected = value.includes(day.offset);
        const isEvaluationDay = day.offset === disabledDay;

        const handlePress = () => {
          if (isEvaluationDay) return;
          if (isSelected) {
            onChange(value.filter((v) => v !== day.offset));
          } else {
            onChange([...value, day.offset]);
          }
        };
        return (
          <Pressable
            key={day.offset}
            onPress={handlePress}
            disabled={isEvaluationDay}
            className={` flex-1 min-w-[64px] h-12 rounded-2xl border 
                     ${
                       isSelected ?
                         "border-green-100 bg-primary shadow-sm"
                       : isEvaluationDay ?
                         "border-amber-100 bg-amber-50/30"
                       : "border-gray-100 bg-white "
                     }
                   items-center justify-center
                active:opacity-90
                `}
          >
            <View className="items-center">
                <Text
                className={` text-sm font-medium ${
                    isSelected ? "text-white" : isEvaluationDay ? "text-amber-600/50" : "text-gray-700"
                }`}
                >
                {day.name}
                </Text>
                {isEvaluationDay && (
                    <Text className="text-[7px] uppercase tracking-tighter text-amber-500 font-bold">Eval</Text>
                )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
