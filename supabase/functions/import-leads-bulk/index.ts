import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncomingLead {
  index: number;
  nome_completo: string;
  telefone: string;
  email: string;
  perfil?: string;
  intencao?: string;
  tipo_grao?: string;
  volume?: string;
  valor_produto?: number | null;
  cidade?: string;
  uf?: string;
  etapa_funil?: string;
  origem?: string;
  observacoes?: string;
  nota_assessor?: string;
}

function normalizePhone(value: any): { e164: string; valid: boolean } {
  if (value === null || value === undefined) return { e164: "", valid: false };
  let s = String(value).trim();
  if (/e[+-]?\d+/i.test(s)) {
    const n = Number(s);
    if (!isNaN(n)) s = n.toFixed(0);
  }
  let digits = s.replace(/\D/g, "").replace(/^0+/, "");
  let local = digits;
  if (digits.length >= 12 && digits.startsWith("55")) local = digits.slice(2);
  const valid = local.length === 10 || local.length === 11;
  return { e164: valid ? `55${local}` : digits, valid };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const roles = (roleData || []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("global")) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const leads: IncomingLead[] = body.leads || [];
    const origemDefault: string = body.origem_default || "importacao_planilha";

    if (!Array.isArray(leads) || leads.length === 0) {
      return new Response(JSON.stringify({ error: "No leads provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (leads.length > 500) {
      return new Response(JSON.stringify({ error: "Max 500 leads per request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{
      index: number;
      status: "created" | "merged" | "error";
      lead_id?: string;
      error?: string;
    }> = [];

    for (const lead of leads) {
      try {
        const emailNorm = (lead.email || "").trim().toLowerCase();
        const phoneNorm = (lead.telefone || "").trim();
        const phoneDigits = phoneNorm.replace(/[^0-9]/g, "");

        if (!lead.nome_completo || !emailNorm || !phoneNorm) {
          results.push({ index: lead.index, status: "error", error: "Campos obrigatórios faltando" });
          continue;
        }

        // Dedup: search by email or phone
        const { data: existing } = await admin
          .from("leads")
          .select("id, observacoes, origens")
          .or(`email.eq.${emailNorm},telefone.eq.${phoneNorm}`)
          .order("data_criacao", { ascending: true })
          .limit(1)
          .maybeSingle();

        const origem = lead.origem || origemDefault;

        if (existing) {
          const currentOrigens: string[] = Array.isArray(existing.origens) ? (existing.origens as any) : [];
          const newOrigens = currentOrigens.includes(origem) ? currentOrigens : [...currentOrigens, origem];
          const mergeNote = `\n[${new Date().toISOString()}] Atualizado via importação em massa (${origem})`;

          const updateData: Record<string, any> = {
            observacoes: (existing.observacoes || "") + mergeNote,
            data_atualizacao: new Date().toISOString(),
            origens: newOrigens,
          };
          if (lead.perfil) updateData.perfil = lead.perfil;
          if (lead.intencao) updateData.intencao = lead.intencao;
          if (lead.tipo_grao) updateData.tipo_grao = lead.tipo_grao;
          if (lead.volume) updateData.volume = String(lead.volume);
          if (lead.cidade) updateData.cidade = lead.cidade;
          if (lead.uf) updateData.uf = lead.uf;
          if (lead.valor_produto != null) updateData.valor_produto = lead.valor_produto;

          const { error: updErr } = await admin.from("leads").update(updateData).eq("id", existing.id);
          if (updErr) throw updErr;
          results.push({ index: lead.index, status: "merged", lead_id: existing.id });
          continue;
        }

        // Insert new
        const protocolo = `PROT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
        const insertData: Record<string, any> = {
          nome_completo: lead.nome_completo.trim(),
          telefone: phoneNorm,
          email: emailNorm,
          perfil: lead.perfil || null,
          intencao: lead.intencao || null,
          tipo_grao: lead.tipo_grao || null,
          volume: lead.volume ? String(lead.volume) : null,
          valor_produto: lead.valor_produto ?? null,
          cidade: lead.cidade || null,
          uf: lead.uf || null,
          etapa_funil: lead.etapa_funil || "Novo Lead",
          origem,
          observacoes: lead.observacoes || null,
          nota_assessor: lead.nota_assessor || null,
          protocolo_atendimento: protocolo,
          origens: [origem],
        };

        const { data: inserted, error: insErr } = await admin
          .from("leads")
          .insert(insertData)
          .select("id")
          .single();

        if (insErr) throw insErr;
        results.push({ index: lead.index, status: "created", lead_id: inserted.id });
      } catch (e: any) {
        results.push({
          index: lead.index,
          status: "error",
          error: e?.message || "Erro desconhecido",
        });
      }
    }

    const summary = {
      created: results.filter((r) => r.status === "created").length,
      merged: results.filter((r) => r.status === "merged").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return new Response(JSON.stringify({ success: true, summary, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("import-leads-bulk error", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: err?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
