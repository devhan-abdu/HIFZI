import React, { useState } from "react";
import { View,  } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent, ScreenFooter } from "@/src/components/screen/ScreenContent";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { CustomDropdown } from "@/src/features/muraja/components/SurahDropdown";

export default function ExamIndex() {
  const router = useRouter();
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(604);

  const startTest = () => {
    const pages = Array.from(
      { length: toPage - fromPage + 1 },
      (_, i) => fromPage + i,
    );

    router.push({
      pathname: "/test/exam",
      params: { pages: JSON.stringify(pages) },
    });
  };

  return (
    <Screen>
      <ScreenContent>
        <View className="mb-12">
          <Text className="text-4xl  text-text mb-1">Test</Text>
          <Text className="text-muted text-lg">
            Select your revision range to begin.
          </Text>
        </View>

        <View className="bg-surface-muted border border-border rounded-[32px]">
          <View className="p-8 bg-surface-muted">

          <View className="flex-row items-center justify-between mb-8 ">
            <View className="bg-primary p-2 rounded-full">
              <Ionicons name="book-outline" size={20} color="#fff" />
            </View>
            <Text className="text-text uppercase text-[10px] tracking-widest">
              Custom Range
            </Text>
          </View>

          <View className="flex-col gap-8">
            <View className="flex-1">
              <Text className=" text-text text-[11px] uppercase mb-2 ml-1">
                From Page
              </Text>
              <CustomDropdown page={fromPage} setPage={setFromPage} />
            </View>

        
            <View className="flex-1">
              <Text className="text-text  text-[11px] uppercase mb-2 ml-1">
                To Page
              </Text>
              <CustomDropdown page={toPage} setPage={setToPage} />
            </View>
          </View>

          <View className="mt-8 pt-6 border-t border-border flex-row justify-between items-center">
            <Text className=" text-sm">Total Pages:</Text>
            <View className="bg-primary px-3 py-1 rounded-full">
              <Text className="text-primary-foreground  text-xs">
                {toPage - fromPage + 1} Pages
              </Text>
            </View>
            </View>
            </View>
        </View>
      </ScreenContent>

      <ScreenFooter>
        <Button onPress={startTest} className="bg-primary h-14 rounded-2xl ">
          <Text className="text-primary-foreground text-xl  mr-2">Start Exam</Text>
        </Button>
      </ScreenFooter>
    </Screen>
  );
}
