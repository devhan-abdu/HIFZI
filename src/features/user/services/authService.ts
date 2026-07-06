import { supabase } from "@/src/lib/supabase";

export const authService = {

  async saveProviderTokens(
    userId: string,
    providerToken: string,
    refreshToken?: string
  ) {
    if (!providerToken) return;

    const { error } = await supabase
      .from("user_qf_tokens")
      .upsert(
        {
          user_id: userId,
          access_token: providerToken,
          refresh_token: refreshToken || "",
          expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Failed to save provider tokens:", error);
      throw error;
    }
  },
};
