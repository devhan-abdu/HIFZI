import { useSession } from "@/src/hooks/useSession";
import {
  DefaultTheme,
  ThemeProvider,
  DarkTheme,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLoadingScreen } from "../common/AppLoadingScreen";
import { View } from "react-native";
import { Text } from "@/src/components/common/ui/Text";

const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#ffffff",
    card: "#ffffff",
    border: "#e5e7eb",
    text: "#0f172a",
    primary: "#64748b", // Muted color for back buttons
  },
};

const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0f1512",
    card: "#1a211d",
    border: "#2a312d",
    text: "#f8fafc",
    primary: "#94a3b8", // Muted color for back buttons
  },
};

export function RootLayoutNav() {
  const { session, loading, configError } = useSession();
  const { colorScheme } = useColorScheme();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (configError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-xl text-primary font-bold">
          App configuration is incomplete
        </Text>
        <Text className="mt-3 text-center text-base text-muted">
          {configError}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={
          colorScheme === "dark" ? DarkNavigationTheme : LightNavigationTheme
        }
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
