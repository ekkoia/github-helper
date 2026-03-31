

# Página de Gestão de Equipe (/equipe)

## Visão geral

Transformar a página placeholder `/equipe` numa visão gerencial completa para admins, com métricas por assessor, gráficos de performance e exportação de dados.

## Estrutura de componentes

```text
src/pages/Equipe.tsx (página principal - reescrita)
├── src/components/equipe/EquipeMetrics.tsx      (cards de métricas)
├── src/components/equipe/EquipeCharts.tsx        (4 gráficos)
├── src/components/equipe/EquipeTable.tsx          (tabela carteira por assessor)
└── src/components/equipe/EquipeExport.tsx          (botão exportação)
```

## Dados necessários

Reutiliza `fetchAllLeads()` + `useUsers()` + `useFunilEtapas()` existentes. Sem alteração no banco.

## 1. EquipeMetrics — Cards de resumo (4 cards)

- **Total de Assessores Ativos** — count de users com leads atribuídos
- **Total de Leads na Carteira** — total de leads com responsável
- **Leads Sem Assessor** — leads com `responsavel_id = null`
- **Taxa de Conversão Geral** — % leads em etapas finais vs total

Segue o mesmo padrão visual de `DashboardMetrics.tsx`.

## 2. EquipeTable — Tabela de carteira por assessor

Tabela com colunas:
| Assessor | Total Leads | Lead Novo | Em Contato | Proposta | Convertido | Valor Total |

Cada linha = um assessor. Dados calculados agrupando leads por `responsavel_id`.

## 3. EquipeCharts — 4 gráficos (grid 2x2)

1. **Leads por Assessor** (BarChart vertical) — quantidade de leads por assessor
2. **Leads por Etapa por Assessor** (BarChart stacked) — distribuição de etapas por assessor
3. **Evolução do Pipeline** (AreaChart) — leads criados por dia nos últimos 30 dias, agrupados por assessor
4. **Taxa de Conversão por Assessor** (BarChart horizontal) — % de leads em etapas avançadas por assessor

Filtro de período idêntico ao do Dashboard (Hoje, Ontem, 7/15/30 dias, Personalizado).

Estilo visual: mesmos padrões de cores, tooltips, CartesianGrid, ResponsiveContainer do `DashboardCharts.tsx`.

## 4. EquipeExport — Exportação

Botão "Exportar" com Popover (CSV/XLSX), reutilizando `exportToCSV` e `exportToXLSX` de `exportUtils.ts`. Os dados exportados incluem todos os leads com o nome do assessor responsável, etapa, data, etc.

## 5. Equipe.tsx — Página principal

- Guarda proteção admin (`useUserRole`)
- Carrega leads via `fetchAllLeads()`, users via `useUsers()`
- Renderiza na ordem: header + export button, metrics, table, charts
- Filtro de período compartilhado entre charts e table

## Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/pages/Equipe.tsx` | Reescrever completamente |
| `src/components/equipe/EquipeMetrics.tsx` | Criar |
| `src/components/equipe/EquipeCharts.tsx` | Criar |
| `src/components/equipe/EquipeTable.tsx` | Criar |
| `src/components/equipe/EquipeExport.tsx` | Criar |

Sem migrações SQL. Sem novos hooks. Reutiliza infraestrutura existente.

