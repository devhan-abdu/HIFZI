import { Pressable, View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

interface Props {
  value: number[];
  onChange: (value: number[]) => void;
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

export default function SelectDays({ value, onChange }: Props) {
  return (
    <View className="flex-row flex-wrap gap-x-2 gap-y-2">
      {dayObjects.map((day) => {
        const isSelected = value.includes(day.offset);

        const handlePress = () => {
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
            className={` flex-1 min-w-[64px] h-10 rounded-full border 
                     ${
                       isSelected ?
                         "border-green-100 bg-primary"
                       : "border-gray-200 bg-white "
                     }
                   items-center justify-center
                active:opacity-90
                `}
          >
            <Text
              className={` text-base ${
                isSelected ? "text-white" : "text-gray-700"
              }`}
            >
              {day.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
