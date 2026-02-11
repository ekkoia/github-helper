
# Adicionar Filtros de Campanha, Origem e Data na Tabela de Leads

## Resumo
Adicionar tres novos filtros na barra lateral de filtros da pagina de leads: **Origem**, **Campanha** (buscada via join com `leadsNativo_feeagro`) e **Data** (usando a mesma logica de periodos do Dashboard).

## O que muda

### 1. Filtro por Origem
- Um select com as opcoes de origem ja mapeadas no sistema (Instagram Ads, Facebook Ads, WhatsApp, etc.)
- Filtra pelo campo `origem` da tabela `leads`

### 2. Filtro por Campanha
- Um select populado dinamicamente com os valores unicos de `adset_name` da tabela `leadsNativo_feeagro`
- O match sera feito via `meta_lead_id` (presente na tabela `leads`) ligado ao `id` da `leadsNativo_feeagro`
- Leads sem `meta_lead_id` (manuais) nao terao campanha associada

### 3. Filtro por Data
- Mesma logica do Dashboard: selector de periodo (Hoje, Ontem, 7 dias, 15 dias, 30 dias, Personalizado)
- Quando "Personalizado" for selecionado, exibe dois date pickers (de/ate)
- Usa `created_time_brasil` como prioridade, com fallback para `data_criacao`

---

## Detalhes Tecnicos

### Arquivos modificados

**`src/components/FiltersSidebar.tsx`**
- Adicionar props para os novos filtros: `origem`, `campanha`, `periodo`, `dataInicio`, `dataFim`
- Adicionar select de Origem com as opcoes do `ORIGEM_LABELS`
- Adicionar select de Campanha carregado via query ao Supabase (`leadsNativo_feeagro` distinct `adset_name`)
- Adicionar select de Periodo + date pickers condicionais (reutilizando a logica do `DashboardCharts`)

**`src/pages/LeadsTable.tsx`**
- Expandir o state `filters` para incluir `origem`, `campanha`, `periodo`, `dataInicio`, `dataFim`
- Buscar campanhas distintas da `leadsNativo_feeagro` e mapear `meta_lead_id` para `adset_name`
- Aplicar filtragem por origem no `filteredAndSortedLeads`
- Aplicar filtragem por campanha usando o mapa de `meta_lead_id` -> `adset_name`
- Aplicar filtragem por data usando a mesma funcao `getLeadDate` do Dashboard
- Atualizar `handleClearFilters` para resetar os novos campos

### Fluxo da filtragem por campanha

```text
1. Na montagem, buscar: SELECT DISTINCT adset_name FROM leadsNativo_feeagro
2. Buscar: SELECT id, adset_name FROM leadsNativo_feeagro (para montar mapa id -> campanha)
3. Ao filtrar, verificar: lead.meta_lead_id existe no mapa E mapa[meta_lead_id] === filtro selecionado
```

### Logica de data (reaproveitada do Dashboard)
- Opcoes: Hoje, Ontem, 7 dias, 15 dias, 30 dias, Todos, Personalizado
- Usa `date-fns` (subDays, startOfDay, endOfDay, isWithinInterval)
- Prioriza `created_time_brasil`, fallback para `data_criacao` ajustado UTC-3
