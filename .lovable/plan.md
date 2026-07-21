## Objetivo

Fazer o sistema atualizar dados automaticamente, sem que o usuário precise dar F5. Foco nas telas mais usadas: **/leads**, **/kanban**, **/chat**, **/dashboard** e **/equipe**.

## Diagnóstico atual

Hoje o realtime só existe em `useChatMessages` (mensagens do chat aberto) e parcialmente em `useConversations` (janelas 24h). O resto do sistema busca dados uma única vez, no `useEffect` de montagem — por isso precisa de F5 para ver atualizações.

## O que será feito

### 1. Realtime nas telas de leads (`/leads`, `/kanban`, `/leads-table`)

Adicionar assinatura Supabase Realtime na tabela `leads` (INSERT / UPDATE / DELETE). Sempre que qualquer lead mudar (etapa do funil no Kanban, novo lead do webhook Meta, atribuição, edição), a lista atualiza sozinha na tela de todos os usuários abertos.

- Filtro respeitando papel (admin vê tudo, user vê só os seus).
- Debounce de 400ms para não re-renderizar em rajadas (import em massa).
- Habilitar `ALTER PUBLICATION supabase_realtime ADD TABLE public.leads` via migration.

### 2. Realtime na lista de conversas do `/chat`

Ampliar o `useConversations`:
- INSERT em `chat_messages` → move a conversa pro topo e atualiza a prévia sem precisar recarregar.
- UPDATE em `whatsapp_conversation_windows` → bolinha verde de janela 24h já reage (existente, garantir).
- UPDATE em `leads.responsavel_id` → nome do assessor aparece/some em tempo real.

### 3. Auto-refresh em `/dashboard` e `/equipe`

Métricas agregadas não fazem sentido em realtime puro (muito recálculo). Solução:
- **Polling leve a cada 60s** enquanto a aba está visível (usando `document.visibilityState` para pausar em aba oculta e evitar consumo).
- Botão manual de refresh continua disponível.

### 4. Notificações e sidebar

- `useNotifications` já pode ter realtime; garantir INSERT em `notifications` filtrado por `user_id`.
- Badge de contador atualiza sozinho.

## Detalhes técnicos

- Migration para adicionar `leads`, `chat_messages` (se ainda não estiver), `whatsapp_conversation_windows`, `notifications` à publication `supabase_realtime` e setar `REPLICA IDENTITY FULL` onde necessário.
- Um único canal por hook, nome único (`${entidade}-${user.id}-${random}`), sempre desinscrito no cleanup do `useEffect` (padrão já em uso).
- Sem alteração de UI/layout — apenas o comportamento.

## O que NÃO será feito

- Não vou tocar em `/agenda`, `/atividades`, `/analytics`, `/perfil`, `/usuarios`, `/configuracoes` neste ciclo. Se quiser expandir depois, é só pedir.
- Sem service worker / push notifications.
