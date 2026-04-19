

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )


    const { data, error } = await supabase
        .from('daily_muraja_logs')
        .update({ status: "missed" })
        .eq('status', 'pending')
        .lt('date', new Date().toISOString().slice(0, 10))
        .select()
    
    if (error) return new Response(JSON.stringify(error), { status: 500 })
    
    return new Response(`Updated ${data.length} habits to missed`, {status: 200})
    
})


