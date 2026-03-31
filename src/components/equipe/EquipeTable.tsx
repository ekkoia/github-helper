import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";

interface EquipeTableProps {
  leads: any[];
  usersMap: Record<string, { user_id: string; nome_completo: string | null }>;
}

export const EquipeTable = ({ leads, usersMap }: EquipeTableProps) => {
  const { etapasNomes } = useFunilEtapas();

  // Pick top 4 stages by volume for column display
  const topEtapas = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const e = l.etapa_funil || "Sem etapa";
      counts[e] = (counts[e] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([nome]) => nome);
  }, [leads]);

  const rows = useMemo(() => {
    const byUser: Record<string, any[]> = {};
    leads.forEach(l => {
      const uid = l.responsavel_id || "__unassigned__";
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push(l);
    });

    return Object.entries(byUser)
      .map(([uid, userLeads]) => {
        const stageCounts: Record<string, number> = {};
        topEtapas.forEach(e => (stageCounts[e] = 0));
        let valorTotal = 0;

        userLeads.forEach(l => {
          const e = l.etapa_funil || "Sem etapa";
          if (stageCounts[e] !== undefined) stageCounts[e]++;
          valorTotal += parseFloat(l.valor_produto) || 0;
        });

        return {
          nome: uid === "__unassigned__"
            ? "Não atribuído"
            : usersMap[uid]?.nome_completo || "Usuário desconhecido",
          total: userLeads.length,
          stageCounts,
          valorTotal,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [leads, usersMap, topEtapas]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Carteira por Assessor
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Distribuição de leads por responsável
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessor</TableHead>
                <TableHead className="text-center">Total</TableHead>
                {topEtapas.map(e => (
                  <TableHead key={e} className="text-center whitespace-nowrap">
                    {e.length > 20 ? e.substring(0, 18) + "…" : e}
                  </TableHead>
                ))}
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.nome}>
                  <TableCell className="font-medium">{row.nome}</TableCell>
                  <TableCell className="text-center font-semibold">{row.total}</TableCell>
                  {topEtapas.map(e => (
                    <TableCell key={e} className="text-center">
                      {row.stageCounts[e] || 0}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">
                    R$ {row.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
