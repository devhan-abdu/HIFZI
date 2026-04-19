import { View, Pressable } from "react-native";
import { Text } from "@/src/components/common/ui/Text";
import { router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/components/ui/Button";
import Screen from "@/src/components/screen/Screen";
import { ScreenFooter } from "@/src/components/screen/ScreenContent";
import { cn } from "@/src/lib/utils"; 

export default function OnboardingBridge() {
  const [selected, setSelected] = useState<"hifz" | "muraja" | null>(null);

  const OptionCard = ({
    type,
    title,
    description,
    icon,
  }: {
    type: "hifz" | "muraja";
    title: string;
    description: string;
    icon: any;
  }) => {
    const isActive = selected === type;

    return (
      <Pressable
        onPress={() => setSelected(type)}
        style={({ pressed }) => [
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        className={cn(
          "p-5 rounded-2xl flex-row items-center border-2 transition-all duration-200 ",
          isActive ?
            "border-primary bg-primary/5 "
          : "border-slate-100 bg-white",
        )}
      >
        <View className="flex-1 pr-4 ">
          <Text
            className={cn(
              "text-xl mb-1",
              isActive ? "text-primary" : "text-slate-900",
            )}
          >
            {title}
          </Text>
          <Text className="text-slate-400 text-sm leading-5">
            {description}
          </Text>
        </View>

        <View
          className={cn(
            "w-10 h-10 rounded-full items-center justify-center",
            isActive ? "bg-primary" : "bg-slate-50 border border-slate-100",
          )}
        >
          <Ionicons
            name={icon}
            size={22}
            color={isActive ? "white" : "#0f172a"}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <View className="flex-1 pt-20 pb-10 justify-between px-2">
        <View>
          <View className="flex-row items-center gap-x-2 mb-6">
            <View className="w-8 h-1 bg-primary rounded-full" />
            <View className="w-2 h-1 bg-slate-200 rounded-full" />
          </View>

          <Text className="text-primary text-5xl leading-[44px]">
            The Journey{"\n"}Starts Here
          </Text>

          <Text className="text-slate-500 text-lg mt-4 leading-7 max-w-[90%]">
            Choose your focus to personalize your experience. We’ll help you
            stay consistent.
          </Text>
        </View>

        <View className="gap-y-4">
          <OptionCard
            type="hifz"
            title="New Memorization"
            description="Start a plan to memorize new Surahs page by page."
            icon="add-outline"
          />
          <OptionCard
            type="muraja"
            title="Smart Revision"
            description="Keep your Hifz strong with a structured revision cycle."
            icon="repeat-outline"
          />
        </View>

        <ScreenFooter>
          <Button
            disabled={!selected}
            onPress={() => {
              if (selected === "hifz")
                router.push("/(app)/hifz/create-hifz-plan");
              else router.push("/(app)/muraja/create-muraja-plan");
            }}
            className={cn(
              "h-16 rounded-2xl items-center justify-center transition-all shadow-lg",
              selected ? "bg-primary " : "bg-slate-200",
            )}
          >
            <Text
              className={cn(
                "text-lg  uppercase tracking-widest",
                selected ? "text-white" : "text-slate-400",
              )}
            >
              Continue
            </Text>
          </Button>
        </ScreenFooter>
      </View>
    </Screen>
  );
}
