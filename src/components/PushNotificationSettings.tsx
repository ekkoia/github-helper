import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export const PushNotificationSettings = () => {
  const { user } = useAuth();
  const { status, loading, subscribe, unsubscribe, lastError } = usePushNotifications();
  const [prefs, setPrefs] = useState({ push_new_lead: true, push_new_message: true });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('push_new_lead, push_new_message')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          push_new_lead: data.push_new_lead ?? true,
          push_new_message: data.push_new_message ?? true,
        });
      }
    })();
  }, [user]);

  const updatePref = async (key: 'push_new_lead' | 'push_new_message', value: boolean) => {
    if (!user) return;
    setSavingKey(key);
    setPrefs((p) => ({ ...p, [key]: value }));
    const { error } = await supabase
      .from('user_preferences')
      .update({ [key]: value })
      .eq('user_id', user.id);
    setSavingKey(null);
    if (error) {
      toast.error('Erro ao salvar preferência');
      setPrefs((p) => ({ ...p, [key]: !value }));
    }
  };

  const handleToggleMaster = async () => {
    if (status === 'subscribed') {
      const ok = await unsubscribe();
      if (ok) toast.success('Notificações desativadas');
    } else {
      const ok = await subscribe();
      if (ok) toast.success('Notificações ativadas neste dispositivo');
      else if (status === 'denied')
        toast.error('Permissão bloqueada — libere nas configurações do navegador');
      else toast.error('Não foi possível salvar a inscrição deste dispositivo');
    }
  };

  const isSubscribed = status === 'subscribed';
  const isDisabled =
    loading || status === 'unsupported' || status === 'preview' || status === 'no-vapid';

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações push
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Receba notificações no celular ou desktop, mesmo com o app fechado.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'unsupported' && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Este navegador não suporta notificações push. No iPhone, instale o app na tela
              inicial (Compartilhar → Adicionar à tela inicial) para habilitar.
            </div>
          </div>
        )}
        {status === 'preview' && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            As notificações push só funcionam no app publicado. Abra
            <span className="font-medium"> https://github-companion-app.lovable.app</span> ou o
            seu domínio para ativar.
          </div>
        )}
        {status === 'no-vapid' && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            Configuração do servidor incompleta (VAPID). Fale com o administrador.
          </div>
        )}
        {status === 'denied' && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            Permissão de notificações bloqueada. Libere nas configurações do navegador para este
            site e recarregue.
          </div>
        )}
        {lastError && status !== 'subscribed' && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            Erro ao ativar neste dispositivo: {lastError}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">
              {isSubscribed ? 'Notificações ativadas neste dispositivo' : 'Ativar notificações'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? 'Este dispositivo receberá notificações push.'
                : 'Ative para receber notificações neste dispositivo.'}
            </p>
          </div>
          <Button
            onClick={handleToggleMaster}
            disabled={isDisabled || status === 'denied'}
            variant={isSubscribed ? 'outline' : 'default'}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              <BellOff className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {isSubscribed ? 'Desativar' : 'Ativar'}
          </Button>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">O que você quer receber</p>

          <div className="flex items-center justify-between">
            <Label htmlFor="push_new_lead" className="flex-1 cursor-pointer pr-4">
              <span className="font-medium">Novo lead atribuído a mim</span>
              <span className="block text-xs text-muted-foreground">
                Quando um lead for atribuído ao seu nome
              </span>
            </Label>
            <Switch
              id="push_new_lead"
              checked={prefs.push_new_lead}
              disabled={savingKey === 'push_new_lead'}
              onCheckedChange={(v) => updatePref('push_new_lead', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push_new_message" className="flex-1 cursor-pointer pr-4">
              <span className="font-medium">Nova mensagem no WhatsApp</span>
              <span className="block text-xs text-muted-foreground">
                Quando um lead seu responder no WhatsApp
              </span>
            </Label>
            <Switch
              id="push_new_message"
              checked={prefs.push_new_message}
              disabled={savingKey === 'push_new_message'}
              onCheckedChange={(v) => updatePref('push_new_message', v)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
