// send-whatsapp-message
// Envia mensagens via API oficial Meta WhatsApp Cloud usando a conta
// compartilhada (configurada uma única vez pelo admin global).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendBody {
  to: string;
  type: "text" | "template" | "image" | "video" | "audio" | "document";
  text?: string;
  media_id?: string;
  media_type?: string;
  caption?: string;
  filename?: string;
  template_name?: string;
  template_language?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Valida usuário autenticado
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as SendBody;
    if (!body?.to || !body?.type) {
      return new Response(JSON.stringify({ error: "Campos 'to' e 'type' são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Conta Meta compartilhada (primeira/única configurada)
    const { data: account, error: accErr } = await supabase
      .from("whatsapp_meta_accounts")
      .select("phone_number_id, access_token, api_version")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Conta Meta WhatsApp não configurada. Solicite ao administrador global." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Monta payload conforme tipo
    let payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: body.to,
      type: body.type,
    };

    if (body.type === "text") {
      payload.text = { body: body.text || "" };
    } else if (body.type === "template") {
      payload.template = {
        name: body.template_name,
        language: { code: body.template_language || "pt_BR" },
      };
    } else if (["image", "video", "audio", "document"].includes(body.type)) {
      const media: Record<string, unknown> = { id: body.media_id };
      if (body.caption && body.type !== "audio") media.caption = body.caption;
      if (body.type === "document" && body.filename) media.filename = body.filename;
      payload[body.type] = media;
    }

    console.log("Sending to Meta:", JSON.stringify(payload));

    const url = `https://graph.facebook.com/${account.api_version}/${account.phone_number_id}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    console.log("Meta API response:", JSON.stringify(json));

    if (!res.ok || json.error) {
      return new Response(JSON.stringify({ error: json.error?.message || "Falha ao enviar mensagem", details: json }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, ...json }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-whatsapp-message error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
