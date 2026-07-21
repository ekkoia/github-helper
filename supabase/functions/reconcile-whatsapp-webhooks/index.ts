import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    const hoursParam = url.searchParams.get('hours');
    let sinceHours = 24;
    try { if (req.method === 'POST') { const b = await req.json(); if (b?.hours) sinceHours = Number(b.hours); } } catch (_) {}
    if (hoursParam) sinceHours = Number(hoursParam);

    const { data, error } = await supabase.rpc('reprocess_webhook_events', {
      _since: new Date(Date.now() - sinceHours * 3600 * 1000).toISOString(),
    });
    if (error) throw error;

    console.log('reconcile result:', data);
    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('reconcile error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
