import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT } from "https://deno.land/x/jose@v4.14.4/index.ts";

serve(async (req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_JWT_SECRET = Deno.env.get("JWT_SECRET")!;
  const QF_CLIENT_ID = Deno.env.get("QF_CLIENT_ID")!;
  const QF_CLIENT_SECRET = Deno.env.get("QF_CLIENT_SECRET")!;
  const authBaseUrl = "https://prelive-oauth2.quran.foundation";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { code, codeVerifier, redirectUri } = await req.json();

    // 1. Exchange Code for Tokens
    const credentials = btoa(`${QF_CLIENT_ID}:${QF_CLIENT_SECRET}`);
    const tokenRes = await fetch(`${authBaseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`QF Token Error: ${tokenData.error_description}`);

    // 2. Fetch QF User Info
    const userRes = await fetch(`${authBaseUrl}/userinfo`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const qfUser = await userRes.json();
    if (!userRes.ok) throw new Error("Could not fetch user data from QF");

    const qfUserId = qfUser.sub;
    const email = qfUser.email;

    // 3. Find or Create Supabase User
    let { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("qf_user_id", qfUserId)
      .maybeSingle();

    let userId: string;

    if (profile) {
      userId = profile.id;
    } else {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { qf_user_id: qfUserId }
      });

      if (authError) {
         if (authError.message.includes("already registered")) {
            const { data: existing } = await supabase.auth.admin.listUsers();
            userId = existing.users.find(u => u.email === email)!.id;
         } else {
            throw authError;
         }
      } else {
        userId = authUser.user.id;
      }

     const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        qf_user_id: qfUserId,
        email: email,
        name: `${qfUser.first_name || ""} ${qfUser.last_name || ""}`.trim() || "User",
      });
      if (profileError) throw profileError;
    }
      
    // 4. SAVE TO qf_tokens (THE FIX)
    const expiryTimestamp = Date.now() + (tokenData.expires_in * 1000);
    const { error: tokenStoreError } = await supabase.from("qf_tokens").upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiryTimestamp,
    });

    if (tokenStoreError) {
      console.error("Database Error (qf_tokens):", tokenStoreError);
      throw new Error(`Failed to save tokens: ${tokenStoreError.message}`);
    }

    // 5. Generate Custom JWT for App
    const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
    const token = await new SignJWT({
      aud: "authenticated",
      role: "authenticated",
      sub: userId,
      email: email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d") 
      .sign(secret);

    return new Response(
      JSON.stringify({
        access_token: token,
        refresh_token: crypto.randomUUID(), 
        user: { id: userId, email: email, qf_id: qfUserId }
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    console.error("Function Crash:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 400 }
    );
  }
});
