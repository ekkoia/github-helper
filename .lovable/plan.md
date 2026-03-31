

# Lembretes automáticos para eventos da agenda

## O que será feito

Criar uma Edge Function `agenda-reminders` que roda via pg_cron a cada 5 minutos, verifica eventos da agenda que começam nos próximos 30 minutos e cria uma notificação para o assessor responsável. Controle de duplicação via campo `reminder_sent` na tabela `agenda_events`.

## Alterações

### 1. Migration SQL

- Adicionar coluna `reminder_sent boolean DEFAULT false` na tabela `agenda_events`
- Criar índice em `(start_at, reminder_sent)` para queries eficientes

### 2. Nova Edge Function: `supabase/functions/agenda-reminders/index.ts`

- Busca eventos onde `reminder_sent = false` e `start_at` está entre agora e agora + 30 min
- Para cada evento, insere uma notificação na tabela `notifications` com:
  - `type: 'agenda_reminder'`
  - `title: '🔔 Evento em breve: {título}'`
  - `message: 'O evento "{título}" começa em X minutos.'`
  - `metadata: { event_id, lead_id }`
- Marca `reminder_sent = true` nos eventos processados
- Usa `SUPABASE_SERVICE_ROLE_KEY` (já configurado)

### 3. Cron job via SQL (insert tool, não migration)

Agendar a Edge Function para rodar a cada 5 minutos:
```sql
SELECT cron.schedule('agenda-reminders', '*/5 * * * *', ...);
```

### 4. `src/components/NotificationsPopover.tsx`

Adicionar ícone para o novo tipo `agenda_reminder`:
```typescript
case "agenda_reminder":
  return <CalendarDays className="h-4 w-4 text-emerald-500" />;
```

Ao clicar na notificação de tipo `agenda_reminder`, navegar para `/agenda`.

## Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar `reminder_sent` em `agenda_events` |
| `supabase/functions/agenda-reminders/index.ts` | Criar |
| SQL via insert tool | Criar cron job |
| `src/components/NotificationsPopover.tsx` | Adicionar ícone + navegação |

