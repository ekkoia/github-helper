
## Problema

A bolinha verde na lista de conversas hoje é calculada como `unread = !!msg.user_message` da linha mais recente de `chat_messages` — ou seja, "a última mensagem gravada é inbound", não "a janela de 24h está aberta". Isso gera:

- Conversas com janela aberta mas **sem** bolinha (última linha é outbound do bot/humano).
- Conversas **com** bolinha mas fora da janela (última linha inbound tem >24h).

## Solução

Usar a mesma fonte da verdade que o `MetaChatInput` já consome: `whatsapp_conversation_windows.expires_at`.

### 1. `src/hooks/useConversations.ts`
- Buscar todas as linhas de `whatsapp_conversation_windows` (`phone_e164, expires_at`) em paralelo com a query de mensagens.
- Montar `Map<phone_e164, Date>` das expirações.
- Renomear o campo `unread` da interface `Conversation` para `windowOpen`, calculado como `expires_at != null && expires_at > now()`. O match usa o telefone já normalizado para só dígitos, mesma regra dos triggers.

### 2. `src/components/chat/ConversationList.tsx`
- Trocar a checagem `conv.unread` por `conv.windowOpen` ao renderizar a bolinha verde.
- Adicionar `title="Janela de 24h aberta"` para explicitar o significado.

### 3. Reatividade
- Manter o canal Realtime atual (INSERT em `chat_messages`).
- Adicionar segundo canal para INSERT/UPDATE em `whatsapp_conversation_windows`, para que atualizações vindas do webhook oficial (status da Meta) atualizem a bolinha mesmo sem novo `chat_messages`.

### Fora de escopo
- Sem mudanças em `MetaChatInput`, schema ou triggers.
