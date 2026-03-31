import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all admin/global user IDs for notifications
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "global"]);
    const adminIds = (adminRoles || []).map((r: any) => r.user_id);

    // ========== 1. ALERTA 2H - Leads sem contato ==========
    const { data: leadsNoContact } = await supabase
      .from("leads")
      .select("id, nome_completo, responsavel_id")
      .eq("etapa_funil", "Lead novo!")
      .eq("alerta_sem_contato_enviado", false)
      .lt("data_criacao", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .limit(100);

    let alertCount = 0;
    if (leadsNoContact && leadsNoContact.length > 0) {
      const notifications: any[] = [];

      for (const lead of leadsNoContact) {
        const targetUsers = new Set<string>();

        // Notify the assigned assessor
        if (lead.responsavel_id) {
          targetUsers.add(lead.responsavel_id);
        }

        // Notify all admins
        for (const adminId of adminIds) {
          targetUsers.add(adminId);
        }

        for (const userId of targetUsers) {
          notifications.push({
            user_id: userId,
            title: "⚠️ Lead sem contato há 2h",
            message: `O lead "${lead.nome_completo}" está na etapa "Lead novo!" há mais de 2 horas sem contato.`,
            type: "lead_sem_contato",
            metadata: { lead_id: lead.id, lead_nome: lead.nome_completo },
          });
        }
      }

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }

      // Create agenda events for 2h alerts
      const agendaAlerts: any[] = [];
      for (const lead of leadsNoContact) {
        if (lead.responsavel_id) {
          agendaAlerts.push({
            title: `⚠️ Contatar lead: ${lead.nome_completo}`,
            description: `Lead sem contato há mais de 2 horas.`,
            event_type: "automation",
            start_at: new Date().toISOString(),
            all_day: false,
            lead_id: lead.id,
            user_id: lead.responsavel_id,
            metadata: { type: "alerta_sem_contato", lead_id: lead.id },
          });
        }
      }
      if (agendaAlerts.length > 0) {
        await supabase.from("agenda_events").insert(agendaAlerts);
      }

      // Mark leads as alerted
      const leadIds = leadsNoContact.map((l: any) => l.id);
      await supabase
        .from("leads")
        .update({ alerta_sem_contato_enviado: true })
        .in("id", leadIds);

      alertCount = leadsNoContact.length;
    }

    // ========== 2. RECONTATO 24H - Auto move stage ==========
    const { data: leadsRecontato } = await supabase
      .from("leads")
      .select("id, nome_completo, responsavel_id")
      .eq("etapa_funil", "Em contato comercial (assessor).")
      .lt("data_atualizacao", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(100);

    let recontatoCount = 0;
    if (leadsRecontato && leadsRecontato.length > 0) {
      const recontatoIds = leadsRecontato.map((l: any) => l.id);

      // Update stage
      await supabase
        .from("leads")
        .update({ etapa_funil: "Provisório> recontato 24h" })
        .in("id", recontatoIds);

      // Create notifications
      const notifications: any[] = [];
      const activities: any[] = [];

      for (const lead of leadsRecontato) {
        if (lead.responsavel_id) {
          notifications.push({
            user_id: lead.responsavel_id,
            title: "🔄 Lead movido para recontato",
            message: `O lead "${lead.nome_completo}" foi movido automaticamente para recontato após 24h sem atualização.`,
            type: "lead_recontato",
            metadata: { lead_id: lead.id, lead_nome: lead.nome_completo },
          });

          activities.push({
            user_id: lead.responsavel_id,
            activity_type: "lead_stage_changed",
            description: `Lead "${lead.nome_completo}" movido automaticamente para recontato (24h sem atualização)`,
            metadata: {
              lead_id: lead.id,
              from: "Em contato comercial (assessor).",
              to: "Provisório> recontato 24h",
              automatic: true,
            },
          });
        }

        // Also notify admins
        for (const adminId of adminIds) {
          if (adminId !== lead.responsavel_id) {
            notifications.push({
              user_id: adminId,
              title: "🔄 Lead movido para recontato",
              message: `O lead "${lead.nome_completo}" foi movido automaticamente para recontato após 24h.`,
              type: "lead_recontato",
              metadata: { lead_id: lead.id, lead_nome: lead.nome_completo },
            });
          }
        }
      }

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
      if (activities.length > 0) {
        await supabase.from("user_activities").insert(activities);
      }

      recontatoCount = leadsRecontato.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_sent: alertCount,
        leads_moved_to_recontato: recontatoCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in lead-automations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
