# Auditoria do chat — revisão com dados reais

Você está certo sobre o ` inbound`: a exibição já está corrigida. O `MessageBubble` renderiza **dois balões** quando a linha tem `user_message` e `bot_message` juntos (formato legado n8n/IA) — e **100% das 3.383 linhas com espaço** estão nesse formato. Ou seja, a conversa da IA aparece do lado certo. Não é a causa do relato do Davi.

## O que realmente está errado (verificado no banco)

### 1. Causa provável do relato do Davi: lead sem responsável = chat vazio
- 1.943 leads estão com `responsavel_id` nulo, sendo **520** na etapa "Lead WhatsApp (não qualificado)" (criados automaticamente pela trigger a partir de mensagens).
- Para não-admin, `useChatMessages` só retorna mensagens se o telefone estiver na lista de leads atribuídos a ele; caso contrário faz `setMessages([])` **sem nenhum aviso na tela**. A RLS de `chat_messages` aplica a mesma regra.
- Resultado: se o assessor abre uma conversa cujo lead está sem responsável (ou é de outro assessor), ele vê o chat **em branco** — exatamente "a conversa da IA não apareceu". Ele não tem feedback nenhum explicando o motivo.

### 2. `message_direction` com espaço continua sendo gravado (não foi corrigido na origem)
- Não existe nenhuma trigger de normalização em `chat_messages`; a correção de 2 semanas atrás foi só no front (`MessageBubble` usa `.trim()`).
- Ainda entrando hoje: 19 linhas em 04/08, 94 em 03/08, 185 em 02/08 — última às 16:32 de hoje.
- Impacto residual (não é exibição): `ChatWindow` (cálculo do "último inbound", usado no ícone de mensagem não lida/visto) e `ChatStatusSummary` usam comparação estrita e a condição `user_message && !bot_message` — como essas linhas têm os dois campos, **elas são ignoradas na contagem de inbound**. O resumo pode dizer que o lead não respondeu quando respondeu via IA.

### 3. Duplicação de mensagens inbound
- 128 linhas duplicadas (mesmo telefone + mesmo texto no mesmo minuto) nos últimos 30 dias, por corrida entre webhook da Meta e inserção da IA. Não há índice único por `meta_message_id`.

### 4. Trigger de criação de lead usa telefone cru
- `create_lead_from_chat_message` compara `regexp_replace(telefone)` em vez de `telefone_key`. Hoje não há duplicidade em aberto (0 chaves duplicadas), porque a trigger de dedupe segura — mas a comparação errada pode criar lead novo sem responsável (alimentando o problema 1).

## Correções propostas

1. **Feedback quando o chat está bloqueado (front):** em vez de chat em branco, mostrar aviso claro — "Este lead não está atribuído a você / sem responsável — histórico não disponível" — com o nome do responsável quando houver. Sem afrouxar RLS nem permissões.
2. **Rotina/visão de leads sem responsável:** sinalizar no painel do chat quando a conversa não tem lead com responsável, para o gestor atribuir (usa o fluxo de atribuição já existente).
3. **Normalizar `message_direction` na origem:** trigger `BEFORE INSERT/UPDATE` em `chat_messages` com `lower(trim(...))` + backfill das linhas antigas.
4. **Front defensivo nas contagens:** normalizar direção e considerar linhas legado (com os dois campos) como tendo inbound, em `ChatWindow.tsx` e `ChatStatusSummary.tsx`.
5. **Deduplicação:** índice único parcial por `meta_message_id` (quando não nulo) + guarda na trigger para inbound idêntico dentro de ~60s.
6. **`create_lead_from_chat_message` por `telefone_key`** em vez de telefone cru.

## Notas técnicas
- Itens 3, 5 e 6 são migrações SQL (triggers/funções + backfill), sem alterar colunas.
- Itens 1, 2 e 4 são front (mensagem de estado e comparação de string) — sem mudar layout de envio.
- A janela de 24h (`upsert_window_from_inbound`) fica **intacta**: só abre com inbound real da Meta (`meta_message_id` + `meta_official`). Mensagens da IA continuam apenas como contexto.
- Nada aqui altera RLS de leitura, rodízio, disparo em massa ou envio para a Meta.
