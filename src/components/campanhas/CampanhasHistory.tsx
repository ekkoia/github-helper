import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  Campanha,
  CampanhaDestinatario,
  fetchDestinatarios,
} from "@/hooks/useCampanhas";
import { useUsers } from "@/hooks/useUsers";

const statusLabel: Record<string, string> = {
  enviado: "Enviado",
  falha: "Falha",
  bloqueado_conversa_ativa: "Bloqueado (conversa ativa)",
  sem_telefone: "Sem telefone",
};

const CampanhaRow = ({ campanha }: { campanha: Campanha }) => {
  const { usersMap } = useUsers();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [destinatarios, setDestinatarios] = useState<CampanhaDestinatario[]>([]);

  useEffect(() => {
    if (!open || destinatarios.length > 0) return;
    setLoading(true);
    fetchDestinatarios(campanha.id).then((rows) => {
      setDestinatarios(rows);
      setLoading(false);
    });
  }, [open, campanha.id, destinatarios.length]);

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
          <Badge variant="secondary">{campanha.total_enviado} enviados</Badge>
          {campanha.total_falha > 0 && (
            <Badge variant="destructive">{campanha.total_falha} falhas</Badge>
          )}
          {campanha.total_bloqueado > 0 && (
            <Badge variant="outline">{campanha.total_bloqueado} bloqueados</Badge>
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
                  <th className="p-2 text-left font-medium">Erro</th>
                </tr>
              </thead>
              <tbody>
                {destinatarios.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="p-2">{d.nome || "Sem nome"}</td>
                    <td className="p-2 text-muted-foreground">{d.telefone || "-"}</td>
                    <td className="p-2">{statusLabel[d.status] || d.status}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {d.erro || "-"}
                    </td>
                  </tr>
                ))}
                {destinatarios.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
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
  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
        Carregando campanhas...
      </div>
    );
  }

  if (campanhas.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhuma campanha criada ainda.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {campanhas.map((c) => (
        <CampanhaRow key={c.id} campanha={c} />
      ))}
    </div>
  );
};
