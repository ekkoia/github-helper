import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@arvora.app.br';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.error('VAPID setup error:', e);
  }
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

interface Payload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  kind?: 'new_lead' | 'new_message' | string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as Payload;
    const { user_id, title, body, url, tag, kind } = payload;

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Respect user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('push_new_lead, push_new_message')
      .eq('user_id', user_id)
      .maybeSingle();

    if (prefs) {
      if (kind === 'new_lead' && prefs.push_new_lead === false) {
        return new Response(JSON.stringify({ skipped: 'user disabled new_lead' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (kind === 'new_message' && prefs.push_new_message === false) {
        return new Response(JSON.stringify({ skipped: 'user disabled new_message' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (subErr) {
      console.error('fetch subs err', subErr);
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      url: url ?? '/',
      tag: tag ?? `arvora-${Date.now()}`,
      kind: kind ?? 'generic',
    });

    let sent = 0;
    const toDelete: string[] = [];

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            notificationPayload,
            { TTL: 60 * 60 * 24 },
          );
          sent++;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            toDelete.push(s.id);
          } else {
            console.error('push err', status, err?.body ?? err?.message);
          }
        }
      }),
    );

    if (toDelete.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', toDelete);
    }

    // Update last_used_at (fire and forget)
    await supabase
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', user_id);

    return new Response(JSON.stringify({ sent, removed: toDelete.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('send-push err', e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
