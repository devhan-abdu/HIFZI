import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("weekly_muraja_plan")
    .update({ status: "completed" })
    .eq("status", "active")
    .lt("week_end_date", today)
    .select();

  if (error) {
    console.error(error);
    return new Response(JSON.stringify(error), { status: 500 });
  }

  return new Response(
    JSON.stringify({ message: `Successfully completed ${data?.length ?? 0} plans.` }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
