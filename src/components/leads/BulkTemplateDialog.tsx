import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMetaAccount } from "@/hooks/useMetaAccount";
import { useUserRole } from "@/hooks/useUserRole";

interface MetaTemplate {
  id: string;
  name: string;
  body: string | null;
  language: string;
  header_type: string | null;
  header_media_url: string | null;
  variables_example: any;
}

export interface BulkTemplateLead {
  id: string;
  nome_completo: string | null;
  telefone: string | null;
  responsavel_id: string | null;
}

interface BulkTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: BulkTemplateLead[];
  onDone?: () => void;
}

const formatPhoneForMeta = (raw: string | null | undefined): string => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

const buildTemplateComponents = (
  template: MetaTemplate,
): { components: any[]; missingMedia: boolean; missingVars: boolean } => {
  const components: any[] = [];
  let missingMedia = false;
  let missingVars = false;

  const headerType = (template.header_type || "").toUpperCase();
  if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)) {
    const url = (template.header_media_url || "").trim();
    if (!url) {
      missingMedia = true;
    } else {
      const key = headerType.toLowerCase();
      components.push({
        type: "header",
        parameters: [{ type: key, [key]: { link: url } }],
      });
    }
  }

  const matches = (template.body || "").match(/\{\{\s*\d+\s*\}\}/g) || [];
  const varCount = new Set(matches.map((m) => m.replace(/\D/g, ""))).size;
  if (varCount > 0) {
    const examples: string[] = Array.isArray(template.variables_example)
      ? template.variables_example.map((v: any) => String(v ?? ""))
      : [];
    if (examples.length < varCount) {
      missingVars = true;
    } else {
      components.push({
        type: "body",
        parameters: examples
          .slice(0, varCount)
          .map((t) => ({ type: "text", text: t })),
      });
    }
  }

  return { components, missingMedia, missingVars };
};

