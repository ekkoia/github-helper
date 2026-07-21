## Diagnóstico

O webhook da Meta chegou normalmente para o Erickson (`554185386136`) às **14:28:45** com a resposta do botão "Continuar a conversa" (`type: "button"`). Está gravado em `whatsapp_webhook_events`. Porém dois problemas ocorreram:

### Problema 1 — Janela de 24h não abriu
A função `upsert_window_from_webhook` só lê `value.statuses[].conversation.expiration_timestamp` (que só chega em eventos **outbound** — sent/delivered). Ela **ignora** eventos `value.messages[]` (mensagens inbound do cliente). Ou seja, quando o cliente responde, a janela nunca é atualizada por essa função — só quando o CRM manda algo depois. Como o assessor tentou enviar antes de qualquer status novo chegar, a janela ficou desatualizada.

### Problema 2 — Mensagem do botão não apareceu no CRM
A inserção de mensagens inbound em `chat_messages` é feita pelo n8n (não pelo Supabase). O payload da resposta do template tem `type: "button"` com o texto em `button.text` / `button.payload`, e o fluxo do n8n provavelmente só trata `type: "text"`, então essa mensagem foi descartada silenciosamente.

## Plano

### 1. Corrigir `upsert_window_from_webhook` para abrir janela em toda mensagem inbound
Estender a função para percorrer também `value.messages[]`. Sempre que houver um `messages[]` com `from = <cliente>`, gravar/atualizar `whatsapp_conversation_windows` com `expires_at = timestamp da mensagem + 24h`. Fonte marcada como `'meta_inbound'`. Continua respeitando `GREATEST(expires_at, novo)` para não encurtar janela.

### 2. Garantir persistência da resposta inbound do template no `chat_messages`
Estender a função/trigger que popula mensagens (ou criar uma nova trigger em `whatsapp_webhook_events`) para inserir em `chat_messages` toda mensagem inbound de tipos `text` **e também** `button`, `interactive` (button_reply / list_reply), mapeando o texto assim:
- `button` → `button.text`
- `interactive.button_reply` → `button_reply.title`
- `interactive.list_reply` → `list_reply.title`

Sempre com `message_direction = 'inbound'`, `whatsapp_instance_name = 'meta_official'`, `meta_message_id` preenchido e deduplicando por `meta_message_id` (para não conflitar com o n8n caso ele também insira).

### 3. Backfill do caso do Erickson
Inserir manualmente a resposta "Continuar a conversa" de 14:28 em `chat_messages` e abrir a janela de 24h dele (expira 22/07 14:28) para que a Juliana consiga responder ainda hoje.

### Detalhes técnicos
- Alteração exclusivamente em SQL (função + trigger em `whatsapp_webhook_events`).
- Dedup por `meta_message_id` via `ON CONFLICT` ou `WHERE NOT EXISTS`.
- Nenhuma alteração no frontend.
- A proteção anterior ("só abrir janela com `meta_message_id`") continua válida — os inserts agora virão do webhook real.
