import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);

    // Fetch upcoming events that haven't sent reminders
    const { data: events, error: fetchError } = await supabase
      .from("agenda_events")
      .select("id, title, start_at, user_id, lead_id")
      .eq("reminder_sent", false)
      .eq("all_day", false)
      .gte("start_at", now.toISOString())
      .lte("start_at", in30min.toISOString());

    if (fetchError) {
      console.error("Error fetching events:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming events", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const event of events) {
      const minutesUntil = Math.round(
        (new Date(event.start_at).getTime() - now.getTime()) / 60000
      );

      // Insert notification
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: event.user_id,
        title: `🔔 Evento em breve: ${event.title}`,
        message: `O evento "${event.title}" começa em ${minutesUntil} minutos.`,
        type: "agenda_reminder",
        metadata: { event_id: event.id, lead_id: event.lead_id },
      });

      if (notifError) {
        console.error(`Error creating notification for event ${event.id}:`, notifError);
        continue;
      }

      // Mark reminder as sent
      const { error: updateError } = await supabase
        .from("agenda_events")
        .update({ reminder_sent: true })
        .eq("id", event.id);

      if (updateError) {
        console.error(`Error updating reminder_sent for event ${event.id}:`, updateError);
        continue;
      }

      processed++;
    }

    return new Response(JSON.stringify({ message: "Reminders processed", processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
