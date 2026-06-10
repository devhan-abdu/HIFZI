import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { NotificationBootstrap } from "@/src/components/common/NotificationBootstrap";
import { useSession } from "@/src/hooks/useSession";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter, usePathname } from "expo-router";
import { Pressable, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Screens with a dark/primary background at the top need light status bar icons
const PRIMARY_BG_SCREENS = ["/hifz/log", "/muraja/log", "/hifz/create-hifz-plan", "/muraja/create-muraja-plan"];

const ACTIVE_COLOR = "#276359";
const INACTIVE_COLOR = "#94a3b8";

export default function AppLayout() {
  const { session, loading } = useSession();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const hideTabs =
    pathname.includes("/quran/reader") ||
    pathname.includes("/onboarding") ||
    pathname.includes("/evaluation") ||
    pathname.includes("/plan-completion") ||
    pathname.includes("/journey");
  const hideAiButton = pathname.includes("/ai-chat") || hideTabs;

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!session) {
    return <Redirect href="./(auth)" />;
  }

  // Smart status bar: use light icons on dark-header screens
  const needsLightStatusBar = PRIMARY_BG_SCREENS.some((p) => pathname.includes(p));

  return (
    <View className="flex-1">
      <StatusBar style={needsLightStatusBar ? "light" : "dark"} backgroundColor="transparent" translucent />
      <NotificationBootstrap />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: hideTabs
            ? { display: "none" }
            : {
                backgroundColor: "rgba(255, 255, 255, 0.96)",
                borderRadius: 36,
                marginHorizontal: 16,
                height: 68,
                paddingBottom: 8,
                paddingTop: 8,
                position: "absolute",
                borderTopWidth: 0,
                // Telegram-style overlay: high elevation + strong shadow
                elevation: 32,
                zIndex: 100,
                shadowColor: "#1a3a36",
                shadowOpacity: 0.18,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: -2 },
                bottom: Math.max(insets.bottom, 8) + 8,
              },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: "Rosemary",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="muraja"
          options={{
            title: "Muraja",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "sync" : "sync-outline"}
                size={26}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="hifz"
          options={{
            title: "Hifz",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "ribbon" : "ribbon-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="test"
          options={{
            title: "Exam",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "help-circle" : "help-circle-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="onboarding"
          options={{
            href: null,
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="evaluation"
          options={{
            href: null,
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="plan-completion"
          options={{
            href: null,
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="quran"
          options={{
            title: "Quran",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "book" : "book-outline"}
                size={22}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="ai-chat"
          options={{
            href: null,
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
            headerShown: false,
          }}
        />

        <Tabs.Screen
          name="journey"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>

      {!hideAiButton && (
        <Pressable
          onPress={() => router.push("/(app)/ai-chat" as never)}
          className="absolute right-5 bg-primary rounded-full w-14 h-14 items-center justify-center"
          style={{
            bottom: 68 + Math.max(insets.bottom, 8) + 80,
            zIndex: 200, // Always above tab bar
            shadowColor: "#276359",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 14,
            elevation: 40,
          }}
        >
          <Ionicons name="chatbubbles" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}
