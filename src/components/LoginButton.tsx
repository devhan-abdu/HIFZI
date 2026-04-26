import * as React from "react";
import { View } from "react-native";
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
      if (response?.type !== "success") return;

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
        }
      } catch (err) {
        console.error("Login exchange failed", err);
      }
    };

    run();
  }, [response]);

  return (
    <View>
      <Button
        disabled={!request}
        onPress={() => promptAsync()}
        className="bg-white p-4 rounded-xl my-8"
      >
        <Text className="text-primary  text-xl uppercase tracking-widest">
          Get Started
        </Text>
      </Button>
    </View>
  );
}
