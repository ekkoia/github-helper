import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buffer;
}

function isPreviewOrDev(): boolean {
  try {
    if (!import.meta.env.PROD) return true;
    if (window.self !== window.top) return true;
    const h = window.location.hostname;
    if (h.startsWith('id-preview--') || h.startsWith('preview--')) return true;
    if (h === 'lovableproject.com' || h.endsWith('.lovableproject.com')) return true;
    if (h === 'lovableproject-dev.com' || h.endsWith('.lovableproject-dev.com')) return true;
    if (h === 'beta.lovable.dev' || h.endsWith('.beta.lovable.dev')) return true;
    if (new URL(window.location.href).searchParams.get('sw') === 'off') return true;
  } catch {}
  return false;
}

export type PushStatus =
  | 'unsupported'
  | 'preview'
  | 'no-vapid'
  | 'default'
  | 'granted'
  | 'denied'
  | 'subscribed';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>('default');
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const saveSubscription = useCallback(
    async (sub: PushSubscription) => {
      if (!user) return false;

      const json = sub.toJSON();
      const endpoint = sub.endpoint;
      const p256dh = json.keys?.p256dh ?? '';
      const auth = json.keys?.auth ?? '';

      if (!endpoint || !p256dh || !auth) {
        setLastError('Inscrição push incompleta. Desative e ative novamente.');
        return false;
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );

      if (error) {
        console.error('save sub err', error);
        setLastError(error.message);
        return false;
      }

      setLastError(null);
      return true;
    },
    [user],
  );

  const refresh = useCallback(async () => {
    if (!supported) return setStatus('unsupported');
    if (isPreviewOrDev()) return setStatus('preview');
    if (!VAPID_PUBLIC_KEY) return setStatus('no-vapid');

    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        if (!user) return setStatus('granted');

        const saved = await saveSubscription(sub);
        return setStatus(saved ? 'subscribed' : 'granted');
      }
      if (Notification.permission === 'denied') return setStatus('denied');
      if (Notification.permission === 'granted') return setStatus('granted');
      setStatus('default');
    } catch (e) {
      console.error('push refresh err', e);
      setLastError(e instanceof Error ? e.message : 'Erro ao verificar notificações');
    }
  }, [supported, user, saveSubscription]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!user || !supported || !VAPID_PUBLIC_KEY || isPreviewOrDev()) return false;
    setLoading(true);
    try {
      let reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default');
        return false;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const saved = await saveSubscription(sub);
      if (!saved) {
        setStatus('granted');
        return false;
      }

      setStatus('subscribed');
      return true;
    } catch (e) {
      console.error('subscribe err', e);
      setLastError(e instanceof Error ? e.message : 'Erro ao ativar notificações');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supported, saveSubscription]);

  const unsubscribe = useCallback(async () => {
    if (!user || !supported) return false;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        try {
          await sub.unsubscribe();
        } catch {}
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
      await refresh();
      return true;
    } finally {
      setLoading(false);
    }
  }, [user, supported, refresh]);

  return { status, loading, supported, subscribe, unsubscribe, refresh, lastError };
};
