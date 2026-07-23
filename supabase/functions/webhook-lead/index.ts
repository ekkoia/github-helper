import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadWebhookData {
  nome_completo: string;
  telefone: string;
  email: string;
  perfil: string;
  intencao?: string;
  tipo_grao?: string;
  volume?: string;
  valor_produto?: number | string;    // Aceita número ou texto
  valor_investido?: number | string;  // Alias para valor_produto
  cidade?: string;
  uf?: string;
  localizacao_embarque?: string;
  distancia_km?: number;
  sentido?: string;
  estrada_terra_km?: number;
  armazenamento?: string;
  qualidade?: string;
  tem_royalties?: string;
  percentual_royalties?: number;
  etapa_funil?: string;
  origem?: string;
  observacoes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate API key
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = Deno.env.get('WEBHOOK_API_KEY');
  
  if (!apiKey || apiKey !== expectedKey) {
    console.error('Invalid or missing API key');
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid API key' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const leadData: LeadWebhookData = await req.json();
    console.log('Received lead data from webhook:', leadData);

    // Validate required fields (perfil is now optional)
    if (!leadData.nome_completo || !leadData.telefone || !leadData.email) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Campos obrigatórios faltando: nome_completo, telefone, email' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadData.email)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Formato de email inválido' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate perfil (optional, but if provided must be valid)
    const validPerfis = ['Produtor', 'Corretor', 'Armazém'];
    if (leadData.perfil && !validPerfis.includes(leadData.perfil)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Perfil inválido. Valores aceitos: ${validPerfis.join(', ')}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate intencao (if provided)
    const validIntencoes = ['Comprar', 'Vender'];
    if (leadData.intencao && !validIntencoes.includes(leadData.intencao)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Intenção inválida. Valores aceitos: ${validIntencoes.join(', ')}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch valid funnel stages from database
    const { data: etapasData, error: etapasError } = await supabase
      .from('funil_etapas')
      .select('nome')
      .eq('ativo', true);
    
    const validEtapas = etapasData?.map(e => e.nome) || [
      'Novo Lead',
      'Em atendimento IA',
      'Atendimento Humano',
      'Reunião Agendada',
      'Proposta Enviada',
      'Ganho',
      'Perdido',
      'Sem interesse',
      'Ghost',
      'Nutrir',
      'Parceiro'
    ];
    
    // Se etapa_funil foi enviada, valida se é um valor válido
    if (leadData.etapa_funil && !validEtapas.includes(leadData.etapa_funil)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Etapa do funil inválida. Valores aceitos: ${validEtapas.join(', ')}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normalize email and phone for deduplication
    const normalizedEmail = leadData.email.trim().toLowerCase();
    const normalizedPhone = leadData.telefone.trim().replace(/[^0-9]/g, '');

    // ---------- Shared parsers/normalizers (used by both merge and insert paths) ----------
    const parseNumericValue = (value: any): number | null => {
      if (value === null || value === undefined || value === '' || value === 'nao_informado' || value === 'N/A') return null;
      const parsed = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(parsed) ? null : parsed;
    };

    const parseValorInvestido = (value: any): number | null => {
      if (value === null || value === undefined || value === '' || value === 'nao_informado') return null;
      if (typeof value === 'number') return value;
      const valorStr = String(value).toLowerCase().trim();
      const faixas: Record<string, number> = {
        'até r$10 mil': 10000,
        'ate r$10 mil': 10000,
        'de r$10 mil a r$50 mil': 50000,
        'de r$50 mil a r$100 mil': 100000,
        'acima de r$100 mil': 150000,
      };
      for (const [faixa, valor] of Object.entries(faixas)) {
        if (valorStr.includes(faixa) || faixa.includes(valorStr)) return valor;
      }
      const numStr = valorStr.replace(/[^\d.,]/g, '').replace(',', '.');
      const parsed = parseFloat(numStr);
      return isNaN(parsed) ? null : parsed;
    };

    const parseVolumeToString = (value: any): string | null => {
      if (value === null || value === undefined || value === '' || value === 'nao_informado') return null;
      return String(value);
    };

    const normalizeText = (value: string) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const validArmazenamentos = ['Silo Bolsa', 'Silo Metálico', 'Colheitadeira', 'Outro'] as const;
    const armazenamentoLookup = new Map<string, (typeof validArmazenamentos)[number]>(
      validArmazenamentos.map((v) => [normalizeText(v), v])
    );
    const armazenamentoInput = typeof leadData.armazenamento === 'string' ? leadData.armazenamento.trim() : '';
    const armazenamento =
      !armazenamentoInput || armazenamentoInput === 'nao_informado'
        ? null
        : armazenamentoLookup.get(normalizeText(armazenamentoInput)) ?? null;

    if (armazenamentoInput && armazenamentoInput !== 'nao_informado' && !armazenamento) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Armazenamento inválido. Valores aceitos: ${validArmazenamentos.join(', ')}`,
          received: leadData.armazenamento,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validSentidos = ['Norte', 'Sul', 'Leste', 'Oeste', 'Nordeste', 'Noroeste', 'Sudeste', 'Sudoeste'] as const;
    const sentidoLookup = new Map<string, (typeof validSentidos)[number]>(
      validSentidos.map((v) => [normalizeText(v), v])
    );
    const sentidoInput = typeof leadData.sentido === 'string' ? leadData.sentido.trim() : '';
    const sentido = !sentidoInput || sentidoInput === 'nao_informado'
      ? null
      : sentidoLookup.get(normalizeText(sentidoInput)) ?? null;

    const valorProdutoRaw = leadData.valor_produto ?? leadData.valor_investido;
    const valorProduto = parseValorInvestido(valorProdutoRaw);
    console.log('Valor produto raw:', valorProdutoRaw, '-> parsed:', valorProduto);

    // DEDUPLICATION: Check if a lead with same email or phone already exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, responsavel_id, nome_completo, protocolo_atendimento, observacoes, etapa_funil, origens, valor_produto, perfil, intencao, tipo_grao, volume, cidade, uf, localizacao_embarque, distancia_km, sentido, estrada_terra_km, armazenamento, qualidade, tem_royalties, percentual_royalties')
      .or(`email.eq.${normalizedEmail},telefone.eq.${leadData.telefone.trim()}`)
      .order('data_criacao', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      console.log('Existing lead found, merging data:', existingLead.id);

      // Build observacoes: append incoming payload observacoes (if not already present) + merge note
      const isEmpty = (v: any) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
      const incomingObs = typeof leadData.observacoes === 'string' ? leadData.observacoes.trim() : '';
      let updatedObservacoes = existingLead.observacoes || '';
      if (incomingObs && !updatedObservacoes.includes(incomingObs)) {
        updatedObservacoes = updatedObservacoes
          ? `${updatedObservacoes}\n\n${incomingObs}`
          : incomingObs;
      }
      updatedObservacoes += `\n[${new Date().toISOString()}] Dados atualizados via webhook (origem: ${leadData.origem || 'webhook'})`;

      const currentOrigens: string[] = Array.isArray((existingLead as any).origens) ? (existingLead as any).origens : [];
      const newOrigem = leadData.origem || 'webhook';
      const updatedOrigens = currentOrigens.includes(newOrigem) ? currentOrigens : [...currentOrigens, newOrigem];

      const mergeData: Record<string, any> = {
        observacoes: updatedObservacoes,
        data_atualizacao: new Date().toISOString(),
        origens: updatedOrigens,
      };

      // Fill-only-if-empty for all payload fields
      if (isEmpty(existingLead.valor_produto) && valorProduto !== null) mergeData.valor_produto = valorProduto;
      if (isEmpty(existingLead.perfil) && leadData.perfil) mergeData.perfil = leadData.perfil;
      if (isEmpty(existingLead.intencao) && leadData.intencao) mergeData.intencao = leadData.intencao;
      if (isEmpty(existingLead.tipo_grao) && leadData.tipo_grao) mergeData.tipo_grao = leadData.tipo_grao;
      if (isEmpty(existingLead.volume) && parseVolumeToString(leadData.volume)) mergeData.volume = parseVolumeToString(leadData.volume);
      if (isEmpty(existingLead.cidade) && leadData.cidade) mergeData.cidade = leadData.cidade;
      if (isEmpty(existingLead.uf) && leadData.uf) mergeData.uf = leadData.uf;
      if (isEmpty(existingLead.localizacao_embarque) && leadData.localizacao_embarque) mergeData.localizacao_embarque = leadData.localizacao_embarque;
      if (isEmpty(existingLead.distancia_km) && parseNumericValue(leadData.distancia_km) !== null) mergeData.distancia_km = parseNumericValue(leadData.distancia_km);
      if (isEmpty(existingLead.sentido) && sentido) mergeData.sentido = sentido;
      if (isEmpty(existingLead.estrada_terra_km) && parseNumericValue(leadData.estrada_terra_km) !== null) mergeData.estrada_terra_km = parseNumericValue(leadData.estrada_terra_km);
      if (isEmpty(existingLead.armazenamento) && armazenamento) mergeData.armazenamento = armazenamento;
      if (isEmpty(existingLead.qualidade) && leadData.qualidade) mergeData.qualidade = leadData.qualidade;
      if (isEmpty(existingLead.tem_royalties) && leadData.tem_royalties) mergeData.tem_royalties = leadData.tem_royalties;
      if (isEmpty(existingLead.percentual_royalties) && parseNumericValue(leadData.percentual_royalties) !== null) mergeData.percentual_royalties = parseNumericValue(leadData.percentual_royalties);
      if (leadData.origem) mergeData.origem = leadData.origem;

      const { error: updateError } = await supabase
        .from('leads')
        .update(mergeData)
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating existing lead:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao atualizar lead existente', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch responsavel and callix data
      let responsavelNome: string | null = null;
      let callixData: { assessores_id: string; list_id: string; name_assessores: string } | null = null;

      if (existingLead.responsavel_id) {
        const [profileResult, callixResult] = await Promise.all([
          supabase.from('profiles').select('nome_completo').eq('user_id', existingLead.responsavel_id).maybeSingle(),
          supabase.from('user_callix_mapping').select('callix_assessor_id, callix_list_id, callix_name').eq('user_id', existingLead.responsavel_id).maybeSingle(),
        ]);
        responsavelNome = profileResult.data?.nome_completo || null;
        if (callixResult.data) {
          callixData = {
            assessores_id: callixResult.data.callix_assessor_id,
            list_id: callixResult.data.callix_list_id,
            name_assessores: callixResult.data.callix_name || '',
          };
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Lead existente atualizado (desduplicação)',
          deduplicated: true,
          data: {
            id: existingLead.id,
            protocolo: existingLead.protocolo_atendimento,
            nome: existingLead.nome_completo,
            responsavel_id: existingLead.responsavel_id || null,
            responsavel_nome: responsavelNome,
            callix: callixData,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No existing lead found — proceed with new insertion
    // Generate protocol number
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    const protocolo = `PROT-${year}-${random}`;



    // Prepare lead data for insertion
    const leadToInsert = {
      nome_completo: leadData.nome_completo.trim(),
      telefone: leadData.telefone.trim(),
      email: leadData.email.trim().toLowerCase(),
      perfil: leadData.perfil || null,
      protocolo_atendimento: protocolo,
      intencao: leadData.intencao || null,
      tipo_grao: leadData.tipo_grao || null,
      volume: parseVolumeToString(leadData.volume),
      valor_produto: valorProduto,
      cidade: leadData.cidade || null,
      uf: leadData.uf || null,
      localizacao_embarque: leadData.localizacao_embarque || null,
      distancia_km: parseNumericValue(leadData.distancia_km),
      sentido: sentido,
      estrada_terra_km: parseNumericValue(leadData.estrada_terra_km),
      armazenamento: armazenamento,
      qualidade: leadData.qualidade || null,
      tem_royalties: leadData.tem_royalties || null,
      percentual_royalties: parseNumericValue(leadData.percentual_royalties),
      etapa_funil: leadData.etapa_funil || 'Novo Lead',
      origem: leadData.origem || null,
      observacoes: leadData.observacoes || null,
      data_criacao: now.toISOString(),
    };

    // Insert lead into database
    const { data, error } = await supabase
      .from('leads')
      .insert([leadToInsert])
      .select()
      .single();

    if (error) {
      console.error('Error inserting lead:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao salvar lead no banco de dados',
          details: error.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Lead successfully created:', data);

    // Buscar dados do responsável e mapeamento Callix
    let responsavelNome: string | null = null;
    let callixData: { assessores_id: string; list_id: string; name_assessores: string } | null = null;

    if (data.responsavel_id) {
      // Buscar profile e callix mapping em paralelo
      const [profileResult, callixResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('nome_completo')
          .eq('user_id', data.responsavel_id)
          .maybeSingle(),
        supabase
          .from('user_callix_mapping')
          .select('callix_assessor_id, callix_list_id, callix_name')
          .eq('user_id', data.responsavel_id)
          .maybeSingle(),
      ]);

      responsavelNome = profileResult.data?.nome_completo || null;

      if (callixResult.data) {
        callixData = {
          assessores_id: callixResult.data.callix_assessor_id,
          list_id: callixResult.data.callix_list_id,
          name_assessores: callixResult.data.callix_name || '',
        };
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Lead criado com sucesso',
        data: {
          id: data.id,
          protocolo: data.protocolo_atendimento,
          nome: data.nome_completo,
          responsavel_id: data.responsavel_id || null,
          responsavel_nome: responsavelNome,
          callix: callixData,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in webhook-lead function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erro interno no servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
