

# Configurar antecedência do lembrete por evento

## Problema
Atualmente todos os lembretes são disparados 30 minutos antes, sem opção de personalização por evento.

## Solução

### 1. Migration SQL
Adicionar coluna `reminder_minutes` na tabela `agenda_events`:
```sql
ALTER TABLE agenda_events ADD COLUMN reminder_minutes integer DEFAULT 30;
```

### 2. `supabase/functions/agenda-reminders/index.ts`
Alterar a lógica de busca: em vez de um range fixo de 30 min, buscar todos os eventos com `reminder_sent = false` e `start_at` no futuro próximo (até 60 min), e filtrar comparando `start_at - reminder_minutes` com o momento atual. Na prática:

- Buscar eventos onde `reminder_sent = false`, `start_at` entre agora e agora + 60 min
- Para cada evento, calcular se `now >= start_at - reminder_minutes`
- Se sim, disparar notificação e marcar `reminder_sent = true`
- Ajustar a mensagem para usar o valor real de `reminder_minutes`

### 3. `src/hooks/useAgendaEvents.ts`
Adicionar `reminder_minutes` ao tipo `CreateEventData`.

### 4. `src/components/agenda/AgendaEventDialog.tsx`
Adicionar um `<Select>` com as opções:
- Sem lembrete
- 15 minutos antes
- 30 minutos antes (padrão)
- 1 hora antes

Estado `reminderMinutes` inicializado com `event?.reminder_minutes ?? 30`. Incluir no `data` enviado ao salvar.

## Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar `reminder_minutes` |
| `supabase/functions/agenda-reminders/index.ts` | Usar `reminder_minutes` por evento |
| `src/hooks/useAgendaEvents.ts` | Adicionar campo ao tipo |
| `src/components/agenda/AgendaEventDialog.tsx` | Adicionar select de antecedência |

