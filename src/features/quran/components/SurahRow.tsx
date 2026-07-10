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
    <Pressable onPress={() => onPress(surah)} className="px-6 py-4 active:bg-primary/5 dark:active:bg-white/5">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 flex-row items-center gap-5">
          <Text className="text-xl text-text opacity-70 w-8">{surah.number}</Text>
          <View>
            <Text className="text-lg text-text ">{surah.englishName}</Text>
            <Text className="text-xs text-muted mt-0.5">
              {surah.revelationType} - {surah.numberOfAyahs} verses
            </Text>
          </View>
        </View>
        <Text className="text-sm text-muted">{surah.startingPage}</Text>
      </View>
    </Pressable>
  );
});

SurahRow.displayName = "SurahRow";
