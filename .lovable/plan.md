

# Adicionar filtro de período na exportação CSV

## Problema
Atualmente o botão "Exportar CSV" exporta todos os leads filtrados sem opção de filtrar por período/data. O usuário quer um seletor de período igual ao do dashboard (Hoje, Ontem, Últimos 7/15/30 dias, Personalizado).

## Solução

**Arquivo:** `src/pages/LeadsTable.tsx`

### 1. Trocar o botão direto por um Popover com seletor de período
Ao clicar em "Exportar CSV", abre um popover/dialog com:
- Select de período: Todos, Hoje, Ontem, Últimos 7 dias, Últimos 15 dias, Últimos 30 dias, Personalizado
- Campos de data (de/até) quando "Personalizado" for selecionado
- Botão "Exportar" para confirmar

### 2. Filtrar leads por período antes de exportar
Reutilizar a mesma lógica de filtragem por data que já existe no `DashboardCharts.tsx` (com `getLeadDate`, `subDays`, `isWithinInterval`), aplicando o período selecionado sobre `filteredAndSortedLeads` antes de passar para `exportToCSV`.

### 3. Estados adicionais
- `exportPeriod` (string): período selecionado
- `exportDateFrom` / `exportDateTo` (Date): datas customizadas
- `isExportPopoverOpen` (boolean): controle do popover

### Componentes utilizados
- `Popover` + `PopoverContent` (já importados no projeto)
- `Select` (já usado no dashboard)
- `Calendar` para datas customizadas
- `Button` para confirmar exportação

Alteração concentrada em ~60 linhas no `LeadsTable.tsx`, sem mudanças no `exportUtils.ts`.

