import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2, StopCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Campanha,
  CampanhaDestinatario,
  CampanhaMetrics,
  DeliveryInfo,
  encerrarCampanha,
  fetchCampanhasMetrics,
  fetchDeliveryByMids,
  fetchDestinatarios,
} from "@/hooks/useCampanhas";
import { useUsers } from "@/hooks/useUsers";
import { PeriodoFilter } from "./PeriodoFilter";
import { ReenviarFalhas } from "./ReenviarFalhas";
import { getPeriodoRange, isWithinPeriodo, PeriodoValue } from "./dateFilter";


const statusLabel: Record<string, string> = {
  enviado: "Enviado",
  falha: "Falha",
  bloqueado_conversa_ativa: "Bloqueado (conversa ativa)",
  sem_telefone: "Sem telefone",
};

const entregaLabel: Record<string, string> = {
  sent: "Aguardando entrega",
  delivered: "Entregue",
  read: "Lido",
  played: "Lido",
  failed: "Falhou na Meta",
};

const motivoAmigavel = (reason: string | null) => {
  if (!reason) return null;
  const r = reason.toLowerCase();
  if (r.includes("payment") || r.includes("eligibility"))
    return "Problema de pagamento/elegibilidade da conta";
  if (r.includes("undeliverable")) return "Número não recebe WhatsApp";
  if (r.includes("ecosystem")) return "Bloqueado pela Meta (engajamento)";
  return reason;
};

const MetricTile = ({
  label,
  value,
  total,
  tone = "default",
}: {
  label: string;
  value: number;
  total?: number;
  tone?: "default" | "positive" | "negative";
}) => {
  const pct =
    total && total > 0 ? `${Math.round((value / total) * 100)}%` : null;
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          tone === "positive"
            ? "text-lg font-semibold text-primary"
            : tone === "negative"
              ? "text-lg font-semibold text-destructive"
              : "text-lg font-semibold text-foreground"
        }
      >
        {value}
        {pct && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {pct}
          </span>
        )}
      </div>
    </div>
  );
};

const CampanhaRow = ({
  campanha,
  metrics,
}: {
  campanha: Campanha;
  metrics?: CampanhaMetrics;
}) => {
  const { usersMap } = useUsers();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [destinatarios, setDestinatarios] = useState<CampanhaDestinatario[]>([]);
  const [entregas, setEntregas] = useState<Record<string, DeliveryInfo>>({});
  const [statusLocal, setStatusLocal] = useState(campanha.status);
  const [encerrando, setEncerrando] = useState(false);

  useEffect(() => {
    if (!open || destinatarios.length > 0) return;
    setLoading(true);
    fetchDestinatarios(campanha.id).then(async (rows) => {
      setDestinatarios(rows);
      const mids = rows
        .map((r) => r.meta_message_id)
        .filter(Boolean) as string[];
      if (mids.length > 0) setEntregas(await fetchDeliveryByMids(mids));
      setLoading(false);
    });
  }, [open, campanha.id, destinatarios.length]);

  const enviado = metrics?.enviado ?? campanha.total_enviado;

  // Campanha presa em "enviando": o loop roda no navegador, então se a aba
  // foi fechada ela nunca é marcada como concluída.
  const travada =
    statusLocal === "enviando" &&
    Date.now() - new Date(campanha.created_at).getTime() > 20 * 60 * 1000;

  const handleEncerrar = async () => {
    setEncerrando(true);
    const ok = await encerrarCampanha(campanha.id);
    setEncerrando(false);
    if (ok) {
      setStatusLocal("interrompida");
      toast.success("Campanha marcada como interrompida.");
    } else {
      toast.error("Não foi possível encerrar a campanha.");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{campanha.nome}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(campanha.created_at).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
            {campanha.template_name ? ` • ${campanha.template_name}` : ""}
            {campanha.criado_por
              ? ` • ${usersMap[campanha.criado_por]?.nome_completo || ""}`
              : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusLocal === "interrompida" && (
            <Badge variant="outline" className="border-destructive text-destructive">
              Interrompida
            </Badge>
          )}
          {statusLocal === "enviando" && (
            <Badge variant="outline">
              {travada ? "Interrompida (sem resposta)" : "Enviando..."}
            </Badge>
          )}
          <Badge variant="secondary">{enviado} enviados</Badge>
          {(metrics?.erro ?? campanha.total_falha) > 0 && (
            <Badge variant="destructive">
              {metrics?.erro ?? campanha.total_falha} erros
            </Badge>
          )}
          {(metrics?.bloqueado ?? campanha.total_bloqueado) > 0 && (
            <Badge variant="outline">
              {metrics?.bloqueado ?? campanha.total_bloqueado} bloqueados
            </Badge>
          )}
          <ReenviarFalhas campanha={campanha} onDone={() => setDestinatarios([])} />
          {travada && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={encerrando}
              onClick={handleEncerrar}
            >
              {encerrando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StopCircle className="h-3.5 w-3.5" />
              )}
              Encerrar campanha
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>


      {metrics && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <MetricTile label="Enviados" value={metrics.enviado} />
            <MetricTile
              label="Entregues"
              value={metrics.entregue}
              total={metrics.enviado}
            />
            <MetricTile
              label="Lidos (abertos)"
              value={metrics.lido}
              total={metrics.enviado}
              tone="positive"
            />
            <MetricTile label="Erros" value={metrics.erro} tone="negative" />
            <MetricTile label="Bloqueados" value={metrics.bloqueado} />
          </div>
          {metrics.semStatus > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {metrics.semStatus} envio(s) sem confirmação de entrega da Meta
              (registros antigos ou status ainda não recebido).
            </div>
          )}
        </>
      )}

      {open && (
        <div className="mt-3 max-h-72 overflow-auto rounded-md border border-border">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Carregando destinatários...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="p-2 text-left font-medium">Lead</th>
                  <th className="p-2 text-left font-medium">Telefone</th>
                  <th className="p-2 text-left font-medium">Status</th>
                  <th className="p-2 text-left font-medium">Entrega</th>
                  <th className="p-2 text-left font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {destinatarios.map((d) => {
                  const info = d.meta_message_id
                    ? entregas[d.meta_message_id]
                    : undefined;
                  const entrega = info?.delivery_status
                    ? entregaLabel[info.delivery_status] || info.delivery_status
                    : d.status === "enviado"
                      ? "Sem confirmação"
                      : "-";
                  const motivo =
                    motivoAmigavel(info?.failure_reason ?? null) || d.erro || "-";
                  const falhou =
                    info?.delivery_status === "failed" || d.status === "falha";
                  return (
                    <tr key={d.id} className="border-t border-border">
                      <td className="p-2">{d.nome || "Sem nome"}</td>
                      <td className="p-2 text-muted-foreground">
                        {d.telefone || "-"}
                      </td>
                      <td className="p-2">{statusLabel[d.status] || d.status}</td>
                      <td
                        className={
                          falhou ? "p-2 text-destructive" : "p-2 text-foreground"
                        }
                      >
                        {entrega}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {motivo}
                      </td>
                    </tr>
                  );
                })}
                {destinatarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      Nenhum destinatário registrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Card>
  );
};

