import { Stack } from "expo-router";

export default function QuranLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Quran",
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
          title: "Offline reading",
          headerBackTitle: "Quran",
        }}
      />
    </Stack>
  );
}
