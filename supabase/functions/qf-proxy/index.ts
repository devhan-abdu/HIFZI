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
    const { endpoint: rawEndpoint, method = "GET", body, params } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const QF_CLIENT_ID = Deno.env.get("QF_CLIENT_ID")!;

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

    const { data: identities, error: identityError } = await supabase.auth.admin.getUserIdentities(user.id);
    const qfIdentity = identities?.find(id => id.provider.includes("quran-foundation"));

    let accessToken = qfIdentity?.config?.access_token;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "NOT_FOUND", details: "No active QF identity token found" }),
        { status: 404 }
      );
    }

    const BASE_URLS: Record<string, string> = {
      prelive: "https://apis-prelive.quran.foundation",
      production: "https://apis.quran.foundation",
    };

    const envMatch = rawEndpoint.match(/^\/(prelive|production)(\/.*)/);
    if (!envMatch) {
      return new Response(JSON.stringify({ error: "INVALID_ENDPOINT_PREFIX" }), { status: 400 });
    }

    const [, env, apiPath] = envMatch;
    const url = new URL(`${BASE_URLS[env]}${apiPath}`);

    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));
    }

    let qfRes = await fetch(url.toString(), {
      method,
      headers: buildQFHeaders(accessToken, QF_CLIENT_ID),
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });

    const resultText = await qfRes.text();
    return new Response(resultText, {
      status: qfRes.status,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR", msg: err.message }), { status: 500 });
  }
});