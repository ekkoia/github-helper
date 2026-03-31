import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("WEBHOOK_API_KEY");
    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { title, description, start_at, end_at, all_day, lead_id, lead_email, lead_telefone, user_id } = body;

    if (!title || !start_at) {
      return new Response(JSON.stringify({ error: "title and start_at are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolvedUserId = user_id;
    let resolvedLeadId = lead_id;

    // If no lead_id but has email/phone, look up
    if (!resolvedLeadId && (lead_email || lead_telefone)) {
      let query = supabase.from("leads").select("id, responsavel_id");
      if (lead_email) query = query.eq("email", lead_email);
      else if (lead_telefone) query = query.eq("telefone", lead_telefone);

      const { data: leads } = await query.limit(1);
      if (leads && leads.length > 0) {
        resolvedLeadId = leads[0].id;
        if (!resolvedUserId) resolvedUserId = leads[0].responsavel_id;
      }
    }

    // If still no user_id, try to get from lead
    if (!resolvedUserId && resolvedLeadId) {
      const { data: lead } = await supabase.from("leads").select("responsavel_id").eq("id", resolvedLeadId).single();
      if (lead) resolvedUserId = lead.responsavel_id;
    }

    if (!resolvedUserId) {
      return new Response(JSON.stringify({ error: "Could not resolve user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.from("agenda_events").insert({
      title,
      description: description || null,
      event_type: "external",
      start_at,
      end_at: end_at || null,
      all_day: all_day || false,
      lead_id: resolvedLeadId || null,
      user_id: resolvedUserId,
      created_by: null,
      metadata: body.metadata || {},
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, event: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in webhook-agenda:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
