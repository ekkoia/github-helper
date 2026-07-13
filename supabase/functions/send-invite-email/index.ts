import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface SendInviteEmailRequest {
  to_email: string;
  nome_completo: string;
  invite_link: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, nome_completo, invite_link }: SendInviteEmailRequest = await req.json();

    console.log(`Sending invite email to: ${to_email}`);

    // Paleta institucional Arvora (Manual de Diretrizes de Marca)
    // Petróleo (principal): #0A3642 | Verde-floresta: #015A3C
    // Verde-oliva (destaque): #86B227 | Amarelo-mostarda: #DFB902
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite CRM Arvora</title>
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
              <h2 style="font-family: 'Saira', 'Poppins', 'Segoe UI', Arial, sans-serif; color: #0A3642; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Olá, ${nome_completo}!</h2>
              <p style="color: #3C4749; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Você foi convidado para fazer parte do <strong>CRM Arvora</strong>. 
                Clique no botão abaixo para criar sua senha e começar a usar o sistema.
              </p>
              
              <!-- Login info box -->
              <div style="background-color: #EDF5F7; border: 1px solid #6E7E82; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #3C4749; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Seu login</p>
                <p style="color: #0A3642; font-size: 16px; font-weight: 600; margin: 0;">${to_email}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invite_link}" 
                   style="font-family: 'Saira', 'Poppins', 'Segoe UI', Arial, sans-serif; display: inline-block; padding: 14px 32px; background-color: #86B227; color: #ffffff; text-decoration: none; border-radius: 24px; font-weight: 600; font-size: 16px;">
                  Criar Minha Senha
                </a>
              </div>
              <p style="color: #6E7E82; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="color: #015A3C; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                ${invite_link}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #EDF5F7; border-top: 1px solid #6E7E82;">
              <p style="color: #6E7E82; font-size: 12px; text-align: center; margin: 0;">
                Este email foi enviado automaticamente pelo CRM Arvora.<br>
                Se você não solicitou este convite, por favor ignore este email.
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
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CRM Arvora <noreply@arvora.app.br>",
        to: [to_email],
        subject: "Você foi convidado para o CRM Arvora",
        html: emailHtml,
      }),
    });

    const emailResponse = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", emailResponse);
      return new Response(
        JSON.stringify({ error: emailResponse.message || "Failed to send email" }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
