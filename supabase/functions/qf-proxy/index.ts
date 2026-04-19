import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  try {
    const { endpoint: rawEndpoint, method = "GET", body, params } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const QF_CLIENT_ID = Deno.env.get("QF_CLIENT_ID")!;
    const QF_CLIENT_SECRET = Deno.env.get("QF_CLIENT_SECRET")!;

    const authHeader = req.headers.get("Authorization");

    // 1. Validate User
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader!, apikey: SERVICE_ROLE },
    });
    const user = await userRes.json();
    if (!user?.id) return new Response("Unauthorized", { status: 401 });

    // 2. Fetch QF Tokens
    const tokenRes = await fetch(`${SUPABASE_URL}/rest/v1/qf_tokens?user_id=eq.${user.id}`, {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
    });
    const tokens = await tokenRes.json();
    const tokenRow = tokens[0];
    if (!tokenRow) return new Response("No QF token found", { status: 404 });

    let accessToken = tokenRow.access_token;
    
   
const isExpired = Number(tokenRow.expires_at) < Date.now() + 30000;
    if (isExpired) {
      console.log("Token expired, refreshing...");
      const credentials = btoa(`${QF_CLIENT_ID}:${QF_CLIENT_SECRET}`);

      const refreshRes = await fetch("https://prelive-oauth2.quran.foundation/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRow.refresh_token,
        }).toString(),
      });

      const refreshed = await refreshRes.json();

      if (!refreshRes.ok) {
        console.error("QF Refresh Error:", refreshed);
        // If invalid_grant, the refresh token is dead. User must re-login.
        return new Response(JSON.stringify({ error: "SESSION_EXPIRED", details: refreshed }), { status: 401 });
      }

      accessToken = refreshed.access_token;
      
      await fetch(`${SUPABASE_URL}/rest/v1/qf_tokens?user_id=eq.${user.id}`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token || tokenRow.refresh_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        }),
      });
    }

let baseUrl = "https://apis-prelive.quran.foundation";
let endpoint = rawEndpoint;

if (endpoint.startsWith("/content")) {
  baseUrl += "/content/api/v4";
  endpoint = endpoint.replace("/content", "");
} else if (endpoint.startsWith("/auth")) {
  baseUrl += "";
} else {
  return new Response(JSON.stringify({ error: "INVALID_ENDPOINT" }), { status: 400 });
}

const url = new URL(`${baseUrl}${endpoint}`);

    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));

    const qfRes = await fetch(url.toString(), {
      method,
      headers: {
        "x-auth-token": accessToken,
        "x-client-id": QF_CLIENT_ID,
        "Content-Type": "application/json",
      },
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });

    const resultData = await qfRes.text();
    return new Response(resultData, { headers: { "Content-Type": "application/json" }, status: qfRes.status });

  } catch (err) {
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR", msg: String(err) }), { status: 500 });
  }
});
