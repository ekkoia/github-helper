import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, CheckCircle2, AlertCircle, Save, RefreshCw, Lock, Image as ImageIcon } from "lucide-react";

export const WhatsAppMetaSection = () => {
  const { user } = useAuth();
  const { isGlobal, loading: loadingRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [form, setForm] = useState({
    account_name: "",
    waba_id: "",
    phone_number_id: "",
    access_token: "",
    api_version: "v25.0",
  });

  useEffect(() => {
    const fetchAccount = async () => {
      const { data } = await (supabase as any)
        .from("whatsapp_meta_accounts")
        .select("id, account_name, waba_id, phone_number_id, access_token, api_version")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        setAccountId(data.id);
        setForm({
          account_name: data.account_name || "",
          waba_id: data.waba_id || "",
          phone_number_id: data.phone_number_id || "",
          access_token: data.access_token || "",
          api_version: data.api_version || "v25.0",
        });
      }
      setLoading(false);
    };
    fetchAccount();
  }, []);

  const hasAccount = !!accountId;

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.waba_id || !form.phone_number_id || !form.access_token) {
      toast.error("Preencha WABA ID, Phone Number ID e Access Token");
      return;
    }
    setSaving(true);
    try {
      if (accountId) {
        const { error } = await (supabase as any)
          .from("whatsapp_meta_accounts")
          .update(form)
          .eq("id", accountId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("whatsapp_meta_accounts")
          .insert({ user_id: user.id, ...form })
          .select("id")
          .single();
        if (error) throw error;
        setAccountId(data.id);
      }
      toast.success("Conta Meta salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleSyncTemplates = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-meta-templates");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.synced} templates sincronizados com sucesso!`);
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + (err.message || ""));
    } finally {
      setSyncing(false);
    }
  };

  if (loading || loadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  // Usuários comuns e admins: somente visualização do status da conta compartilhada.
  if (!isGlobal) {
    return (
      <div className="space-y-4">
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${hasAccount ? "bg-green-500/5 border-green-500/20" : "bg-muted/30 border-border"}`}>
          {hasAccount ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Conta Meta compartilhada conectada</p>
                <p className="text-xs text-muted-foreground">{form.account_name || form.phone_number_id}</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Nenhuma conta Meta configurada</p>
                <p className="text-xs text-muted-foreground">Solicite ao administrador global a configuração da conta.</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/30 border border-border text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>
            A conta do WhatsApp comercial é compartilhada entre todos os usuários e gerenciada apenas pelo administrador global. Você não precisa configurar nada — basta usar o chat normalmente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${hasAccount ? "bg-green-500/5 border-green-500/20" : "bg-muted/30 border-border"}`}>
        {hasAccount ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Conta conectada (compartilhada com todos os usuários)</p>
              <p className="text-xs text-muted-foreground">{form.account_name || form.phone_number_id}</p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Nenhuma conta configurada</p>
              <p className="text-xs text-muted-foreground">Preencha os campos abaixo para conectar — será usada por toda a equipe</p>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="h-4 w-4 text-green-500" />
          <h3 className="font-medium text-sm">Configuração manual — API oficial Meta</h3>
        </div>

        <div className="space-y-1">
          <Label htmlFor="account_name">Nome da conta</Label>
          <Input id="account_name" placeholder="Ex: Feeagro WhatsApp" value={form.account_name} onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="waba_id">WABA ID <span className="text-destructive">*</span></Label>
          <Input id="waba_id" placeholder="Ex: 123456789012345" value={form.waba_id} onChange={(e) => setForm((f) => ({ ...f, waba_id: e.target.value }))} />
          <p className="text-xs text-muted-foreground">WhatsApp Business Account ID — encontrado no Meta Business Manager</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="phone_number_id">Phone Number ID <span className="text-destructive">*</span></Label>
          <Input id="phone_number_id" placeholder="Ex: 987654321098765" value={form.phone_number_id} onChange={(e) => setForm((f) => ({ ...f, phone_number_id: e.target.value }))} />
          <p className="text-xs text-muted-foreground">ID do número no Meta Developer Portal → WhatsApp → API Setup</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="access_token">Access Token <span className="text-destructive">*</span></Label>
          <Textarea id="access_token" placeholder="EAAxxxx..." value={form.access_token} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))} className="min-h-[80px] font-mono text-xs" />
          <p className="text-xs text-muted-foreground">System User Token permanente com permissões whatsapp_business_messaging</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="api_version">Versão da API</Label>
          <Input id="api_version" value={form.api_version} onChange={(e) => setForm((f) => ({ ...f, api_version: e.target.value }))} className="w-32" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : hasAccount ? "Atualizar configuração" : "Salvar configuração"}
          </Button>

          {hasAccount && (
            <Button onClick={handleSyncTemplates} disabled={syncing} variant="outline" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar templates"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
