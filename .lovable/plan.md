

# Corrigir fuso horário nos eventos da agenda

## Problema

Ao criar/editar um evento com horário 09:00, o Supabase recebe `2026-04-04T09:00:00` **sem timezone**. A coluna é `timestamptz`, então o Supabase interpreta como UTC. Ao exibir, o browser converte UTC → horário local (Brasil = UTC-3), mostrando 06:00 ao invés de 09:00. Na edição, o mesmo problema faz o horário parecer não mudar.

## Solução

### `src/components/agenda/AgendaEventDialog.tsx`

Ao montar `startAt` e `endAt` no `handleSubmit`, usar `new Date(...)` para construir a data local e enviar como ISO string (que inclui o offset do timezone automaticamente):

```typescript
// Antes (sem timezone — Supabase trata como UTC):
const startAt = `${startDate}T${startTime}:00`;

// Depois (com timezone local):
const startAt = new Date(`${startDate}T${startTime}`).toISOString();
```

Isso faz `09:00` no Brasil gerar `2026-04-04T12:00:00.000Z` (UTC), que ao ser lido de volta converte corretamente para 09:00 local.

Mesma mudança para `endAt` e para o caso `allDay`.

### Apenas 1 arquivo alterado, ~4 linhas modificadas.

