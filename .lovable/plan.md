

# Adicionar gráfico de Leads por Origem ao Dashboard

## Situação atual
O dashboard tem 4 gráficos (Volume de Negociações, Funil de Conversão, Total Investido por Faixa, Leads por Faixa de Investimento) mas nenhum mostra a **origem/fonte** dos leads. O campo `origem` já existe na tabela `leads` e o array `origens` também. A página Analytics está vazia.

## Solução

Adicionar um **5o gráfico** no `DashboardCharts.tsx` que mostra a distribuição de leads por origem, permitindo metrificar de onde os leads estão vindo.

### Arquivo: `src/components/DashboardCharts.tsx`

1. **Novo `useMemo` para dados de origem** — agrupa `filteredLeads` pelo campo `origem`, mapeia os valores técnicos (ex: `instagram_ads`) para labels legíveis (ex: "Instagram Ads"), e conta a quantidade de cada.

2. **Novo gráfico de barras horizontais** — "Leads por Origem", posicionado após os 4 gráficos existentes, com `col-span-1 lg:col-span-2` para ocupar a largura total. Usa as mesmas cores e estilos dos gráficos existentes.

3. **Mapeamento de labels** — Reutiliza o mesmo mapeamento do `ORIGEM_OPTIONS` do `LeadForm.tsx`:
   - `instagram_ads` → Instagram Ads
   - `facebook_ads` → Facebook Ads
   - `whatsapp` → WhatsApp
   - `meta_form` → Formulário Meta
   - `campanha_mensagem` → Campanha de Mensagem
   - `indicacao` → Indicação
   - `site` → Site/Landing Page
   - Outros valores mostram o texto original

O gráfico já será filtrado pelo mesmo seletor de período existente no dashboard (Hoje, Ontem, 7/15/30 dias, Personalizado).

### Resultado
O usuário poderá ver quantos leads vieram de cada canal no período selecionado, possibilitando metrificar a performance de cada fonte de aquisição.

