
## Diagnóstico confirmado

Consultei as últimas mensagens do Jonas (+555381371601) na tabela `chat_messages`:

- Todas as linhas inbound do n8n vêm com `message_direction = ' inbound'` (com espaço à esquerda, `length = 8`).
- O trigger atual `upsert_window_from_inbound` compara com a string exata `'inbound'`, então **nenhuma dessas linhas atualiza `whatsapp_conversation_windows`** — por isso o chat aparece "Fora da janela de 24h" mesmo com o cliente respondendo várias vezes.
- Todas essas linhas também têm `meta_account_id = NULL` e vêm com `bot_message` preenchido pelo fluxo do n8n. Como você confirmou que esse número comercial **não** deveria ter IA, isso é um problema do lado do n8n (webhook Meta apontando para o fluxo errado / sem filtro por número). Não dá para corrigir isso pelo CRM — é ajuste no n8n. Aqui vou apenas garantir que o CRM se comporte corretamente com o que chega.

## O que vou mudar (somente o CRM)

### 1. Ajustar trigger `upsert_window_from_inbound`
- Aplicar `trim(lower(...))` na comparação de `message_direction` para aceitar `' inbound'`, `'inbound '`, `'Inbound'`, etc.
- Aplicar `trim(lower(...))` também em `whatsapp_instance_name`.
- Manter o resto da lógica intacta (mesmo cálculo de `expires_at = created_at + 24h`, mesmo upsert com `GREATEST`).

### 2. Backfill da janela do Jonas
Rodar um upsert único em `whatsapp_conversation_windows` para o telefone `555381371601` usando o `created_at` da última mensagem inbound dele (id 8345 → expira ~2026‑07‑18 17:47 UTC). Isso libera o envio de texto/mídia imediatamente, sem esperar nova mensagem.

### 3. (Opcional, se autorizar) Backfill geral
Rodar um `INSERT ... SELECT` que percorre `chat_messages` com `trim(lower(message_direction)) = 'inbound'` dos últimos 24h e reabre a janela para todos os contatos afetados pelo mesmo bug. Sem isso, cada contato só volta a ficar liberado quando mandar a próxima mensagem (que já vai disparar o trigger corrigido).

## O que NÃO vou mexer

- Nada relacionado à IA / `atendimento_ia` / `dados_cliente` — o problema da IA intervindo é do n8n, fora do CRM.
- Nada no fluxo de envio, templates, permissões, ou UI do `/chat`.
- Nada no trigger `upsert_window_from_webhook` (que continua sendo o caminho oficial via status da Meta).

## Me confirme antes de implementar

Quer que eu inclua o **passo 3 (backfill geral dos últimos 24h)** ou só o passo 2 (apenas o Jonas)?