export const BulkTemplateDialog = ({
  open,
  onOpenChange,
  leads,
  onDone,
}: BulkTemplateDialogProps) => {
  const { user } = useAuth();
  const { isAdmin, isSDR } = useUserRole();
  const { account } = useMetaAccount();
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!open || !account?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      const { data } = await (supabase as any)
        .from("whatsapp_meta_templates")
        .select(
          "id, name, body, language, header_type, header_media_url, variables_example, status",
        )
        .eq("account_id", account.id)
        .eq("status", "APPROVED")
        .order("name", { ascending: true });
      if (!cancelled) {
        setTemplates((data as MetaTemplate[]) || []);
        setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, account?.id]);

  const notOwnedBySdrCount = useMemo(() => {
    if (!isSDR || isAdmin) return 0;
    return leads.filter((l) => l.responsavel_id !== user?.id).length;
  }, [leads, isSDR, isAdmin, user?.id]);

  const withoutPhoneCount = useMemo(
    () => leads.filter((l) => !formatPhoneForMeta(l.telefone)).length,
    [leads],
  );

  const eligibleLeads = useMemo(() => {
    return leads.filter((l) => {
      if (!formatPhoneForMeta(l.telefone)) return false;
      if (isSDR && !isAdmin && l.responsavel_id !== user?.id) return false;
      return true;
    });
  }, [leads, isSDR, isAdmin, user?.id]);

  const selectedTemplate = templates.find((t) => t.id === selectedId);
  const sdrHasBlocked = isSDR && !isAdmin && notOwnedBySdrCount > 0;
  const canSend = !!selectedTemplate && eligibleLeads.length > 0 && !sdrHasBlocked;

  const resetAndClose = () => {
    setSelectedId("");
    setProgress({ done: 0, total: 0 });
    onOpenChange(false);
  };

  const executeSend = async () => {
    if (!selectedTemplate || !user?.id || !account) return;
    const { components, missingMedia, missingVars } =
      buildTemplateComponents(selectedTemplate);
    if (missingMedia) {
      toast.error(
        `Template "${selectedTemplate.name}" precisa de mídia no cabeçalho. Cadastre a URL da imagem em Configurações → WhatsApp → Templates.`,
      );
      return;
    }
    if (missingVars) {
      toast.error(
        `Template "${selectedTemplate.name}" tem variáveis no corpo sem valores de exemplo cadastrados.`,
      );
      return;
    }

    setSending(true);
    setProgress({ done: 0, total: eligibleLeads.length });

    let sent = 0;
    let failed = 0;

    for (const lead of eligibleLeads) {
      const phone = formatPhoneForMeta(lead.telefone);
      try {
        const { data: json, error } = await supabase.functions.invoke(
          "send-whatsapp-message",
          {
            body: {
              to: phone,
              type: "template",
              template_name: selectedTemplate.name,
              template_language: selectedTemplate.language || "pt_BR",
              template_components:
                components.length > 0 ? components : undefined,
            },
          },
        );
        if (error || (json as any)?.error) {
          failed += 1;
        } else {
          sent += 1;
          const metaMessageId =
            (json as any)?.messages?.[0]?.id ||
            (json as any)?.meta_message_id ||
            null;
          await (supabase as any).from("chat_messages").insert({
            user_id: user.id,
            phone,
            nomewpp: lead.nome_completo || "",
            bot_message:
              selectedTemplate.body || `[Template] ${selectedTemplate.name}`,
            whatsapp_instance_name: "meta_official",
            message_type: "text",
            message_direction: "outbound",
            meta_account_id: account.id,
            meta_message_id: metaMessageId,
            delivery_status: "sent",
          });
        }
      } catch {
        failed += 1;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setSending(false);
    setConfirmOpen(false);

    toast.success(
      `Disparo concluído: ${sent} enviado(s)${failed ? `, ${failed} falha(s)` : ""}${
        withoutPhoneCount ? `, ${withoutPhoneCount} sem telefone` : ""
      }.`,
    );
    onDone?.();
    resetAndClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (!sending ? onOpenChange(o) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Disparo em massa de template
            </DialogTitle>
            <DialogDescription>
              Selecione um template aprovado para enviar aos leads selecionados.
              Cada envio segue as regras da Meta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
              <div>
                <span className="font-medium">{leads.length}</span> lead(s)
                selecionado(s)
              </div>
              <div>
                <span className="font-medium text-primary">
                  {eligibleLeads.length}
                </span>{" "}
                elegível(is) para envio
              </div>
              {withoutPhoneCount > 0 && (
                <div className="text-muted-foreground text-xs">
                  {withoutPhoneCount} sem telefone válido — serão ignorados.
                </div>
              )}
            </div>

            {sdrHasBlocked && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {notOwnedBySdrCount} lead(s) selecionado(s) não estão
                  atribuídos a você. Como SDR, o disparo só é permitido para
                  leads sob sua responsabilidade. Ajuste a seleção ou atribua
                  esses leads a você antes de continuar.
                </span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Template</label>
              <Select
                value={selectedId}
                onValueChange={setSelectedId}
                disabled={loadingTemplates || templates.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingTemplates
                        ? "Carregando..."
                        : templates.length === 0
                          ? "Nenhum template aprovado"
                          : "Escolha um template"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate?.body && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                {selectedTemplate.body}
              </div>
            )}

            {sending && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando {progress.done}/{progress.total}...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend || sending}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar para {eligibleLeads.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar disparo em massa</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>
                  Você vai enviar o template{" "}
                  <span className="font-semibold">
                    {selectedTemplate?.name}
                  </span>{" "}
                  para <span className="font-semibold">{eligibleLeads.length}</span>{" "}
                  lead(s). Esta ação não pode ser desfeita.
                </div>
                {selectedTemplate?.body && (
                  <div className="rounded-md border border-border bg-muted/40 p-2 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedTemplate.body}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeSend} disabled={sending}>
              {sending ? "Enviando..." : "Confirmar envio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
