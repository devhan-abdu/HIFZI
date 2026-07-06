import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { NotificationBootstrap } from "@/src/components/common/NotificationBootstrap";
import { useSession } from "@/src/hooks/useSession";
import { Redirect, Tabs, usePathname } from "expo-router";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import {
  PRIMARY_BG_SCREENS,
  COLORS,
} from "../../components/navigation/constants";
import { useAIButtonGestures } from "../../hooks/useAIButtonGestures";
import { TabBarGradient } from "../../components/navigation/TabBarGradient";
import { AIButton } from "../../components/AIButton";
import {
  getTabsScreenOptions,
} from "../../components/navigation/TabConfiguration";
import { TAB_BAR_HEIGHT, TAB_ICON_SIZE } from "../../components/navigation/constants";
import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";

const resetStackOnBlur = ({ navigation, route }: any) => ({
  blur: () => {
    const state = navigation.getState();
    const tabRoute = state.routes.find((r: any) => r.key === route.key);
    if (tabRoute?.state && tabRoute.state.index > 0) {
      navigation.dispatch({
        ...CommonActions.reset({
          index: 0,
          routes: [{ name: tabRoute.state.routeNames[0] }],
        }),
        target: tabRoute.state.key,
      });
    }
  },
});

export default function AppLayout() {
  const { session, loading } = useSession();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = COLORS[isDark ? "dark" : "light"];

  const hideTabs =
    pathname.includes("/quran/reader") ||
    pathname.includes("/onboarding") ||
    pathname.includes("/evaluation") ||
    pathname.includes("/plan-completion") ||
    pathname.includes("/journey");
  const hideAiButton = pathname.includes("/ai-chat") || hideTabs;

  const { animatedButtonStyle, aiButtonGesture } =
    useAIButtonGestures(hideTabs);

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!session) {
    return <Redirect href="./(auth)" />;
  }

  const needsLightStatusBar = PRIMARY_BG_SCREENS.some((p) =>
    pathname.includes(p),
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar
        style={
          needsLightStatusBar ? "light"
          : isDark ?
            "light"
          : "dark"
        }
        backgroundColor="transparent"
        translucent
      />
      <NotificationBootstrap />

      <TabBarGradient visible={!hideTabs} colors={c} />

      <Tabs
        screenOptions={getTabsScreenOptions(
          hideTabs,
          c.active,
          c.inactive,
          c.tabBg,
          c.shadow,
          insets.bottom,
          TAB_BAR_HEIGHT
        )}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "grid" : "grid-outline"} size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="muraja"
          listeners={resetStackOnBlur}
          options={{
            title: "Muraja",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "sync" : "sync-outline"} size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="hifz"
          listeners={resetStackOnBlur}
          options={{
            title: "Hifz",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "ribbon" : "ribbon-outline"} size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="test"
          options={{
            title: "Exam",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "help-circle" : "help-circle-outline"} size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="onboarding" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="evaluation" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="plan-completion" options={{ href: null, headerShown: false }} />
        <Tabs.Screen
          name="quran"
          options={{
            title: "Quran",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "book" : "book-outline"} size={TAB_ICON_SIZE} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="ai-chat" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="journey" options={{ href: null, headerShown: false }} />
      </Tabs>

      <AIButton
        visible={!hideAiButton}
        gesture={aiButtonGesture}
        animatedStyle={animatedButtonStyle}
        shadowColor={c.active}
      />
    </View>
  );
}
