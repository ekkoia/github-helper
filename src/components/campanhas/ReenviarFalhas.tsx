import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Loader2, RefreshCw, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useMetaAccount } from "@/hooks/useMetaAccount";
import { normalizePhoneForMatch } from "@/lib/phoneMatch";
import {
  Campanha,
  atualizarDestinatarioReenvio,
  fetchFalhasRecuperaveis,
  isFalhaRecuperavel,
  FalhaRecuperavel,
} from "@/hooks/useCampanhas";
import {
  buildTemplateComponents,
  fetchApprovedTemplates,
  formatPhoneForMeta,
} from "./campanhaUtils";

interface Props {
  campanha: Campanha;
  /** Recarrega métricas/histórico após o reenvio. */
  onDone?: () => void;
}

export const ReenviarFalhas = ({ campanha, onDone }: Props) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { account } = useMetaAccount();

  const [falhas, setFalhas] = useState<FalhaRecuperavel[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);

  // Carrega as falhas recuperáveis (só as que o usuário pode reenviar)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchFalhasRecuperaveis(campanha.id).then((rows) => {
      if (cancelled) return;
      const permitidas = isAdmin
        ? rows
        : rows.filter((r) => r.responsavel_id === user.id);
      setFalhas(permitidas);
    });
    return () => {
      cancelled = true;
    };
  }, [campanha.id, user?.id, isAdmin]);

  const total = falhas?.length ?? 0;
  if (!falhas || total === 0) return null;

  const executeResend = async () => {
    if (!user?.id || !account) {
      toast.error("Conta do WhatsApp não configurada.");
      return;
    }

    const templates = await fetchApprovedTemplates(account.id);
    const template = templates.find((t) => t.name === campanha.template_name);
    if (!template) {
      toast.error(
        `Template "${campanha.template_name}" não está mais aprovado nesta conta.`,
      );
      return;
    }

    const { components, missingMedia, missingVars } =
      buildTemplateComponents(template);
    if (missingMedia || missingVars) {
      toast.error(
        `Template "${template.name}" está com mídia ou variáveis pendentes. Ajuste em Configurações → WhatsApp → Templates.`,
      );
      return;
    }

    // Revalida janelas de 24h: quem já está em conversa ativa não recebe template
    const { data: windows } = await (supabase as any)
      .from("whatsapp_conversation_windows")
      .select("phone_e164, expires_at")
      .gt("expires_at", new Date().toISOString());
    const activeKeys = new Set<string>();
    for (const w of (windows as Array<{ phone_e164: string }>) || []) {
      const k = normalizePhoneForMatch(w.phone_e164);
      if (k) activeKeys.add(k);
    }

    cancelRef.current = false;
    setSending(true);
    setConfirmOpen(false);
    setProgress({ done: 0, total });

    let ok = 0;
    let novaFalha = 0;
    let pulados = 0;
    let paradaConta: string | null = null;

    for (const d of falhas) {
      if (cancelRef.current) break;

      const key = normalizePhoneForMatch(d.telefone);
      if (key && activeKeys.has(key)) {
        pulados += 1;
        setProgress((p) => ({ ...p, done: p.done + 1 }));
        continue;
      }

      const phone = formatPhoneForMeta(d.telefone);
      if (!phone) {
        pulados += 1;
        setProgress((p) => ({ ...p, done: p.done + 1 }));
        continue;
      }

      let metaMessageId: string | null = null;
      let erro: string | null = null;

      try {
        const { data: json, error } = await supabase.functions.invoke(
          "send-whatsapp-message",
          {
            body: {
              to: phone,
              type: "template",
              template_name: template.name,
              template_language: template.language || "pt_BR",
              template_components:
                components.length > 0 ? components : undefined,
            },
          },
        );

        if (error || (json as any)?.error) {
          erro = (json as any)?.error || error?.message || "Falha no reenvio";
          novaFalha += 1;
        } else {
          ok += 1;
          metaMessageId =
            (json as any)?.messages?.[0]?.id ||
            (json as any)?.meta_message_id ||
            null;

          await (supabase as any).from("chat_messages").insert({
            user_id: d.responsavel_id || user.id,
            phone,
            nomewpp: d.nome || "",
            bot_message: template.body || `[Template] ${template.name}`,
            whatsapp_instance_name: "meta_official",
            message_type: "text",
            message_direction: "outbound",
            meta_account_id: account.id,
            meta_message_id: metaMessageId,
            delivery_status: "sent",
          });
        }
      } catch (e) {
        erro = (e as Error).message;
        novaFalha += 1;
      }

      await atualizarDestinatarioReenvio(d.id, {
        status: erro ? "falha" : "enviado",
        meta_message_id: metaMessageId,
        erro,
      });

      setProgress((p) => ({ ...p, done: p.done + 1 }));

      // Se a conta continua irregular, para na primeira tentativa
      if (erro && isFalhaRecuperavel(erro)) {
        paradaConta = erro;
        break;
      }
    }

    setSending(false);
    setProgress({ done: 0, total: 0 });
    cancelRef.current = false;

    if (paradaConta) {
      toast.error(
        `Reenvio interrompido: a conta do WhatsApp ainda está irregular (${paradaConta}). Regularize o pagamento na Meta e tente de novo.`,
        { duration: 12000 },
      );
    } else {
      toast.success(
        `Reenvio concluído: ${ok} reenviado(s), ${novaFalha} nova(s) falha(s), ${pulados} pulado(s).`,
      );
    }

    const restantes = await fetchFalhasRecuperaveis(campanha.id);
    setFalhas(
      isAdmin ? restantes : restantes.filter((r) => r.responsavel_id === user.id),
    );
    onDone?.();
  };

  return (
    <>
      {sending ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Reenviando {progress.done} de {progress.total}...
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              cancelRef.current = true;
              toast.info("Reenvio será interrompido no próximo contato.");
            }}
          >
            <StopCircle className="h-3.5 w-3.5" />
            Interromper
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setConfirmOpen(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reenviar falhas ({total})
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar {total} mensagem(ns)?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão reenviados apenas os contatos que falharam por problema da
              conta do WhatsApp (pagamento/elegibilidade/token). Números
              inválidos e bloqueios definitivos da Meta ficam de fora, assim como
              leads que já estão em conversa ativa. Template:{" "}
              <strong>{campanha.template_name}</strong>. Regularize o pagamento
              na Meta antes de continuar — se o problema persistir, o reenvio para
              automaticamente na primeira tentativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                executeResend();
              }}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reenviar agora"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
