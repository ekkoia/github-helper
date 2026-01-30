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

    // Generate protocol number
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    const protocolo = `PROT-${year}-${random}`;

    // Helper function to parse numeric values
    const parseNumericValue = (value: any): number | null => {
      if (value === null || value === undefined || value === '' || value === 'nao_informado' || value === 'N/A') {
        return null;
      }
      const parsed = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(parsed) ? null : parsed;
    };

    // Helper function to parse valor_investido (accepts number, text ranges, or formatted currency)
    const parseValorInvestido = (value: any): number | null => {
      if (value === null || value === undefined || value === '' || value === 'nao_informado') {
        return null;
      }
      
      // Se já for número, retorna direto
      if (typeof value === 'number') {
        return value;
      }
      
      // Converte string para lowercase para comparação
      const valorStr = String(value).toLowerCase().trim();
      
      // Mapeamento de faixas de texto para valores numéricos (topo da faixa)
      const faixas: Record<string, number> = {
        'até r$10 mil': 10000,
        'ate r$10 mil': 10000,
        'de r$10 mil a r$50 mil': 50000,
        'de r$50 mil a r$100 mil': 100000,
        'acima de r$100 mil': 150000,
      };
      
      // Verifica se é uma faixa conhecida
      for (const [faixa, valor] of Object.entries(faixas)) {
        if (valorStr.includes(faixa) || faixa.includes(valorStr)) {
          return valor;
        }
      }
      
      // Tenta extrair número da string (ex: "50000", "R$ 50.000")
      const numStr = valorStr.replace(/[^\d.,]/g, '').replace(',', '.');
      const parsed = parseFloat(numStr);
      
      return isNaN(parsed) ? null : parsed;
    };

    // Helper function to convert volume to string (database expects text)
    const parseVolumeToString = (value: any): string | null => {
      if (value === null || value === undefined || value === '' || value === 'nao_informado') {
        return null;
      }
      return String(value);
    };

    // Normalize text (trim, lowercase, remove accents)
    const normalizeText = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    // Keep this in sync with the database constraint leads_armazenamento_check
    const validArmazenamentos = ['Silo Bolsa', 'Silo Metálico', 'Colheitadeira', 'Outro'] as const;
    const armazenamentoLookup = new Map<string, (typeof validArmazenamentos)[number]>(
      validArmazenamentos.map((v) => [normalizeText(v), v])
    );

    // Normalize/validate armazenamento so values like "Silo Metalico" pass (accent-insensitive)
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
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Normalize sentido to match database constraint (capitalize first letter)
    const validSentidos = ['Norte', 'Sul', 'Leste', 'Oeste', 'Nordeste', 'Noroeste', 'Sudeste', 'Sudoeste'] as const;
    const sentidoLookup = new Map<string, (typeof validSentidos)[number]>(
      validSentidos.map((v) => [normalizeText(v), v])
    );
    
    const sentidoInput = typeof leadData.sentido === 'string' ? leadData.sentido.trim() : '';
    const sentido = !sentidoInput || sentidoInput === 'nao_informado'
      ? null
      : sentidoLookup.get(normalizeText(sentidoInput)) ?? null;

    // Usar valor_investido como fallback para valor_produto
    const valorProdutoRaw = leadData.valor_produto ?? leadData.valor_investido;
    const valorProduto = parseValorInvestido(valorProdutoRaw);
    console.log('Valor produto raw:', valorProdutoRaw, '-> parsed:', valorProduto);

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

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Lead criado com sucesso',
        data: {
          id: data.id,
          protocolo: data.protocolo_atendimento,
          nome: data.nome_completo
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
