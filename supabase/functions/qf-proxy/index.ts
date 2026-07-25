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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const reqText = await req.text();
    const { endpoint: rawEndpoint, method = "GET", body, params } = reqText ? JSON.parse(reqText) : {};

    if (!rawEndpoint) {
      return new Response(JSON.stringify({ error: "MISSING_ENDPOINT" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const QF_CLIENT_ID = Deno.env.get("QF_CLIENT_ID")!;
    const QF_CLIENT_SECRET = Deno.env.get("QF_CLIENT_SECRET")!;
    const QF_REDIRECT_URI = Deno.env.get("QF_REDIRECT_URI")!;
    const QF_TOKEN_URL = "https://oauth2.quran.foundation/oauth2/token";
    const QF_API_BASE = "https://apis.quran.foundation";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace("Bearer ", "");

    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid Token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const { data: vault, error: vaultError } = await supabase
      .from("user_qf_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (vaultError || !vault) {
      return new Response(JSON.stringify({ error: "QF_TOKENS_NOT_SETUP" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    let currentAccessToken = vault.access_token;
    const isExpired = !vault.expires_at || new Date(vault.expires_at).getTime() < Date.now() + 60_000;

    if (isExpired) {
      const { data: claimed, error: claimError } = await supabase.rpc("claim_qf_refresh", {
        p_user_id: user.id,
      });

      if (claimError) {
        console.error(`claim_qf_refresh RPC failed for user ${user.id}`);
        return new Response(JSON.stringify({ error: "CLAIM_RPC_FAILED" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      if (!claimed) {
        const { data: latest, error: latestError } = await supabase
          .from("user_qf_tokens")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (latestError || !latest) {
          return new Response(JSON.stringify({ error: "QF_TOKENS_NOT_SETUP" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }
        currentAccessToken = latest.access_token;
      } else {
        const basicAuth = btoa(`${QF_CLIENT_ID}:${QF_CLIENT_SECRET}`);
        const tokenPayload = new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: claimed.refresh_token,
          redirect_uri: QF_REDIRECT_URI,
        });

        const refreshRes = await fetch(QF_TOKEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Authorization": `Basic ${basicAuth}`,
          },
          body: tokenPayload.toString(),
        });

        if (!refreshRes.ok) {
          let errorCode = "unknown_error";
          try {
            const errJson = JSON.parse(await refreshRes.text());
            errorCode = errJson.error ?? errorCode;
          } catch {
            // response wasn't JSON, keep default errorCode
          }

          console.error(`QF refresh failed for user ${user.id}, status: ${refreshRes.status}, error: ${errorCode}`);

          await supabase.from("user_qf_tokens").update({ refreshing_since: null }).eq("user_id", user.id);

          return new Response(JSON.stringify({ error: "PROVIDER_REFRESH_FAILED", code: errorCode }), {
            status: refreshRes.status,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        const tokenData = await refreshRes.json();
        currentAccessToken = tokenData.access_token;
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

        const { error: updateError } = await supabase
          .from("user_qf_tokens")
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || claimed.refresh_token,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
            refreshing_since: null,
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error(`DB update failed for user ${user.id}`);
          return new Response(JSON.stringify({ error: "DB_UPDATE_FAILED" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }
      }
    }

    const cleanEndpoint = rawEndpoint.startsWith("/") ? rawEndpoint : `/${rawEndpoint}`;
    const targetUrl = new URL(`${QF_API_BASE}${cleanEndpoint}`);

    if (params) {
      Object.keys(params).forEach((key) => targetUrl.searchParams.append(key, params[key]));
    }

    const qfResponse = await fetch(targetUrl.toString(), {
      method,
      headers: buildQFHeaders(currentAccessToken, QF_CLIENT_ID),
      body: method !== "GET" && method !== "HEAD" && body ? JSON.stringify(body) : undefined,
    });

    const responseData = await qfResponse.text();
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseData);
    } catch {
      jsonResponse = { raw: responseData };
    }

    return new Response(JSON.stringify(jsonResponse), {
      status: qfResponse.status,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (err) {
    console.error("Function server error");
    return new Response(JSON.stringify({ error: "SERVER_ERROR" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});