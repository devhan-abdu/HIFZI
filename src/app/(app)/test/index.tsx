import React, { useState } from "react";
import { View,  } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import Screen from "@/src/components/screen/Screen";
import { ScreenContent, ScreenFooter } from "@/src/components/screen/ScreenContent";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button } from "@/src/components/ui/Button";
import { CustomDropdown } from "@/src/features/muraja/components/SurahDropdown";

export default function Home() {
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
          <Text className="text-4xl  text-slate-900 mb-1">Test</Text>
          <Text className="text-slate-500 text-lg">
            Select your revision range to begin.
          </Text>
        </View>

        <View className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm shadow-slate-200/50">
          <View className="flex-row items-center justify-between mb-8">
            <View className="bg-primary/10 p-2 rounded-full">
              <Ionicons name="book-outline" size={24} color="#276359" />
            </View>
            <Text className="text-black uppercase text-[10px] tracking-widest">
              Custom Range
            </Text>
          </View>

          <View className="flex-col gap-8">
            <View className="flex-1">
              <Text className=" text-black text-[11px] uppercase mb-2 ml-1">
                From Page
              </Text>
              <CustomDropdown page={fromPage} setPage={setFromPage} />
            </View>

        
            <View className="flex-1">
              <Text className="text-black  text-[11px] uppercase mb-2 ml-1">
                To Page
              </Text>
              <CustomDropdown page={toPage} setPage={setToPage} />
            </View>
          </View>

          <View className="mt-8 pt-6 border-t border-slate-50 flex-row justify-between items-center">
            <Text className=" text-sm">Total Pages:</Text>
            <View className="bg-slate-900 px-3 py-1 rounded-full">
              <Text className="text-white  text-xs">
                {toPage - fromPage + 1} Pages
              </Text>
            </View>
          </View>
        </View>
      </ScreenContent>

      <ScreenFooter>
        <Button onPress={startTest} className="bg-primary h-14 rounded-2xl ">
          <Text className="text-white text-xl  mr-2">Start Exam</Text>
        </Button>
      </ScreenFooter>
    </Screen>
  );
}
