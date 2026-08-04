# Auditoria do /chat — o que encontrei e o que corrigir

Fiz uma auditoria de dados + código do chat. O sistema **não** está "tudo ok": existem 4 bugs silenciosos, e um deles explica exatamente o caso do Davi Lopes (conversa/IA e janela não aparecendo na hora de enviar).

## Achados (verificados no banco)

### 1. `message_direction` gravado com espaço à esquerda (` inbound`) — 3.383 linhas
As mensagens inseridas pelo fluxo externo/IA (n8n) chegam com `' inbound'` em vez de `'inbound'`, e sem `meta_message_id`/`meta_account_id`.
Volume: junho 58, julho 2.890, agosto (até hoje) 435 — **continua acontecendo**.

Consequências no front:
- `MetaChatInput.tsx` (realtime) descarta o evento com `row.message_direction !== "inbound"` → a janela de 24h **não destrava sozinha** quando o lead responde por esse fluxo. Precisa recarregar a página. É o sintoma que o gestor relatou.
- `ChatWindow.tsx` e `ChatStatusSummary.tsx` usam comparação estrita; hoje salvam-se pelo fallback (`user_message && !bot_message`), mas qualquer mensagem que tenha os dois campos é classificada errada (aparece como enviada pelo assessor).

### 2. Janela de 24h nunca abre para inbound sem `meta_message_id`
A trigger `upsert_window_from_inbound` exige `meta_message_id IS NOT NULL`. Como o fluxo IA/n8n não grava esse campo, o lead responde, a mensagem aparece no chat, mas o CRM continua mostrando janela fechada — o assessor acha que "o sistema travou".

### 3. Mensagens inbound duplicadas
39 grupos / 128 linhas duplicadas nos últimos 30 dias (mesmo telefone, mesmo texto, no mesmo minuto) — webhook Meta + inserção n8n gravando o mesmo evento. Polui a conversa e distorce a leitura de "quem falou por último".

### 4. Criação automática de lead sem normalização de telefone
`create_lead_from_chat_message` compara só dígitos crus, enquanto o resto do sistema usa `telefone_key`/`normalize_telefone_br`. Um número com/sem o 9 gera **lead duplicado** em vez de reaproveitar o existente.

### O que está saudável
- Visibilidade: de 1.616 telefones com conversa, 1.614 casam com um lead pela regra estrita da RLS — o isolamento admin/assessor/SDR está consistente (2 telefones órfãos, sem lead).
- Entrega Meta: nos últimos 14 dias, 64 falhas de 2.183 envios (~3%), todas por motivo do lado da Meta ("Message undeliverable", limite de engajamento, experimento) — não é bug do CRM.
- Nenhum registro fora de `meta_official`; nenhuma perda visível de histórico.

## Correções propostas

1. **Normalizar direção na origem (banco):** trigger `BEFORE INSERT/UPDATE` em `chat_messages` aplicando `lower(trim(message_direction))`, mais um backfill das 3.383 linhas existentes. Resolve a causa raiz sem depender do n8n.
2. **Abrir janela também para inbound sem `meta_message_id`:** ajustar `upsert_window_from_inbound` para exigir apenas direção inbound + `meta_official` + telefone (mantendo o `GREATEST` de expiração, sem encurtar janelas).
3. **Front defensivo:** normalizar a comparação de direção (`(d ?? "").trim().toLowerCase()`) em `MetaChatInput.tsx`, `ChatWindow.tsx` e `ChatStatusSummary.tsx` — sem alterar layout nem funcionalidade.
4. **Deduplicação de inbound:** índice único parcial por `meta_message_id` (já existe checagem) + guarda na trigger para ignorar inbound idêntico (mesmo `phone_key` + texto) dentro de ~60s.
5. **Lead automático por `telefone_key`:** trocar a comparação crua por `phone_key`/`telefone_key` em `create_lead_from_chat_message`.

## Notas técnicas
- Itens 1, 2, 4 e 5 são migrações SQL (triggers/funções + backfill), sem mudança de schema de colunas.
- Item 3 é apenas comparação de string no front; nada de UI ou regra de negócio muda.
- Nada aqui altera RLS, rodízio, disparo em massa ou envio para a Meta.
