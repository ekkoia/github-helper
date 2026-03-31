

# Corrigir ícones no dark mode + eventos não aparecendo na agenda

## Problemas identificados

### 1. Ícones de calendário/relógio nos inputs date/time
Os inputs nativos `type="date"` e `type="time"` usam ícones do sistema que ficam escuros no dark mode, sem contraste.

### 2. Evento criado mas não aparece no calendário
A rede mostra que o POST retornou 201 (sucesso), mas nenhum GET subsequente foi disparado. Causa: a tabela `agenda_events` **não foi adicionada à publicação `supabase_realtime`**, então o Realtime não funciona. Além disso, o hook depende exclusivamente do Realtime para refetch — não chama `fetchEvents()` após CRUD manual.

## Solução

### Migration SQL
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE agenda_events;
```

### `src/hooks/useAgendaEvents.ts`
Adicionar `await fetchEvents()` após cada operação CRUD bem-sucedida (createEvent, updateEvent, deleteEvent), como fallback caso o Realtime demore ou falhe.

### `src/components/agenda/AgendaEventDialog.tsx`
Adicionar CSS para os inputs date/time no dark mode usando a classe `dark:[color-scheme:dark]` no className dos `<Input type="date">` e `<Input type="time">`. Isso faz os ícones nativos do browser renderizarem em branco.

## Arquivos alterados
| Arquivo | Ação |
|---------|------|
| Migration SQL | Habilitar Realtime para `agenda_events` |
| `src/hooks/useAgendaEvents.ts` | Adicionar `fetchEvents()` após CRUD |
| `src/components/agenda/AgendaEventDialog.tsx` | Adicionar `dark:[color-scheme:dark]` nos inputs |

