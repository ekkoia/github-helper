## Objetivo

Criar uma rede de segurança para garantir que nenhuma mensagem inbound / resposta de template fique fora do CRM, mesmo que o webhook da Meta falhe momentaneamente ou que apareça um payload novo que a trigger ainda não trate.

Como a Graph API do WhatsApp Cloud **não expõe endpoint para listar mensagens recebidas de um número**, o job não vai "buscar na Meta". Em vez disso, ele vai **reprocessar `whatsapp_webhook_events`** (que já grava todo payload bruto que a Meta manda) + **monitorar ausência de webhook**.

## O que será implementado

### 1. Reprocessador periódico (Edge Function `reconcile-whatsapp-webhooks`)
- Roda a cada 10 minutos via `pg_cron`.
- Percorre `whatsapp_webhook_events` das últimas 24h.
- Para cada evento, chama de novo a lógica de `insert_inbound_from_webhook` e `upsert_window_from_webhook` de forma idempotente (dedup por `meta_message_id`, já existe `IF EXISTS ... CONTINUE`).
- Registra em log quantas mensagens/janelas foram recuperadas em cada rodada.

### 2. Função SQL `reprocess_webhook_events(since timestamptz)`
- Encapsula o loop de reprocessamento acima em uma função `SECURITY DEFINER`.
- Facilita reexecução manual pelo admin (ex: "reprocessa últimos 7 dias") e é o que a Edge Function vai chamar.

### 3. Monitor de webhook parado
- Nova função SQL `check_webhook_health()` que verifica se `whatsapp_webhook_events` recebeu algum evento nos últimos X minutos (default 30) em horário comercial (08h–20h BRT, seg–sex).
- Se não recebeu, insere um alerta em `notifications` para admins/global.
- Roda a cada 15 minutos via `pg_cron`.

### 4. Backfill sob demanda ao abrir conversa (opcional, leve)
- No `useConversations` / `useChatMessages`, quando o usuário abre um chat cuja janela está aberta mas a última mensagem do CRM é anterior a `last_inbound_at` do `whatsapp_conversation_windows`, disparar uma chamada única ao reprocessador limitada àquele `phone_e164`.
- Isso resolve o caso "assessor abriu agora e ainda não veio a atualização automática do cron".

## Detalhes técnicos

- **Migração SQL**: cria `reprocess_webhook_events(since)` e `check_webhook_health()`; agenda dois jobs `pg_cron` (`reconcile-whatsapp-webhooks` a cada 10 min, `check_webhook_health` a cada 15 min).
- **Edge Function `reconcile-whatsapp-webhooks`**: sem auth (chamada pelo cron via `net.http_post` com anon key), apenas invoca `SELECT public.reprocess_webhook_events(now() - interval '24 hours')` e retorna contadores.
- **Idempotência**: garantida por `meta_message_id` (unique-check no insert) e por `GREATEST(expires_at, EXCLUDED.expires_at)` nas janelas — reprocessar 100x o mesmo evento não gera duplicata nem retrocede janela.
- **Sem alteração no frontend** na primeira fase; o item 4 (backfill sob demanda) fica como fase 2 se necessário.

## O que NÃO será feito (e por quê)

- **Buscar mensagens direto na Graph API**: não existe endpoint público para listar mensagens inbound por número. Não é viável.
- **Rate limiting custom**: sem primitivo pronto no stack; se necessário, tratamos separadamente.
