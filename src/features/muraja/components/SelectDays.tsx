import { Pressable, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

interface Props {
  value: number[] | number;
  onChange: (value: any) => void;
  disabledDay?: number;
  mode?: 'single' | 'multi';
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

export default function SelectDays({ value, onChange, disabledDay, mode = 'multi' }: Props) {
  return (
    <View className="flex-row flex-wrap gap-x-2 gap-y-2">
      {dayObjects.map((day) => {
        const isEvaluationDay = disabledDay !== undefined && day.offset === disabledDay;
        
        const isSelected = mode === 'multi' 
          ? (value as number[]).includes(day.offset) && !isEvaluationDay
          : value === day.offset;

        const handlePress = () => {
          if (isEvaluationDay) return;
          
          if (mode === 'multi') {
            const currentVal = value as number[];
            if (isSelected) {
              onChange(currentVal.filter((v) => v !== day.offset));
            } else {
              onChange([...currentVal, day.offset]);
            }
          } else {
            onChange(day.offset);
          }
        };

        return (
          <Pressable
            key={day.offset}
            onPress={handlePress}
            disabled={isEvaluationDay}
            className={` flex-1 min-w-[64px] h-12 rounded-full border 
                      ${
                        isSelected ?
                          "border-primary bg-primary"
                        : isEvaluationDay ?
                          "border-amber-200 border-dashed bg-white "
                        : "border-slate-100 bg-white"
                      }
                    items-center justify-center
                 active:opacity-90
                 `}
          >
            <View className="items-center">
                <Text
                className={` text-sm ${
                    isSelected ? "text-white" : isEvaluationDay ? "text-amber-700/60 " : "text-slate-600"
                }`}
                >
                {day.name}
                </Text>
                {isEvaluationDay && (
                    <Text className="text-[7px] uppercase tracking-tighter text-amber-600 ">Eval</Text>
                )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
