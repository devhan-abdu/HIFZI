import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: decisions, error } = await supabase
    .from("plan_decisions")
    .select("*")
    .eq("plan_type", "muraja")
    .eq("executed", false)

  if (error) {
    return new Response(JSON.stringify(error), { status: 500 })
  }

  for (const d of decisions ?? []) {
    switch (d.decision) {

      case "enter_recovery":
        await supabase
          .from("weekly_muraja_plan")
          .update({
            mode: "recovery",
            note: "Recovery week due to muraja performance",
            updated_at: new Date().toISOString(),
          })
          .eq("id", d.plan_id)
        break

      case "adjust_muraja_only":
        await supabase
          .from("weekly_muraja_plan")
          .update({
            mode: "reinforcement",
            note: "Reinforcement week due to muraja performance",
            updated_at: new Date().toISOString(),
          })
          .eq("id", d.plan_id)
        break
    }

    await supabase
      .from("plan_decisions")
      .update({ executed: true })
      .eq("id", d.id)
  }

  return new Response(
    JSON.stringify({ status: "muraja decisions executed" }),
    { headers: { "Content-Type": "application/json" } }
  )
})