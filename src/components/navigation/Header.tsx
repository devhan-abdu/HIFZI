import { useSession } from "@/src/hooks/useSession";
import { useNotifications } from "@/src/hooks/useNotifications";
import { supabase } from "@/src/lib/supabase";
import { useState } from "react";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert } from "../common/Alert";
import { Text } from "@/src/components/common/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export const Header = ({ title, userStats }: { title: string; userStats?: { level: number; totalXp: number } | null }) => {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const [signOut, setSignOut] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const username = user?.user_metadata?.user_name || user?.email;

  const xpProgress = userStats ? (userStats.totalXp % 1000) / 10 : 0;

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setErrorMessage(error.message);
        setErrorVisible(true);
      }
    } catch (e) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setErrorVisible(true);
    }
  };

  return (
    <View
      style={{ paddingTop: insets.top + 8 }}
      className="bg-white px-6 pb-2"
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <View className="flex-row items-center gap-x-3">
            <Text className="text-primary text-[12px] font-bold uppercase tracking-[2.5px]">
              HIFZI
            </Text>
            {userStats && (
              <View className="flex-row items-center bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
                <Ionicons name="sparkles" size={10} color="#276359" />
                <Text className="text-primary text-[9px]  ml-1">L{userStats.level}</Text>
                <View className="w-8 h-[2px] bg-primary/20 rounded-full ml-2 overflow-hidden">
                  <View 
                    className="h-full bg-primary" 
                    style={{ width: `${xpProgress}%` }} 
                  />
                </View>
              </View>
            )}
          </View>
          {/* {title !== "Home" && (
            <Text className="text-2xl  text-slate-900 tracking-tight mt-1">
              {title}
            </Text>
          )} */}
        </View>

        <View className="flex-row items-center gap-x-3">
          <Pressable
            onPress={() => router.push("/(app)/notifications" as never)}
            className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center"
          >
            <Ionicons name="notifications-outline" size={20} color="#0f172a" />
            {unreadCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-white text-[10px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => setSignOut(true)}>
            <UserAvatar name={username} />
          </Pressable>
        </View>
      </View>

      <Alert
        visible={signOut}
        type="warning"
        title="Sign Out"
        message="Are you sure you want log out? You will need to log in again to sync your progress."
        confirmText="Sign Out"
        cancelText="Stay"
        onConfirm={async () => {
          setSignOut(false);
          handleSignOut();
        }}
        onCancel={() => setSignOut(false)}
      />
      <Alert
        visible={errorVisible}
        type="delete"
        title="Sign Out Failed"
        message={errorMessage}
        confirmText="Try Again"
        onConfirm={() => {
          setErrorVisible(false);
          handleSignOut();
        }}
        onCancel={() => setErrorVisible(false)}
      />
    </View>
  );
};

export const UserAvatar = ({
  name,
  size = 40,
}: {
  name?: string;
  size?: number;
}) => {
  const initials =
    name ?
      name
        .split("")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";
  return (
    <View
      style={{ width: size, height: size }}
      className="bg-primary/10 rounded-full items-center justify-center border-2 border-primary/20 shadow-sm"
    >
      <Text style={{ fontSize: size * 0.4 }} className="text-primary ">
        {initials}
      </Text>

      <View className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
    </View>
  );
};
