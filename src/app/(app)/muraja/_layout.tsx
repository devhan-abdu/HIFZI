import { Header } from "@/src/components/navigation/Header";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function MurajaLayout() {
  return (
    <View className="flex-1 bg-white">
        <Header title="Muraja Al-Quran" />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "white" },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="create-muraja-plan"
          options={{
           animation: "slide_from_right",
            presentation: "modal",
          }}
        />
      </Stack>
    </View>
  );
}
