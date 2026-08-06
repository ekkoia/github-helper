import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AlertCircle, Loader2, Megaphone, Search, Send, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useMetaAccount } from "@/hooks/useMetaAccount";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";
import { useLeadTagsCatalog } from "@/hooks/useLeadTags";
import { useUsers } from "@/hooks/useUsers";
import { normalizePhoneForMatch } from "@/lib/phoneMatch";
import { PeriodoFilter } from "./PeriodoFilter";
import { getPeriodoRange, isWithinPeriodo, PeriodoValue } from "./dateFilter";
import {
  buildTemplateComponents,
  CampanhaTemplate,
  fetchApprovedTemplates,
  formatPhoneForMeta,
} from "./campanhaUtils";

interface LeadRow {
  id: string;
  nome_completo: string | null;
  telefone: string | null;
  responsavel_id: string | null;
  etapa_funil: string | null;
  origem: string | null;
  data_criacao: string;
}

interface CampanhaBuilderProps {
  onCampanhaCriada?: () => void;
}

const PAGE_SIZE = 1000;

export const CampanhaBuilder = ({ onCampanhaCriada }: CampanhaBuilderProps) => {
  const { user } = useAuth();
  const { isAdmin, isSDR, loading: roleLoading } = useUserRole();
  const { account } = useMetaAccount();
  const { etapasNomes } = useFunilEtapas();
  const { tags } = useLeadTagsCatalog();
  const { users, usersMap } = useUsers();

  const podeBaseInteira = isAdmin || isSDR;

  const [nome, setNome] = useState("");
  const [templates, setTemplates] = useState<CampanhaTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [tagAssignments, setTagAssignments] = useState<
    Array<{ lead_id: string; tag_id: string }>
  >([]);

  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState("all");
  const [origem, setOrigem] = useState("all");
  const [tagId, setTagId] = useState("all");
  const [responsavel, setResponsavel] = useState("all");
  const [periodo, setPeriodo] = useState<PeriodoValue>("all");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [limite, setLimite] = useState<string>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);


  // Templates aprovados
  useEffect(() => {
    if (!account?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      const list = await fetchApprovedTemplates(account.id);
      if (!cancelled) {
        setTemplates(list);
        setLoadingTemplates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account?.id]);

  // Leads (paginado), janelas de 24h abertas e tags atribuídas
  useEffect(() => {
    if (!user?.id || roleLoading) return;
    let cancelled = false;

    (async () => {
      setLoadingLeads(true);

      const all: LeadRow[] = [];
      let from = 0;
      while (true) {
        let query = (supabase as any)
          .from("leads")
          .select("id, nome_completo, telefone, responsavel_id, etapa_funil, origem, data_criacao")
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (!podeBaseInteira) query = query.eq("responsavel_id", user.id);
        const { data, error } = await query;
        if (error) {
          console.error("Erro ao buscar leads da campanha:", error);
          break;
        }
        all.push(...((data as LeadRow[]) || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const [{ data: windows }, { data: assignments }] = await Promise.all([
        (supabase as any)
          .from("whatsapp_conversation_windows")
          .select("phone_e164, expires_at")
          .gt("expires_at", new Date().toISOString()),
        (supabase as any).from("lead_tag_assignments").select("lead_id, tag_id"),
      ]);

      if (cancelled) return;

      const keys = new Set<string>();
      for (const w of (windows as Array<{ phone_e164: string }>) || []) {
        const k = normalizePhoneForMatch(w.phone_e164);
        if (k) keys.add(k);
      }

      setLeads(all);
      setActiveKeys(keys);
      setTagAssignments(
        (assignments as Array<{ lead_id: string; tag_id: string }>) || [],
      );
      setLoadingLeads(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, roleLoading, podeBaseInteira]);

  const origens = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.origem) set.add(l.origem);
    });
    return Array.from(set).sort();
  }, [leads]);

  const leadIdsByTag = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of tagAssignments) {
      if (!map.has(a.tag_id)) map.set(a.tag_id, new Set());
      map.get(a.tag_id)!.add(a.lead_id);
    }
    return map;
  }, [tagAssignments]);

  const publico = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const tagSet = tagId !== "all" ? leadIdsByTag.get(tagId) : null;
    const range = getPeriodoRange(periodo, dataInicio, dataFim);

    return leads.filter((l) => {
      if (etapa !== "all" && l.etapa_funil !== etapa) return false;
      if (origem !== "all" && l.origem !== origem) return false;
      if (!isWithinPeriodo(l.data_criacao, range)) return false;
      if (responsavel !== "all") {
        if (responsavel === "none" && l.responsavel_id) return false;
        if (responsavel !== "none" && l.responsavel_id !== responsavel) return false;
      }
      if (tagSet && !tagSet.has(l.id)) return false;
      if (termo) {
        const nomeLead = (l.nome_completo || "").toLowerCase();
        const tel = (l.telefone || "").replace(/\D/g, "");
        if (!nomeLead.includes(termo) && !tel.includes(termo.replace(/\D/g, ""))) {
          return false;
        }
      }
      return true;
    });
  }, [
    leads,
    etapa,
    origem,
    responsavel,
    tagId,
    busca,
    leadIdsByTag,
    periodo,
    dataInicio,
    dataFim,
  ]);

  const statusDoLead = (lead: LeadRow): "sem_telefone" | "bloqueado" | "elegivel" => {
    if (!formatPhoneForMeta(lead.telefone)) return "sem_telefone";
    const key = normalizePhoneForMatch(lead.telefone);
    if (key && activeKeys.has(key)) return "bloqueado";
    return "elegivel";
  };

  const marcados = useMemo(
    () => publico.filter((l) => !unchecked.has(l.id)),
    [publico, unchecked],
  );

  const elegiveis = useMemo(
    () => marcados.filter((l) => statusDoLead(l) === "elegivel"),
    [marcados, activeKeys],
  );

  const elegiveisParaEnvio = useMemo(
    () => (limite === "all" ? elegiveis : elegiveis.slice(0, Number(limite))),
    [elegiveis, limite],
  );

  const bloqueadosCount = useMemo(
    () => publico.filter((l) => statusDoLead(l) === "bloqueado").length,
    [publico, activeKeys],
  );

  const semTelefoneCount = useMemo(
    () => publico.filter((l) => statusDoLead(l) === "sem_telefone").length,
    [publico],
  );

  const totalPages = Math.max(1, Math.ceil(publico.length / pageSize));
  const paginaAtual = useMemo(
    () => publico.slice((page - 1) * pageSize, page * pageSize),
    [publico, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [etapa, origem, responsavel, tagId, busca, pageSize, periodo, dataInicio, dataFim]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const canSend =
    !!nome.trim() && !!selectedTemplate && elegiveisParaEnvio.length > 0 && !sending;

  const toggleLead = (id: string) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const paginaMarcados = paginaAtual.filter((l) => !unchecked.has(l.id)).length;

  const toggleAll = () => {
    const todosMarcados =
      paginaAtual.length > 0 && paginaMarcados === paginaAtual.length;
    setUnchecked((prev) => {
      const next = new Set(prev);
      for (const l of paginaAtual) {
        if (todosMarcados) next.add(l.id);
        else next.delete(l.id);
      }
      return next;
    });
  };

  const marcarTodosFiltro = () => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      for (const l of publico) next.delete(l.id);
      return next;
    });
  };

  const desmarcarTodosFiltro = () => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      for (const l of publico) next.add(l.id);
      return next;
    });
  };


  const executeSend = async () => {
    if (!selectedTemplate || !user?.id || !account) return;

    const { components, missingMedia, missingVars } =
      buildTemplateComponents(selectedTemplate);
    if (missingMedia) {
      toast.error(
        `Template "${selectedTemplate.name}" precisa de mídia no cabeçalho. Cadastre a URL em Configurações → WhatsApp → Templates.`,
      );
      return;
    }
    if (missingVars) {
      toast.error(
        `Template "${selectedTemplate.name}" tem variáveis no corpo sem valores de exemplo cadastrados.`,
      );
      return;
    }

    cancelRef.current = false;
    setSending(true);
    setProgress({ done: 0, total: elegiveisParaEnvio.length });

    const { data: campanha, error: campErr } = await (supabase as any)
      .from("campanhas")
      .insert({
        nome: nome.trim(),
        template_name: selectedTemplate.name,
        template_language: selectedTemplate.language || "pt_BR",
        criado_por: user.id,
        status: "enviando",
        total_publico: marcados.length,
        total_bloqueado: bloqueadosCount,
      })
      .select("id")
      .single();

    if (campErr || !campanha) {
      console.error("Erro ao criar campanha:", campErr);
      toast.error("Não foi possível criar a campanha.");
      setSending(false);
      return;
    }

    // Registra bloqueados e sem telefone para histórico
    const naoElegiveis = marcados
      .filter((l) => statusDoLead(l) !== "elegivel")
      .map((l) => ({
        campanha_id: campanha.id,
        lead_id: l.id,
        nome: l.nome_completo,
        telefone: l.telefone,
        responsavel_id: l.responsavel_id,
        status:
          statusDoLead(l) === "bloqueado"
            ? "bloqueado_conversa_ativa"
            : "sem_telefone",
      }));
    if (naoElegiveis.length > 0) {
      await (supabase as any).from("campanha_destinatarios").insert(naoElegiveis);
    }

    let sent = 0;
    let failed = 0;
    let interrompida = false;
    let motivoConta: string | null = null;

    const isErroDeConta = (msg: string) => {
      const m = msg.toLowerCase();
      return (
        m.includes("payment") ||
        m.includes("pagamento") ||
        m.includes("eligibility") ||
        m.includes("account has been restricted") ||
        m.includes("business account") ||
        m.includes("not configured") ||
        m.includes("access token")
      );
    };

    for (const lead of elegiveisParaEnvio) {
      if (cancelRef.current) {
        interrompida = true;
        break;
      }
      const phone = formatPhoneForMeta(lead.telefone);
      let metaMessageId: string | null = null;
      let erro: string | null = null;

      try {
        const { data: json, error } = await supabase.functions.invoke(
          "send-whatsapp-message",
          {
            body: {
              to: phone,
              type: "template",
              template_name: selectedTemplate.name,
              template_language: selectedTemplate.language || "pt_BR",
              template_components: components.length > 0 ? components : undefined,
            },
          },
        );

        if (error || (json as any)?.error) {
          failed += 1;
          erro = (json as any)?.error || error?.message || "Falha no envio";
        } else {
          sent += 1;
          metaMessageId =
            (json as any)?.messages?.[0]?.id ||
            (json as any)?.meta_message_id ||
            null;

          // Registra no chat para que apareça na conversa do assessor dono do lead
          await (supabase as any).from("chat_messages").insert({
            user_id: lead.responsavel_id || user.id,
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
      } catch (e) {
        failed += 1;
        erro = (e as Error).message;
      }

      await (supabase as any).from("campanha_destinatarios").insert({
        campanha_id: campanha.id,
        lead_id: lead.id,
        nome: lead.nome_completo,
        telefone: phone,
        responsavel_id: lead.responsavel_id,
        status: erro ? "falha" : "enviado",
        meta_message_id: metaMessageId,
        erro,
      });

      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    await (supabase as any)
      .from("campanhas")
      .update({
        status: "concluida",
        total_enviado: sent,
        total_falha: failed,
      })
      .eq("id", campanha.id);

    setSending(false);
    setConfirmOpen(false);
    setNome("");
    setTemplateId("");
    setUnchecked(new Set());
    setProgress({ done: 0, total: 0 });

    toast.success(
      `Campanha concluída: ${sent} enviado(s)${failed ? `, ${failed} falha(s)` : ""}${
        bloqueadosCount ? `, ${bloqueadosCount} bloqueado(s) por conversa ativa` : ""
      }.`,
    );
    onCampanhaCriada?.();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Nova campanha</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome da campanha</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Reativação agosto"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Template</label>
            <Select
              value={templateId}
              onValueChange={setTemplateId}
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
        </div>

        {selectedTemplate?.body && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
            {selectedTemplate.body}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="text-base font-semibold">Público</h2>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <div className="relative md:col-span-3 lg:col-span-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome ou telefone"
              className="pl-8"
            />
          </div>

          <Select value={etapa} onValueChange={setEtapa}>
            <SelectTrigger>
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etapas</SelectItem>
              {etapasNomes.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={origem} onValueChange={setOrigem}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {origens.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tagId} onValueChange={setTagId}>
            <SelectTrigger>
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.emoji ? `${t.emoji} ` : ""}
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={responsavel}
            onValueChange={setResponsavel}
            disabled={!podeBaseInteira}
          >
            <SelectTrigger>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              <SelectItem value="none">Sem responsável</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.nome_completo || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Período de criação</span>
          <PeriodoFilter
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            dataInicio={dataInicio}
            dataFim={dataFim}
            onDataInicioChange={setDataInicio}
            onDataFimChange={setDataFim}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Limite de envios</span>
            <Select value={limite} onValueChange={setLimite}>
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {[20, 50, 100, 500].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={marcarTodosFiltro}>
            Marcar todos do filtro
          </Button>
          <Button variant="outline" size="sm" onClick={desmarcarTodosFiltro}>
            Desmarcar todos
          </Button>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="font-medium">{publico.length}</span> no filtro
          </div>
          <div>
            <span className="font-medium text-primary">
              {elegiveisParaEnvio.length}
            </span>{" "}
            serão enviados{" "}
            {limite === "all"
              ? `(${elegiveis.length} elegíveis)`
              : `(limite ${limite} de ${elegiveis.length} elegíveis)`}
          </div>
          <div className="text-muted-foreground">
            {bloqueadosCount} em conversa ativa
          </div>
          <div className="text-muted-foreground">
            {semTelefoneCount} sem telefone
          </div>
        </div>


        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Leads com a janela de 24h da Meta aberta (em conversa com o assessor)
            são bloqueados automaticamente e nunca entram no disparo.
          </span>
        </div>

        <div className="max-h-[420px] overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="p-2 w-10">
                  <Checkbox
                    className="border-foreground/50 bg-background/50 dark:border-foreground/60"
                    checked={
                      paginaAtual.length > 0 &&
                      paginaMarcados === paginaAtual.length
                    }
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="p-2 text-left font-medium">Lead</th>
                <th className="p-2 text-left font-medium">Telefone</th>
                <th className="p-2 text-left font-medium">Responsável</th>
                <th className="p-2 text-left font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {loadingLeads && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Carregando leads...
                  </td>
                </tr>
              )}
              {!loadingLeads && publico.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Nenhum lead no filtro selecionado.
                  </td>
                </tr>
              )}
              {!loadingLeads &&
                paginaAtual.map((lead) => {
                  const st = statusDoLead(lead);
                  return (
                    <tr key={lead.id} className="border-t border-border">
                      <td className="p-2">
                        <Checkbox
                          className="border-foreground/50 bg-background/50 dark:border-foreground/60"
                          checked={!unchecked.has(lead.id)}
                          onCheckedChange={() => toggleLead(lead.id)}
                        />
                      </td>
                      <td className="p-2">{lead.nome_completo || "Sem nome"}</td>
                      <td className="p-2 text-muted-foreground">
                        {lead.telefone || "-"}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {lead.responsavel_id
                          ? usersMap[lead.responsavel_id]?.nome_completo || "—"
                          : "Sem responsável"}
                      </td>
                      <td className="p-2">
                        {st === "elegivel" && (
                          <Badge variant="secondary">Elegível</Badge>
                        )}
                        {st === "bloqueado" && (
                          <Badge variant="destructive">Conversa ativa</Badge>
                        )}
                        {st === "sem_telefone" && (
                          <Badge variant="outline">Sem telefone</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Itens por página</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100, 500].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span>
            {publico.length === 0
              ? "0 leads"
              : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(
                  page * pageSize,
                  publico.length,
                )} de ${publico.length}`}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span>
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>

        {sending && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Enviando {progress.done}/{progress.total}...
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Disparar para {elegiveisParaEnvio.length}

          </Button>
        </div>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar disparo da campanha</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>
                  A campanha <span className="font-semibold">{nome}</span> vai
                  enviar o template{" "}
                  <span className="font-semibold">{selectedTemplate?.name}</span>{" "}
                  para{" "}
                  <span className="font-semibold">
                    {elegiveisParaEnvio.length}
                  </span>{" "}

                  lead(s). Esta ação não pode ser desfeita.
                </div>
                {bloqueadosCount > 0 && (
                  <div className="text-xs">
                    {bloqueadosCount} lead(s) ficam de fora por estarem em
                    conversa ativa (janela de 24h aberta).
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeSend} disabled={sending}>
              {sending ? "Enviando..." : "Confirmar disparo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
