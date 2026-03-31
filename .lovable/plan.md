

# Filtro de período na página /equipe

## O que será feito

Adicionar filtro de período (Hoje, Ontem, 7d, 15d, 30d, Personalizado) na página `/equipe`, filtrando os dados passados para `EquipeMetrics`, `EquipeTable` e `EquipeCharts`.

## Alterações

### `src/pages/Equipe.tsx`

1. Adicionar estados: `period` (`"30"` default), `customDateFrom`, `customDateTo`, `showCustomDates`
2. Adicionar função `getLeadDate()` (mesma lógica do `DashboardCharts` — prioriza `created_time_brasil`)
3. Adicionar `filteredLeads` via `useMemo` que filtra `leads` pelo período selecionado
4. Adicionar UI do filtro no header (Select + date pickers para modo personalizado) — mesmo padrão visual do `DashboardCharts`
5. Passar `filteredLeads` em vez de `leads` para `EquipeMetrics`, `EquipeTable`, `EquipeCharts` e `EquipeExport`

### Imports adicionais em Equipe.tsx

`useMemo` do React, `Select/SelectContent/SelectItem/SelectTrigger/SelectValue`, `Button`, `Calendar`, `Popover/PopoverContent/PopoverTrigger`, `CalendarIcon`, `format/subDays/startOfDay/endOfDay/isWithinInterval` do date-fns, `ptBR`, `cn`

### UI do filtro

Posicionado na linha do header, ao lado do botão de exportação:

```text
[Gestão de Equipe]                    [Select período] [date pickers se custom] [Exportar]
```

Nenhuma alteração nos componentes filhos — eles já recebem `leads` como prop e renderizam com base nos dados recebidos.

