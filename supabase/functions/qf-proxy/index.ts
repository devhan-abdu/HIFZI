import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function buildQFHeaders(accessToken: string, clientId: string): HeadersInit {
  return {
    "x-auth-token": accessToken,
    "x-client-id": clientId,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  try {
    const reqText = await req.text();
    const { endpoint: rawEndpoint, method = "GET", body, params } = reqText ? JSON.parse(reqText) : {};

    if (!rawEndpoint) {
      return new Response(JSON.stringify({ error: "MISSING_ENDPOINT" }), { status: 400 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const QF_CLIENT_ID = Deno.env.get("QF_CLIENT_ID")!;
    const QF_CLIENT_SECRET = Deno.env.get("QF_CLIENT_SECRET")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace("Bearer ", "");

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401 });
    }

    const { data: vault, error: vaultError } = await supabase
      .from("user_qf_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (vaultError || !vault) {
      return new Response(JSON.stringify({ error: "QF_TOKENS_NOT_SETUP" }), { status: 404 });
    }

    let currentAccessToken = vault.access_token;
    const expiresAt = new Date(vault.expires_at).getTime();
    const bufferTime = 5 * 60 * 1000;

    if (Date.now() + bufferTime > expiresAt) {
      console.log(`Refreshing QF token for user ${user.id}...`);
      const credentials = btoa(`${QF_CLIENT_ID}:${QF_CLIENT_SECRET}`);

      const refreshRes = await fetch("https://oauth2.quran.foundation/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: vault.refresh_token,
        }).toString(),
      });

      if (!refreshRes.ok) {
        const errorDetails = await refreshRes.text();
        console.error("QF Refresh failed raw error payload:", errorDetails);
        return new Response(JSON.stringify({ error: "PROVIDER_REFRESH_FAILED", details: errorDetails }), { status: 401 });
      }

      const newTokens = await refreshRes.json();

      currentAccessToken = newTokens.access_token;
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();

      const dbUpdate = await supabase
        .from("user_qf_tokens")
        .update({
          access_token: currentAccessToken,
          refresh_token: newTokens.refresh_token || vault.refresh_token,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (dbUpdate.error) {
        console.error("Supabase token database update failed:", dbUpdate.error);
      }
    }

    const cleanPath = rawEndpoint.replace(/^\/(prelive|production)/, "");
    const url = new URL(`https://apis.quran.foundation${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));
    }

    let qfRes = await fetch(url.toString(), {
      method,
      headers: buildQFHeaders(currentAccessToken, QF_CLIENT_ID),
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });

    const resultText = await qfRes.text();
    return new Response(resultText, {
      status: qfRes.status,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Caught critical exception inside function:", err.message);
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR", msg: err.message }), { status: 500 });
  }
});