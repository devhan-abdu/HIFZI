import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OAUTH_URL = "https://prelive-oauth2.quran.foundation/oauth2/token";

async function refreshQFToken(
  supabaseUrl: string,
  serviceRole: string,
  userId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const refreshRes = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  const refreshed = await refreshRes.json();

  if (!refreshRes.ok) {
    throw new Error(
      JSON.stringify({ error: "SESSION_EXPIRED", details: refreshed }),
    );
  }
  if (!refreshed.access_token || !refreshed.expires_in) {
    throw new Error(
      JSON.stringify({ error: "SESSION_REFRESH_FAILED", details: refreshed }),
    );
  }

  await fetch(`${supabaseUrl}/rest/v1/qf_tokens?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || refreshToken,
      expires_at: Date.now() + refreshed.expires_in * 1000,
    }),
  });

  return refreshed.access_token as string;
}

/** Build QF request headers */
function buildQFHeaders(accessToken: string, clientId: string): HeadersInit {
  return {
    "x-auth-token": accessToken,
    "x-client-id": clientId,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

serve(async (req) => {
  // Handle CORS preflight
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
    const {
      endpoint: rawEndpoint,
      method = "GET",
      body,
      params,
    } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const QF_CLIENT_ID = Deno.env.get("QURAN_CLIENT_ID")!;
    const QF_CLIENT_SECRET = Deno.env.get("QURAN_CLIENT_SECRET")!;

    // Logging Client Info as requested
    console.log("QF_CLIENT_ID:", QF_CLIENT_ID);
    console.log("QF_CLIENT_SECRET:", QF_CLIENT_SECRET);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace("Bearer ", "");

    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: "No token provided" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: authError?.message || "Invalid token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const tokenRes = await fetch(
      `${SUPABASE_URL}/rest/v1/qf_tokens?user_id=eq.${user.id}`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    const tokens = await tokenRes.json();
    const tokenRow = tokens[0];
    if (!tokenRow) {
      return new Response(
        JSON.stringify({ error: "NOT_FOUND", details: "No QF token found for user" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    let accessToken: string = tokenRow.access_token;
    
    // Logging Access Token as requested
    console.log("accessToken:", accessToken);

    const expiresAtValue = Number(tokenRow.expires_at);
    const isExpiredByTimestamp =
      !Number.isFinite(expiresAtValue) ||
      expiresAtValue < Date.now() + 30_000;

    if (isExpiredByTimestamp) {
      try {
        accessToken = await refreshQFToken(
          SUPABASE_URL, SERVICE_ROLE, user.id,
          tokenRow.refresh_token, QF_CLIENT_ID, QF_CLIENT_SECRET,
        );
        console.log("refreshedAccessToken:", accessToken);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "SESSION_EXPIRED", details: String(e) }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const rawPath = rawEndpoint as string;

    const BASE_URLS: Record<string, string> = {
      prelive: "https://apis-prelive.quran.foundation",
      production: "https://apis.quran.foundation",
    };

    const envMatch = rawPath.match(/^\/(prelive|production)(\/.*)/);
    if (!envMatch) {
      return new Response(
        JSON.stringify({
          error: "INVALID_ENDPOINT_PREFIX",
          message: "Endpoint must start with /prelive/ or /production/",
          endpoint: rawPath,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const [, env, apiPath] = envMatch;
    const url = new URL(`${BASE_URLS[env]}${apiPath}`);

    const isContentApi = apiPath.includes("/content/api/v4/");
    const callerPassedPerPage = params && "per_page" in params;
    if (isContentApi && !callerPassedPerPage) {
      url.searchParams.set("per_page", "50");
    }

    if (params) {
      Object.entries(params).forEach(([k, v]) =>
        url.searchParams.append(k, String(v))
      );
    }

    let qfRes = await fetch(url.toString(), {
      method,
      headers: buildQFHeaders(accessToken, QF_CLIENT_ID),
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });

    if (qfRes.status === 401 || qfRes.status === 403) {
      const errText = await qfRes.text();
      let isInvalidToken = false;
      try {
        const errJson = JSON.parse(errText);
        isInvalidToken =
          errJson?.type === "invalid_token" ||
          errJson?.message?.includes("expired") ||
          errJson?.message?.includes("inactive");
      } catch {
        isInvalidToken =
          errText.includes("expired") || errText.includes("inactive");
      }

      if (isInvalidToken) {
        try {
          accessToken = await refreshQFToken(
            SUPABASE_URL, SERVICE_ROLE, user.id,
            tokenRow.refresh_token, QF_CLIENT_ID, QF_CLIENT_SECRET,
          );
          console.log("retriedAccessToken:", accessToken);
          qfRes = await fetch(url.toString(), {
            method,
            headers: buildQFHeaders(accessToken, QF_CLIENT_ID),
            body: method !== "GET" && body ? JSON.stringify(body) : undefined,
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "SESSION_EXPIRED", detail: String(e) }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
      } else {
        return new Response(errText, {
          headers: { "Content-Type": "application/json" },
          status: qfRes.status,
        });
      }
    }

    const resultText = await qfRes.text();

    return new Response(resultText, {
      headers: { "Content-Type": "application/json" },
      status: qfRes.status,
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", msg: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});