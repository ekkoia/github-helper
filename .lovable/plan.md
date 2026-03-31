

# Replicar UI de exportação por período do /leads no /equipe

## O que será feito

Substituir o popover simples de exportação do `/equipe` (que só mostra CSV/XLSX) pelo mesmo popover completo do `/leads` com seleção de período, datas customizadas e formato.

## Alterações

### `src/components/equipe/EquipeExport.tsx`

Reescrever o componente para incluir:
- Estado: `exportPeriod`, `exportDateFrom`, `exportDateTo`, `exportFormat`, `isOpen`
- Select de período: Todos, Hoje, Ontem, 7/15/30 dias, Personalizado
- Calendários de data início/fim quando período = "custom"
- Select de formato: CSV / Excel (.xlsx)
- Botão "Exportar" com label dinâmico
- Filtro de leads por período usando `getLeadDate` (mesma lógica do `/leads` com `created_time_brasil` fallback)
- Imports: `Calendar`, `Select`, `format`, `subDays`, `startOfDay`, `endOfDay`, `isWithinInterval`, `ptBR`, `cn`

A lógica de filtragem por período será interna ao componente (recebe `leads` completos, filtra antes de exportar) — exatamente como funciona no `/leads`.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/equipe/EquipeExport.tsx` | Reescrever com UI de período |

