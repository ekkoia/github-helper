# Auditoria do /chat — o que encontrei e o que corrigir

Fiz uma auditoria de dados + código do chat. Existem 3 bugs silenciosos. A janela de 24h continua sendo aberta **somente** por inbound real da Meta (com `meta_message_id`) — mensagens do fluxo da IA usam outro número e servem apenas de contexto no chat.

## Achados (verificados no banco)

### 1. `message_direction` gravado com espaço à esquerda (` inbound`) — 3.383 linhas
As mensagens inseridas pelo fluxo externo/IA (n8n) chegam com `' inbound'` em vez de `'inbound'`, e sem `meta_message_id`/`meta_account_id`.
Volume: junho 58, julho 2.890, agosto (até hoje) 435 — **continua acontecendo**.

Consequências no front (classificação/exibição, não janela):
- `ChatWindow.tsx` e `ChatStatusSummary.tsx` usam comparação estrita (`=== "inbound"`); hoje se salvam pelo fallback (`user_message && !bot_message`), mas qualquer linha da IA que tenha os dois campos preenchidos é classificada como enviada pelo assessor — é o tipo de inconsistência que gera o relato do Davi ("a conversa da IA não apareceu / apareceu errado").
- O "último inbound" usado no resumo de status e nos checks pode ficar errado, dando a impressão de que o lead não respondeu.

### 2. Janela de 24h — comportamento atual está correto
`upsert_window_from_inbound` só abre janela com `message_direction` inbound + `meta_official` + `meta_message_id` preenchido. Isso é o desejado: a IA fala por outro número, então nada nesse plano altera essa regra. A janela abre quando o lead responde ao template pelo número oficial.

### 3. Mensagens inbound duplicadas
39 grupos / 128 linhas duplicadas nos últimos 30 dias (mesmo telefone, mesmo texto, no mesmo minuto) — webhook Meta + inserção n8n gravando o mesmo evento. Polui a conversa e distorce a leitura de "quem falou por último".

### 4. Criação automática de lead sem normalização de telefone
`create_lead_from_chat_message` compara só dígitos crus, enquanto o resto do sistema usa `telefone_key`/`normalize_telefone_br`. Um número com/sem o 9 gera **lead duplicado** em vez de reaproveitar o existente.


### O que está saudável
- Visibilidade: de 1.616 telefones com conversa, 1.614 casam com um lead pela regra estrita da RLS — o isolamento admin/assessor/SDR está consistente (2 telefones órfãos, sem lead).
- Entrega Meta: nos últimos 14 dias, 64 falhas de 2.183 envios (~3%), todas por motivo do lado da Meta ("Message undeliverable", limite de engajamento, experimento) — não é bug do CRM.
- Nenhum registro fora de `meta_official`; nenhuma perda visível de histórico.

## Correções propostas

1. **Normalizar direção na origem (banco):** trigger `BEFORE INSERT/UPDATE` em `chat_messages` aplicando `lower(trim(message_direction))`, mais backfill das 3.383 linhas existentes. Resolve a causa raiz sem depender do n8n. Não muda a regra da janela (que exige `meta_message_id`).
2. **Front defensivo:** normalizar a comparação de direção (`(d ?? "").trim().toLowerCase()`) em `ChatWindow.tsx` e `ChatStatusSummary.tsx`, para a mensagem da IA aparecer no lado correto e o "último inbound" ficar certo. Sem alterar layout, envio ou desbloqueio de janela.
3. **Deduplicação de inbound:** índice único parcial por `meta_message_id` + guarda na trigger para ignorar inbound idêntico (mesmo `phone_key` + texto) dentro de ~60s.
4. **Lead automático por `telefone_key`:** trocar a comparação crua por `phone_key`/`telefone_key` em `create_lead_from_chat_message`.

## Notas técnicas
- Itens 1, 3 e 4 são migrações SQL (triggers/funções + backfill), sem mudança de colunas.
- Item 2 é apenas comparação de string no front; nada de UI ou regra de negócio muda.
- A lógica de janela de 24h (`upsert_window_from_inbound`) fica **intacta**: só abre com inbound real da Meta.
- Nada aqui altera RLS, rodízio, disparo em massa ou envio para a Meta.
