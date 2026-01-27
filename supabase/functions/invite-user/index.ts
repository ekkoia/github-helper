import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface InviteUserRequest {
  email: string;
  nome_completo: string;
  telefone?: string;
  role?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://crm.imaculada.online";

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the auth header to extract the user who is inviting
    const authHeader = req.headers.get("Authorization");
    let invitedBy: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      invitedBy = user?.id || null;
    }

    const { email, nome_completo, telefone, role = "user" }: InviteUserRequest = await req.json();

    console.log(`Inviting user: ${email} with name: ${nome_completo}`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // Check if user has a profile (completed signup)
      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (profileData) {
        // User exists and has completed signup
        console.log("User already exists with profile:", email);
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } else {
        // User exists in auth but never completed signup - delete orphaned user
        console.log("Found orphaned user (no profile), deleting:", email);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        if (deleteError) {
          console.error("Error deleting orphaned user:", deleteError);
        }
      }
    }

    // Check if there's already a pending invite for this email
    const { data: existingInvite } = await supabaseAdmin
      .from("pending_invites")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingInvite) {
      console.log("Invite already pending for:", email);
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate invite link with redirect to set-password page
    const redirectUrl = `${siteUrl}/set-password`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: redirectUrl,
        data: {
          nome_completo,
          full_name: nome_completo,
          telefone,
          role,
        },
      },
    });

    if (linkError) {
      console.error("Error generating invite link:", linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Invite link generated for user:", linkData.user?.id);

    // The action_link contains the full verification URL
    const inviteLink = linkData.properties?.action_link;

    if (!inviteLink) {
      console.error("No action_link in response");
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de convite" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Generated invite link:", inviteLink);

    // Insert into pending_invites table
    const { error: pendingError } = await supabaseAdmin
      .from("pending_invites")
      .insert({
        email,
        nome_completo,
        telefone,
        role,
        invited_by: invitedBy,
      });

    if (pendingError) {
      console.error("Error creating pending invite:", pendingError);
      // Don't fail the whole request, the invite was sent
    }

    // Send custom invite email via Resend with the correct invite link
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to_email: email,
          nome_completo,
          invite_link: inviteLink,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error("Error sending custom email:", errorData);
      } else {
        console.log("Custom invite email sent successfully");
      }
    } catch (emailError) {
      console.error("Error calling send-invite-email function:", emailError);
      // Don't fail the whole request if custom email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Convite enviado com sucesso",
        user_id: linkData.user?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
