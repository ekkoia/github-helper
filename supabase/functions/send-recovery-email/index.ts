import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface SendRecoveryEmailRequest {
  to_email: string;
  recovery_link: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, recovery_link }: SendRecoveryEmailRequest = await req.json();

    console.log(`Sending recovery email to: ${to_email}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha - CRM Feeagro</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #65a30d 0%, #84cc16 100%); text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">CRM Feeagro</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 24px;">Recuperação de Senha</h2>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>CRM Feeagro</strong>.
                Clique no botão abaixo para criar uma nova senha.
              </p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Sua conta</p>
                <p style="color: #1a1a2e; font-size: 16px; font-weight: 600; margin: 0;">${to_email}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${recovery_link}" 
                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #65a30d 0%, #84cc16 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(101, 163, 13, 0.4);">
                  Redefinir Minha Senha
                </a>
              </div>
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="color: #65a30d; font-size: 14px; word-break: break-all; margin: 10px 0 0 0;">
                ${recovery_link}
              </p>
              <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;">
                Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanecerá inalterada.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                Este email foi enviado automaticamente pelo CRM Feeagro.<br>
                Se você não solicitou esta ação, por favor ignore este email.
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
        from: "Arvora CRM <noreply@arvora.app.br>",
        to: [to_email],
        subject: "Redefinição de Senha - CRM Feeagro",
        html: emailHtml,
      }),
    });

    const emailResponse = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", emailResponse);
      return new Response(
        JSON.stringify({ error: emailResponse.message || "Failed to send email" }),
        { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Recovery email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-recovery-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
