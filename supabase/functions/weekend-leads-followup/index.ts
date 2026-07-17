import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE_NAME = "arv_retivacao_leads_fds";
const TEMPLATE_LANGUAGE = "pt_BR";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Meta account (shared)
    const { data: metaAccount, error: metaErr } = await supabase
      .from("whatsapp_meta_accounts")
      .select("phone_number_id, access_token, api_version")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (metaErr || !metaAccount) {
      return new Response(
        JSON.stringify({ error: "No Meta account configured", details: metaErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Admin ids for notifications
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "global"]);
    const adminIds = (adminRoles || []).map((r: any) => r.user_id);

    // Leads FDS not yet processed
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, nome_completo, telefone, responsavel_id, data_criacao")
      .eq("etapa_funil", "Leads FDS")
      .is("template_fds_enviado_em", null)
      .limit(500);

    if (leadsErr) {
      return new Response(
        JSON.stringify({ error: leadsErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiVersion = metaAccount.api_version || "v21.0";
    const graphUrl = `https://graph.facebook.com/${apiVersion}/${metaAccount.phone_number_id}/messages`;

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const lead of leads || []) {
      const phone = (lead.telefone || "").replace(/[^0-9]/g, "");
      if (!phone) {
        skipped++;
        continue;
      }

      // Check if already contacted via outbound message
      const { data: outboundMsg } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("phone", phone)
        .eq("message_direction", "outbound")
        .gte("created_at", lead.data_criacao)
        .limit(1)
        .maybeSingle();

      if (outboundMsg) {
        await supabase
          .from("leads")
          .update({ template_fds_enviado_em: new Date().toISOString() })
          .eq("id", lead.id);
        skipped++;
        continue;
      }

      // Send template via Meta Graph API
      try {
        const resp = await fetch(graphUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaAccount.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: TEMPLATE_NAME,
              language: { code: TEMPLATE_LANGUAGE },
            },
          }),
        });

        const respBody = await resp.text();

        if (!resp.ok) {
          failed++;
          errors.push({ lead_id: lead.id, status: resp.status, body: respBody });
          console.error(`Meta send failed [${resp.status}] lead=${lead.id}: ${respBody}`);
          continue;
        }

        // Mark as sent
        await supabase
          .from("leads")
          .update({ template_fds_enviado_em: new Date().toISOString() })
          .eq("id", lead.id);

        // Log outbound message in chat history
        await supabase.from("chat_messages").insert({
          phone,
          nomewpp: lead.nome_completo,
          message_direction: "outbound",
          message_type: "template",
          bot_message: `[Template automático] ${TEMPLATE_NAME}`,
          whatsapp_instance_name: "meta_official",
        });

        // Notify responsavel + admins
        const targetUsers = new Set<string>();
        if (lead.responsavel_id) targetUsers.add(lead.responsavel_id);
        for (const a of adminIds) targetUsers.add(a);

        if (targetUsers.size > 0) {
          const notifications = Array.from(targetUsers).map((uid) => ({
            user_id: uid,
            title: "📤 Template FDS enviado",
            message: `Template "${TEMPLATE_NAME}" enviado automaticamente para o lead "${lead.nome_completo}" (Leads FDS).`,
            type: "template_fds_enviado",
            metadata: { lead_id: lead.id, lead_nome: lead.nome_completo, template: TEMPLATE_NAME },
          }));
          await supabase.from("notifications").insert(notifications);
        }

        sent++;
      } catch (err: any) {
        failed++;
        errors.push({ lead_id: lead.id, error: err.message });
        console.error(`Exception sending template lead=${lead.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: leads?.length || 0,
        sent,
        skipped,
        failed,
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in weekend-leads-followup:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
