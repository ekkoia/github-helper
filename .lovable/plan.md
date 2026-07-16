
## Objetivo

Substituir a lógica atual (que deduz a janela de 24h olhando `chat_messages`) por uma tabela dedicada `whatsapp_conversation_windows` alimentada pelos eventos oficiais da Meta — evitando falsos positivos/negativos causados por webhook atrasado, filtro por últimos 8 dígitos ou mensagens vindas por outros canais.

## 1. Nova tabela `whatsapp_conversation_windows`

Uma linha por contato (número normalizado). Guarda o timestamp exato em que a janela expira e a fonte que atualizou.

Colunas principais:
- `phone_e164` (texto, PK) — número apenas com dígitos, com DDI
- `wa_id` (texto, opcional) — id do contato como recebido da Meta
- `expires_at` (timestamptz) — momento em que a janela fecha
- `last_inbound_at` (timestamptz) — último inbound conhecido
- `source` (texto) — `meta_status` (oficial) ou `inbound_message` (fallback)
- `meta_account_id` (uuid, FK opcional para `whatsapp_meta_accounts`)
- `updated_at`

RLS: leitura liberada para qualquer usuário autenticado; escrita apenas via `service_role` (triggers/edge).

## 2. Alimentação da tabela

Duas fontes, em ordem de prioridade:

**a) Trigger em `whatsapp_webhook_events` (fonte oficial)**

Quando o payload contém `entry[].changes[].value.statuses[].conversation.expiration_timestamp`, faz UPSERT usando esse `expiration_timestamp` (é o valor que a Meta usa internamente para cobrar/bloquear).

**b) Trigger em `chat_messages` (fallback)**

Quando um novo registro é inserido com `message_direction = 'inbound'` e `whatsapp_instance_name = 'meta_official'`, faz UPSERT com `expires_at = created_at + 24h`, mas somente se o `expires_at` atual for menor (nunca sobrescreve um valor oficial mais recente vindo do status).

Normalização do número em ambos os caminhos: `regexp_replace(phone, '[^0-9]', '', 'g')` para bater com o mesmo padrão da tabela.

## 3. Ajuste no `MetaChatInput.tsx`

Remove a query em `chat_messages` que deduz a janela e passa a consultar diretamente:

```
select expires_at
from whatsapp_conversation_windows
where phone_e164 = <numero_normalizado>
```

`isWithin24h = expires_at && expires_at > now()`.

Também expõe o `expires_at` na UI (ex.: "Janela aberta — expira em 3h 12min") para o usuário ter feedback claro.

## 4. Backfill inicial

Migração popula `whatsapp_conversation_windows` a partir do último inbound conhecido em `chat_messages` por número, para que a troca não deixe conversas ativas parecendo fechadas no dia da subida.

## 5. Fora de escopo

- Alterar o webhook externo (n8n / serviço fora do repo). A abordagem via trigger em `whatsapp_webhook_events` funciona sem tocar nele, desde que ele continue gravando o payload cru — que já é o comportamento atual (a tabela existe).
- Se depois for desejável, dá para migrar o webhook para uma edge function `meta-webhook` dentro do projeto e escrever direto na tabela sem depender de trigger.

## Detalhes técnicos

- Extração do `expiration_timestamp` no trigger: `jsonb_path_query_first(payload, '$.entry[*].changes[*].value.statuses[*].conversation.expiration_timestamp')` convertido de epoch (segundos) para `timestamptz`.
- Índice em `whatsapp_conversation_windows(phone_e164)` (implícito pela PK) e opcional em `expires_at` para consultas administrativas.
- Grants explícitos: `SELECT` para `authenticated`, `ALL` para `service_role`.
- Nenhuma mudança em `send-whatsapp-message` — o gate continua no cliente + regras da Meta no envio.
