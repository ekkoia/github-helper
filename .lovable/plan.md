# Implementar 3 melhorias para bloqueios da Meta ("ecosystem engagement")

Objetivo: dar visibilidade e evitar reenvios inúteis quando a Meta bloqueia templates por qualidade/engajamento.

## 1. Aviso na UI do lead antes de enviar template

Em `src/components/chat/MetaChatInput.tsx`:
- Ao carregar o chat de um telefone, consultar `chat_messages` das últimas 30 dias filtrando `phone` (normalizado), `message_direction='outbound'`, `delivery_status='failed'` e `failure_reason ILIKE '%ecosystem engagement%'`.
- Se houver **≥ 2 falhas** desse tipo, exibir um banner amarelo acima do input:
  > ⚠️ A Meta está bloqueando entregas para este contato por qualidade do ecossistema (N falhas nos últimos 30 dias). Evite reenviar templates — considere outro canal.
- Não bloquear o envio; apenas alertar. Assessor decide.

## 2. Métrica no Dashboard

Em `src/components/DashboardMetrics.tsx`:
- Adicionar novo card **"Templates bloqueados (7d)"** (`ShieldAlert` icon, cor destructive).
- Fetch dedicado (ou hook novo `useBlockedTemplates`) que faz `count` em `chat_messages` com:
  - `message_direction='outbound'`
  - `delivery_status='failed'`
  - `failure_reason ILIKE '%ecosystem engagement%'`
  - `created_at >= now() - 7 days`
- Como o dashboard hoje é filtrado por `leads`, a métrica é global (todas as mensagens do CRM) para admin; para não-admin, filtrar por `user_id = auth.uid()` (mesma lógica dos outros gráficos).
- Subtítulo: "Últimos 7 dias — qualidade do número".

Reordenar layout para caber 5 cards ou substituir "Taxa de Resposta IA" — proposta: manter 4 cards e trocar temporariamente `Lead Mais Valioso` não; melhor deixar em `grid ... lg:grid-cols-5` (o grid atual já usa `lg:grid-cols-4`, mudar para `xl:grid-cols-5`).

## 3. Skip automático no `weekend-leads-followup`

Em `supabase/functions/weekend-leads-followup/index.ts`, dentro do loop `for (const lead of leads)`:
- Antes de disparar, além do check de outbound existente, consultar `chat_messages` dos últimos 30 dias para o mesmo `phone` com `delivery_status='failed'` e `failure_reason ILIKE '%ecosystem engagement%'`.
- Se `count >= 2`: incrementar `skipped`, marcar `template_fds_enviado_em = now()` (para não tentar de novo), continuar.
- Log: `console.log('Skipped by ecosystem-block', lead.id)`.

## Detalhes técnicos

- Filtro SQL padronizado: `.eq('message_direction','outbound').eq('delivery_status','failed').ilike('failure_reason','%ecosystem engagement%').gte('created_at', <cutoff>)`.
- Nenhuma migration necessária — todos os campos já existem em `chat_messages` (`delivery_status`, `failure_reason`, `created_at`, `phone`, `message_direction`).
- Nenhum novo secret ou dependência.

## Fora de escopo
- Notificação/alerta em tempo real quando a qualidade do número Meta cai.
- Reprocessamento/reenvio automático para leads bloqueados.
- Sinal de bloqueio a partir de outras `failure_reason` (ex.: `131047` "re-engagement" — já é caso diferente e o comportamento atual já cobre).
