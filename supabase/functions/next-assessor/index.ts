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

  const apiKey = req.headers.get('x-api-key');
  const expectedKey = Deno.env.get('WEBHOOK_API_KEY');
  if (!apiKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Invalid API key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Lista ordenada de assessores ativos no rodízio
    const { data: lista, error: listaErr } = await supabase
      .from('rodizio_config')
      .select('user_id, ordem, id')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('id', { ascending: true });

    if (listaErr) throw listaErr;

    if (!lista || lista.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum assessor ativo no rodízio' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Estado atual do rodízio (linha id=1)
    const { data: state } = await supabase
      .from('rodizio_state')
      .select('ultimo_user_id')
      .eq('id', 1)
      .maybeSingle();

    const lastUser = state?.ultimo_user_id ?? null;
    let nextUserId: string;

    if (!lastUser) {
      nextUserId = lista[0].user_id;
    } else {
      const idx = lista.findIndex((r: any) => r.user_id === lastUser);
      if (idx === -1 || idx >= lista.length - 1) {
        nextUserId = lista[0].user_id;
      } else {
        nextUserId = lista[idx + 1].user_id;
      }
    }

    const { data: callixData } = await supabase
      .from('user_callix_mapping')
      .select('callix_assessor_id, callix_name, cal_event_type_id, callix_list_id')
      .eq('user_id', nextUserId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: nextUserId,
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
