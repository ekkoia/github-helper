import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { Palette, Bell, Layout, Save } from "lucide-react";

export const PreferenciasSection = () => {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [preferences, setPreferences] = useState({
    theme: 'system',
    default_view: 'tabela',
    density: 'comfortable',
    email_notifications: true,
    app_notifications: true,
    digest_frequency: 'daily',
    inactive_lead_alerts: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar preferências:", error);
      return;
    }

    if (data) {
      setPreferences({
        theme: data.theme || 'system',
        default_view: data.default_view || 'tabela',
        density: data.density || 'comfortable',
        email_notifications: data.email_notifications ?? true,
        app_notifications: data.app_notifications ?? true,
        digest_frequency: data.digest_frequency || 'daily',
        inactive_lead_alerts: data.inactive_lead_alerts ?? true,
      });
    }
  };

  const handleChange = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    
    // Aplicar tema imediatamente
    if (key === 'theme') {
      setTheme(value);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let error;

    if (existing) {
      const { error: updateError } = await supabase
        .from("user_preferences")
        .update(preferences)
        .eq("user_id", user.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("user_preferences")
        .insert({ ...preferences, user_id: user.id });
      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      toast.error("Erro ao salvar preferências: " + error.message);
      return;
    }

    toast.success("Preferências salvas com sucesso!");
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize a aparência da interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tema</Label>
            <Select
              value={preferences.theme}
              onValueChange={(value) => handleChange('theme', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha entre tema claro, escuro ou seguir as configurações do sistema
            </p>
          </div>

          <div className="space-y-2">
            <Label>Densidade da Interface</Label>
            <Select
              value={preferences.density}
              onValueChange={(value) => handleChange('density', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacta</SelectItem>
                <SelectItem value="comfortable">Confortável</SelectItem>
                <SelectItem value="spacious">Espaçosa</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ajuste o espaçamento entre elementos da interface
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visualização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Visualização
          </CardTitle>
          <CardDescription>
            Configure a visualização padrão dos dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Visualização Padrão de Leads</Label>
            <Select
              value={preferences.default_view}
              onValueChange={(value) => handleChange('default_view', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tabela">Tabela</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha qual visualização abrir por padrão ao acessar Leads
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Gerencie como deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações por Email</Label>
              <p className="text-xs text-muted-foreground">
                Receba atualizações importantes por email
              </p>
            </div>
            <Switch
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => handleChange('email_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações no App</Label>
              <p className="text-xs text-muted-foreground">
                Receba notificações dentro do sistema
              </p>
            </div>
            <Switch
              checked={preferences.app_notifications}
              onCheckedChange={(checked) => handleChange('app_notifications', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Frequência de Resumos</Label>
            <Select
              value={preferences.digest_frequency}
              onValueChange={(value) => handleChange('digest_frequency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="never">Nunca</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Receba resumos periódicos de atividades
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de Leads Inativos</Label>
              <p className="text-xs text-muted-foreground">
                Receba alertas quando leads ficarem inativos por muito tempo
              </p>
            </div>
            <Switch
              checked={preferences.inactive_lead_alerts}
              onCheckedChange={(checked) => handleChange('inactive_lead_alerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      )}
    </div>
  );
};
