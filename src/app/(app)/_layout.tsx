import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { NotificationBootstrap } from "@/src/components/common/NotificationBootstrap";
import { useSession } from "@/src/hooks/useSession";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter, usePathname } from "expo-router";
import { Pressable, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  return (
    <View className="flex-1">
      <StatusBar style="dark" />
      <NotificationBootstrap />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: hideTabs
            ? { display: "none" }
            : {
                backgroundColor: "#ffffff",
                borderRadius: 32,
                marginHorizontal: 16,
                height: 64,
                paddingBottom: 8,
                paddingTop: 8,
                position: "absolute",
                borderTopWidth: 0,
                elevation: 12,
                shadowColor: "#276359",
                shadowOpacity: 0.12,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                bottom: Math.max(insets.bottom, 10) + 6,
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
            bottom: 64 + Math.max(insets.bottom, 10) + 96, // Elevated to sit perfectly above sticky screen footers
            shadowColor: "#276359",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 10, // Drop shadow for Android
          }}
        >
          <Ionicons name="chatbubbles" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}
