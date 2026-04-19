import { memo } from "react";
import { Pressable,  View } from "react-native";
import { Surah } from "../type";
import { Text } from "@/src/components/common/ui/Text";

interface SurahRowProps {
  surah: Surah;
  onPress: (surah: Surah) => void;
}

export const SurahRow = memo(({ surah, onPress }: SurahRowProps) => {
  return (
    <Pressable onPress={() => onPress(surah)} className=" px-4">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 flex-row items-center gap-4">
          <Text className="text-xl text-black">{surah.number}</Text>
          <View>
            <Text className="text-lg ">{surah.englishName}</Text>
            <Text className="text-sm ">
              {surah.numberOfAyahs} Ayahs - {surah.revelationType}
            </Text>
          </View>
        </View>
        <Text className="text-lg ">{surah.startingPage}</Text>
      </View>
    </Pressable>
  );
});
