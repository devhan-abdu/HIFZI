import { AppLoadingScreen } from "@/src/components/common/AppLoadingScreen";
import { NotificationBootstrap } from "@/src/components/common/NotificationBootstrap";
import { useSession } from "@/src/hooks/useSession";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_COLOR = "#276359";
const INACTIVE_COLOR = "#94a3b8";

export default function AppLayout() {
  const { session, loading } = useSession();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const bottomPadding = Math.max(insets.bottom, 10);

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (!session) {
    return <Redirect href="./(auth)" />;
  }

  return (
    <View className="flex-1">
      <NotificationBootstrap />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#f1f5f9",

            height: 70 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 10,

            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: "Rosemary",
            color: "#000",
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
          name="weekly-summary"
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
      </Tabs>

      <Pressable
        onPress={() => router.push("/(app)/ai-chat" as never)}
        className="absolute right-5 bg-primary rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{
          bottom: 88 + bottomPadding,
        }}
      >
        <Ionicons name="chatbubbles" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}