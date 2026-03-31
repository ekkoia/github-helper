

# Notificações internas + Email via Resend para eventos da agenda

## O que será feito

Ao criar, editar ou excluir um evento da agenda, o sistema irá:
1. Criar uma **notificação interna no CRM** (sino de notificações) para o assessor responsável
2. Enviar um **email via Resend** para o assessor com os detalhes do evento

## Alterações

### 1. Nova Edge Function: `send-agenda-email/index.ts`
Edge Function dedicada para envio de emails de agenda via Resend (usando a mesma `RESEND_API_KEY` já configurada e o remetente `noreply@imaculada.online`).

Recebe: `to_email`, `nome_assessor`, `event_title`, `event_date`, `event_time`, `event_description`, `action` (created/updated/deleted).

Template HTML seguindo o mesmo estilo visual dos emails existentes (gradiente verde `#65a30d → #84cc16`, fonte Segoe UI, layout responsivo). O assunto e conteúdo variam conforme a ação:
- **Criado**: "Novo evento na sua agenda"
- **Atualizado**: "Evento atualizado na sua agenda"  
- **Excluído**: "Evento cancelado na sua agenda"

### 2. `src/hooks/useAgendaEvents.ts`
Após cada operação de CRUD bem-sucedida (`createEvent`, `updateEvent`, `deleteEvent`):
- Buscar o email e nome do assessor responsável na tabela `profiles` (pelo `user_id` do evento)
- Criar notificação interna via `supabase.from('notifications').insert(...)` com tipo adequado (`agenda_created`, `agenda_updated`, `agenda_deleted`)
- Invocar `send-agenda-email` via `supabase.functions.invoke()` para enviar o email

A notificação interna segue a RLS existente — o insert precisa ser feito para o `user_id` do evento. Como a policy de INSERT em `notifications` exige `is_admin`, vamos chamar a Edge Function para fazer o insert com service role.

### 3. Ajuste na Edge Function `send-agenda-email`
A Edge Function também criará a notificação interna usando o service role client, evitando problemas de RLS. Assim, com uma única chamada do frontend, ambos (email + notificação) são processados.

### 4. `src/components/NotificationsPopover.tsx`
Adicionar ícones e navegação para os novos tipos:
- `agenda_created` → ícone CalendarPlus verde
- `agenda_updated` → ícone CalendarClock azul
- `agenda_deleted` → ícone CalendarX vermelho
- Click → navega para `/agenda`

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/send-agenda-email/index.ts` | Criar |
| `src/hooks/useAgendaEvents.ts` | Editar (invocar Edge Function após CRUD) |
| `src/components/NotificationsPopover.tsx` | Editar (novos ícones de agenda) |

