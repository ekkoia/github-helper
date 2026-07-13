import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgendaEmailRequest {
  to_email: string;
  nome_assessor: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_description?: string;
  action: "created" | "updated" | "deleted";
  user_id: string;
}

const actionConfig = {
  created: {
    subject: "📅 Novo evento na sua agenda",
    heading: "Novo evento criado",
    description: "Um novo evento foi adicionado à sua agenda.",
    notificationType: "agenda_created",
    notificationTitle: "Novo evento na agenda",
  },
  updated: {
    subject: "✏️ Evento atualizado na sua agenda",
    heading: "Evento atualizado",
    description: "Um evento da sua agenda foi atualizado.",
    notificationType: "agenda_updated",
    notificationTitle: "Evento atualizado",
  },
  deleted: {
    subject: "❌ Evento cancelado na sua agenda",
    heading: "Evento cancelado",
    description: "Um evento da sua agenda foi cancelado.",
    notificationType: "agenda_deleted",
    notificationTitle: "Evento cancelado",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AgendaEmailRequest = await req.json();
    const { to_email, nome_assessor, event_title, event_date, event_time, event_description, action, user_id } = body;

    const config = actionConfig[action];
    if (!config) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create internal notification using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const notificationMessage = `${config.description} Evento: "${event_title}" em ${event_date}${event_time ? ` às ${event_time}` : ""}`;

    await supabase.from("notifications").insert({
      user_id,
      title: config.notificationTitle,
      message: notificationMessage,
      type: config.notificationType,
      metadata: { event_title, event_date, event_time },
    });

    // Send email via Resend
    if (to_email && RESEND_API_KEY) {
      const descriptionBlock = event_description
        ? `<p style="color: #3C4749; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;"><strong>Descrição:</strong> ${event_description}</p>`
        : "";

      // Paleta institucional Arvora (Manual de Diretrizes de Marca)
      // Petróleo (principal): #0A3642 | Verde-floresta: #015A3C
      // Verde-oliva (destaque): #86B227 | Amarelo-mostarda: #DFB902
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Saira:wght@400;600;700&display=swap');
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Saira', 'Poppins', 'Segoe UI', Arial, sans-serif; background-color: #EDF5F7;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <tr>
              <td style="padding: 40px 30px; background-color: #0A3642; text-align: center;">
                <img src="https://omilhfohvstqsonhyuxp.supabase.co/storage/v1/object/public/public-assets/LOGO%20ARVORA%20COR%20NEG@5x-8.png" alt="Arvora" width="160" style="display: block; margin: 0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
                <h2 style="font-family: 'Saira', 'Poppins', 'Segoe UI', Arial, sans-serif; color: #0A3642; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">${config.heading}</h2>
                <p style="color: #3C4749; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Olá, <strong>${nome_assessor}</strong>! ${config.description}
                </p>
                
                <div style="background-color: #EDF5F7; border: 1px solid #6E7E82; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="color: #3C4749; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Detalhes do evento</p>
                  <p style="color: #0A3642; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">${event_title}</p>
                  <p style="color: #3C4749; font-size: 14px; margin: 0 0 4px 0;">📅 ${event_date}</p>
                  ${event_time ? `<p style="color: #3C4749; font-size: 14px; margin: 0;">🕐 ${event_time}</p>` : ""}
                  ${descriptionBlock}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; background-color: #EDF5F7; border-top: 1px solid #6E7E82;">
                <p style="color: #6E7E82; font-size: 12px; text-align: center; margin: 0;">
                  Este email foi enviado automaticamente pelo CRM Arvora.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "CRM Arvora <noreply@arvora.app.br>",
          to: [to_email],
          subject: config.subject,
          html: emailHtml,
        }),
      });

      const emailResponse = await response.json();
      if (!response.ok) {
        console.error("Resend API error:", emailResponse);
      } else {
        console.log("Email sent successfully:", emailResponse);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-agenda-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
