import * as React from "react";
import { View, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import { Text, Button } from "./common/ui/Text";
import { supabase } from "../lib/supabase";
import { authService } from "../features/user/services/authService";
import { useColorScheme } from "nativewind";

WebBrowser.maybeCompleteAuthSession();

export default function LoginButton() {
  const [isLoading, setIsLoading] = React.useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleLogin = async () => {
    setIsLoading(true);

    const redirectTo = Linking.createURL("login");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "custom:quran-foundation",
        options: {
          scopes: "openid offline_access user bookmark collection content",
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (!data?.url) {
        setIsLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (result.type === "success" && result.url) {
        const parsedUrl = new URL(result.url.replace("#", "?"));
        const access_token = parsedUrl.searchParams.get("access_token");
        const refresh_token = parsedUrl.searchParams.get("refresh_token");
        const provider_token = parsedUrl.searchParams.get("provider_token");
        const provider_refresh_token = parsedUrl.searchParams.get(
          "provider_refresh_token",
        );

        if (access_token && refresh_token) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

          if (sessionError) throw sessionError;

          if (sessionData?.session?.user?.id && provider_token) {
            await authService.saveProviderTokens(
              sessionData.session.user.id,
              provider_token,
              provider_refresh_token || undefined,
            );
          }
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="w-full">
      <Button
        disabled={isLoading}
        onPress={handleLogin}
        className={`p-4 rounded-2xl my-8 flex-row items-center justify-center shadow-lg active:opacity-90 border  bg-surface border-border `}
      >
        {isLoading ?
          <ActivityIndicator color="#276359" />
        : <View className="flex-row items-center justify-center w-full">
            <Text
              className={`text-text text-center text-lg ${isDark ? "text-text" : "text-primary"} `}
            >
              Continue with Quran.com
            </Text>
          </View>
        }
      </Button>
      <Text className="text-white text-center text-xs -mt-4">
        Secure authentication via Quran Foundation
      </Text>
    </View>
  );
}
