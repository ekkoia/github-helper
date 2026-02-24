import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate API key
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = Deno.env.get('WEBHOOK_API_KEY');

  if (!apiKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Invalid API key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const faixa = url.searchParams.get('faixa');

    if (!faixa || !['ate_10k', 'acima_10k'].includes(faixa)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parâmetro "faixa" obrigatório. Valores aceitos: ate_10k, acima_10k' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get last assigned order
    const { data: stateData } = await supabase
      .from('auto_assign_state')
      .select('last_assigned_order')
      .eq('faixa', faixa)
      .single();

    const lastOrder = stateData?.last_assigned_order ?? 0;

    // 2. Find next active user (ordem > lastOrder)
    let { data: nextConfig } = await supabase
      .from('auto_assign_config')
      .select('user_id, ordem')
      .eq('faixa', faixa)
      .eq('ativo', true)
      .gt('ordem', lastOrder)
      .order('ordem', { ascending: true })
      .limit(1)
      .maybeSingle();

    // 3. Wrap around if none found
    if (!nextConfig) {
      const { data: firstConfig } = await supabase
        .from('auto_assign_config')
        .select('user_id, ordem')
        .eq('faixa', faixa)
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .limit(1)
        .maybeSingle();
      nextConfig = firstConfig;
    }

    if (!nextConfig) {
      return new Response(
        JSON.stringify({ success: false, error: `Nenhum assessor ativo configurado para a faixa "${faixa}"` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Get Callix mapping
    const { data: callixData } = await supabase
      .from('user_callix_mapping')
      .select('callix_assessor_id, callix_name, cal_event_type_id, callix_list_id')
      .eq('user_id', nextConfig.user_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: nextConfig.user_id,
          faixa,
          callix_assessor_id: callixData?.callix_assessor_id || null,
          callix_name: callixData?.callix_name || null,
          cal_event_type_id: callixData?.cal_event_type_id || null,
          callix_list_id: callixData?.callix_list_id || null,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in next-assessor:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno', details: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