export const CampanhasHistory = ({
  campanhas,
  loading,
}: {
  campanhas: Campanha[];
  loading: boolean;
}) => {
  const [periodo, setPeriodo] = useState<PeriodoValue>("all");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [metrics, setMetrics] = useState<Record<string, CampanhaMetrics>>({});

  const filtradas = useMemo(() => {
    const range = getPeriodoRange(periodo, dataInicio, dataFim);
    return campanhas.filter((c) => isWithinPeriodo(c.created_at, range));
  }, [campanhas, periodo, dataInicio, dataFim]);

  const ids = useMemo(() => filtradas.map((c) => c.id), [filtradas]);

  useEffect(() => {
    if (ids.length === 0) {
      setMetrics({});
      return;
    }
    let cancelled = false;
    fetchCampanhasMetrics(ids).then((res) => {
      if (!cancelled) setMetrics(res);
    });
    return () => {
      cancelled = true;
    };
  }, [ids.join(",")]);

  const totais = useMemo(() => {
    return Object.values(metrics).reduce(
      (acc, m) => ({
        enviado: acc.enviado + m.enviado,
        entregue: acc.entregue + m.entregue,
        lido: acc.lido + m.lido,
        erro: acc.erro + m.erro,
        bloqueado: acc.bloqueado + m.bloqueado,
      }),
      { enviado: 0, entregue: 0, lido: 0, erro: 0, bloqueado: 0 },
    );
  }, [metrics]);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
        Carregando campanhas...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Histórico de campanhas</h2>
        <PeriodoFilter
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          dataInicio={dataInicio}
          dataFim={dataFim}
          onDataInicioChange={setDataInicio}
          onDataFimChange={setDataFim}
        />
      </div>

      {filtradas.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <MetricTile label="Total enviado" value={totais.enviado} />
          <MetricTile
            label="Entregues"
            value={totais.entregue}
            total={totais.enviado}
          />
          <MetricTile
            label="Lidos (abertos)"
            value={totais.lido}
            total={totais.enviado}
            tone="positive"
          />
          <MetricTile label="Erros" value={totais.erro} tone="negative" />
          <MetricTile label="Bloqueados" value={totais.bloqueado} />
        </div>
      )}

      {filtradas.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {campanhas.length === 0
            ? "Nenhuma campanha criada ainda."
            : "Nenhuma campanha no período selecionado."}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((c) => (
            <CampanhaRow key={c.id} campanha={c} metrics={metrics[c.id]} />
          ))}
        </div>
      )}
    </div>
  );
};
