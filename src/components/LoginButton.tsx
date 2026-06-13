import * as React from "react";
import { View, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Text, Button } from "./common/ui/Text";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginButton() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async () => {
    setIsLoading(true);

    const redirectTo = makeRedirectUri({
      scheme: "hifzi",
      path: "login",
    });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "custom:quran-foundation",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (e) {
      console.error("login failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="w-full">
      <Button
        disabled={isLoading}
        onPress={handleLogin}
        className="bg-white p-5 rounded-2xl my-8 flex-row items-center justify-center shadow-lg active:opacity-90"
      >
        {isLoading ?
          <ActivityIndicator color="#0E1B1B" />
        : <View className="flex-row items-center">
            <Text className="text-primary text-lg uppercase tracking-widest">
              Continue with Quran.com
            </Text>
          </View>
        }
      </Button>
      <Text className="text-white/40 text-center text-xs -mt-4">
        Secure authentication via Quran Foundation
      </Text>
    </View>
  );
}
