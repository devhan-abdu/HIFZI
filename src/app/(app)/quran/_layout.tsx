import { Header } from "@/src/components/navigation/Header";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function QuranLayout() {
  return (
    <View className="flex-1 bg-surface">
      <Stack
        screenOptions={{
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Quran",
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="reader"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />

        <Stack.Screen
          name="offline"
          options={{
            title: "offline reading",
            headerBackTitle: "Quran",
          }}
        />
      </Stack>
    </View>
  );
}
