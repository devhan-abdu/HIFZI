const supabase = createClient(
     Deno.env.get('SUPABASE_URL')!,
     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

export async function handler() {

     const { data: plans, error } = await supabase
    .from('weekly_muraja_plan')
    .select('id, user_id')
    .eq('is_active', true)

    if (error) throw error
    
      for (const plan of plans) {
    await supabase.rpc('compute_muraja_performance', {
      p_user_id: plan.user_id,
      p_weekly_plan_id: plan.id
    })
      }
    
      return new Response('Performance updated', { status: 200 })
}