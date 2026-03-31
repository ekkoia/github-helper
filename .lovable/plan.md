

# Corrigir gráfico "Evolução do Pipeline" para respeitar filtro de período

## Problema
O gráfico "Evolução do Pipeline" está hardcoded para gerar sempre 30 dias de dados a partir da data atual (linhas 129-130), ignorando o filtro de período selecionado na página. Os `leads` já vêm filtrados, mas o eixo X do gráfico sempre mostra os últimos 30 dias fixos.

## Solução

### `src/components/equipe/EquipeCharts.tsx`

1. **Calcular range dinâmico** — Em vez de `days = 30`, derivar o intervalo de datas a partir dos próprios `leads` filtrados:
   - Se há leads, usar `min(data_criacao)` até hoje como range
   - Se não há leads, mostrar gráfico vazio

2. **Atualizar o `evolucaoData` useMemo** (~linha 128):
   - Calcular `startDate` = menor data entre os leads (ou hoje se vazio)
   - Calcular `endDate` = hoje
   - Gerar o `dateMap` dinamicamente entre `startDate` e `endDate`
   - Se o range > 90 dias, agrupar por semana para evitar eixo X poluído

3. **Atualizar o subtítulo** (linha 234):
   - Trocar `"Leads criados nos últimos 30 dias"` por `"Leads criados no período selecionado"`

Nenhum outro arquivo alterado. Os leads já chegam filtrados pelo período da página, o problema é apenas a geração do eixo X do gráfico.

