

# Registrar atividades da Agenda em /atividades

## O que será feito

Adicionar tipos de atividade para eventos da agenda (`agenda_created`, `agenda_updated`, `agenda_deleted`) e registrar no `user_activities` sempre que um evento for criado, editado ou excluído.

## Alterações

### 1. `src/hooks/useActivityLog.ts`
- Adicionar tipos: `'agenda_created' | 'agenda_updated' | 'agenda_deleted'` ao `ActivityType`
- Adicionar labels: `agenda_created: 'Evento criado'`, `agenda_updated: 'Evento atualizado'`, `agenda_deleted: 'Evento excluído'`
- Adicionar ícones: `agenda_created: '📅'`, `agenda_updated: '🔄'`, `agenda_deleted: '❌'`

### 2. `src/hooks/useAgendaEvents.ts`
- Importar e usar `useActivityLog`
- Após `createEvent` bem-sucedido: `logActivity('agenda_created', 'Evento criado: {title}', { event_title, start_at, user_id })`
- Após `updateEvent` bem-sucedido: `logActivity('agenda_updated', 'Evento atualizado: {title}', { event_id, event_title })`
- Após `deleteEvent` bem-sucedido: `logActivity('agenda_deleted', 'Evento excluído: {title}', { event_id, event_title })`

### 3. `src/components/atividades/AtividadesLista.tsx`
- Adicionar metadata labels: `event_title: "Título do evento"`, `event_id: "ID do evento"`, `start_at: "Data/hora início"`

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/useActivityLog.ts` | Adicionar 3 tipos + labels + ícones |
| `src/hooks/useAgendaEvents.ts` | Chamar `logActivity` após cada CRUD |
| `src/components/atividades/AtividadesLista.tsx` | Adicionar labels de metadata |

