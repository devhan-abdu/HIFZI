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

export const Header = ({ title }: { title: string }) => {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { unreadCount } = useNotifications();
  const router = useRouter();

  const [signOut, setSignOut] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const username = user?.user_metadata?.user_name || user?.email;

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
      style={{ paddingTop: insets.top + 10 }}
      className="bg-white px-5 pb-4 border-b border-slate-100 shadow-md"
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-primary text-[16px]   tracking-[2px]">
            MINI
          </Text>
          <Text className="text-2xl  text-slate-900 tracking-tight">
            {title}
          </Text>
        </View>

        <View className="flex-row items-center gap-x-3">
          <Pressable
            onPress={() => router.push("/(app)/notifications" as never)}
            className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center"
          >
            <Ionicons name="notifications-outline" size={20} color="#0f172a" />
            {unreadCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-white text-[10px]">{unreadCount > 9 ? "9+" : unreadCount}</Text>
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
