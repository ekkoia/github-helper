

# Sistema de Notificações Automáticas e Automação de Recontato

## Visão geral

Duas automações backend que rodam periodicamente via pg_cron + Edge Function:

1. **Alerta de lead sem contato (2h):** Leads na etapa "Lead novo!" há mais de 2 horas geram notificação no CRM para o assessor responsável (e para admins/gestora).
2. **Automação de recontato (24h):** Leads na etapa "Em contato comercial (assessor)." há mais de 24 horas são movidos automaticamente para "Provisório> recontato 24h".

## Arquitetura

```text
pg_cron (cada 5 min)
  └─> net.http_post → Edge Function "lead-automations"
        ├─ Query 1: leads em "Lead novo!" com data_criacao < now() - 2h
        │   └─ Insere notificação na tabela notifications
        │      (para responsavel_id + admins)
        ├─ Query 2: leads em "Em contato comercial (assessor)." 
        │   com data_atualizacao < now() - 24h
        │   └─ UPDATE etapa_funil → "Provisório> recontato 24h"
        │   └─ Insere notificação para o responsável
        └─ Responde 200 OK
```

## Alterações

### 1. Migração SQL — Tabela de controle + pg_cron

- Adicionar coluna `alerta_sem_contato_enviado` (boolean, default false) na tabela `leads` para evitar alertas duplicados
- Habilitar extensões `pg_cron` e `pg_net` (se não habilitadas)

### 2. Nova Edge Function: `supabase/functions/lead-automations/index.ts`

- Autenticação via service_role key
- **Alerta 2h:** Busca leads em "Lead novo!" com `data_criacao < now() - interval '2 hours'` e `alerta_sem_contato_enviado = false`. Para cada lead:
  - Insere notificação para o `responsavel_id` (se existir) e para todos os admins/globals
  - Marca `alerta_sem_contato_enviado = true`
- **Recontato 24h:** Busca leads em "Em contato comercial (assessor)." com `data_atualizacao < now() - interval '24 hours'`. Para cada lead:
  - Atualiza `etapa_funil` para "Provisório> recontato 24h"
  - Insere notificação para o responsável
  - Registra atividade em `user_activities`

### 3. Agendamento pg_cron

- Cron job a cada 5 minutos chamando a Edge Function via `net.http_post`

### 4. Sem alteração no frontend

- As notificações já aparecem no `NotificationsPopover` existente via realtime subscription
- Os leads movidos de etapa refletem automaticamente no Kanban/tabela ao recarregar

## Detalhes técnicos

### Nova coluna
```sql
ALTER TABLE leads ADD COLUMN alerta_sem_contato_enviado boolean DEFAULT false;
```

### Edge Function (resumo)
- Usa `createClient` com `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS
- Processa em batches de 100 leads
- Notificações com `type: 'lead_sem_contato'` e `type: 'lead_recontato'`
- Metadata inclui `lead_id` e `lead_nome` para navegação no popover

### Ícone no NotificationsPopover
- Adicionar ícone para `lead_sem_contato` (ex: `AlertCircle` em amarelo) e `lead_recontato` (ex: `Clock` em azul)

