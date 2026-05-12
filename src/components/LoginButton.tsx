import * as React from "react";
import { View, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useAuthRequest } from "expo-auth-session";
import { Text, Button } from "./common/ui/Text";
import { supabase } from "../lib/supabase";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_QF_CLIENT_ID!;
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL!;

const REDIRECT_URI = Linking.createURL("login");

const authBaseUrl = "https://prelive-oauth2.quran.foundation";

const discovery = {
  authorizationEndpoint: `${authBaseUrl}/oauth2/auth`,
  tokenEndpoint: `${authBaseUrl}/oauth2/token`,
};

export default function LoginButton() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: [
        "openid",
        "offline_access",
        "user",
        "bookmark",
        "collection",
        "content",
      ],
      redirectUri: REDIRECT_URI,
      usePKCE: true,
    },
    discovery,
  );

  React.useEffect(() => {
    const run = async () => {
      if (!response) return;

      if (response.type === "success") {
        setIsLoading(true);
        try {
          const res = await fetch(`${BACKEND}/qf-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: response.params.code,
              codeVerifier: request?.codeVerifier,
              redirectUri: REDIRECT_URI,
            }),
          });

          const data = await res.json();
          if (res.ok && data.access_token) {
            await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });
            // Session set, effect in parent will redirect
          } else {
             setIsLoading(false);
          }
        } catch (err) {
          console.error("Login exchange failed", err);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    run();
  }, [response]);

  const handleLogin = async () => {
    setIsLoading(true);
    const result = await promptAsync();
    if (result?.type !== "success") {
      setIsLoading(false);
    }
  };

  return (
    <View className="w-full">
      <Button
        disabled={!request || isLoading}
        onPress={handleLogin}
        className="bg-white p-5 rounded-2xl my-8 flex-row items-center justify-center shadow-lg active:opacity-90"
      >
        {isLoading ? (
          <ActivityIndicator color="#0E1B1B" />
        ) : (
          <View className="flex-row items-center">
            <Text className="text-[#0E1B1B] text-lg font-bold uppercase tracking-widest">
              Continue with Quran.com
            </Text>
          </View>
        )}
      </Button>
      <Text className="text-white/40 text-center text-xs -mt-4">
        Secure authentication via Quran Foundation
      </Text>
    </View>
  );
}
