
## Situação verificada no banco

Consultei o banco antes de propor qualquer correção:

- **Davi Lopes (lead pessoal)**: `id=d0e1e6b5…`, `telefone=5511951509764`, `telefone_key=1151509764`, `responsavel_id = Davi Lopes` (si mesmo). Tem **37 mensagens** em `chat_messages` (com 4 variações de formato de telefone: `+5511951509764`, `551151509764`, `5511951509764`, `5511951509764@s.whatsapp.net`).
- **Davis Areda**: `id=3f7caf55…`, `telefone=5521969005862`, `telefone_key=2169005862`, `responsavel_id = Giovanna Fernandes` (**correto no banco**). Histórico de atividades: foi para Gustavo em bulk_assign, depois atribuído para Giovanna em 28/07 17:04. **Nunca esteve com Davi Lopes.**
- Não existe nenhum outro lead cujo `telefone_key` colida com `2169005862` ou `1151509764`.

Ou seja: o banco está correto. Os dois problemas são **na lógica do cliente** em `src/hooks/useConversations.ts`.

## Diagnóstico dos bugs (não confirmado 100% — validar após investigar)

### Bug 1 — Davi Lopes não aparece na busca com filtro "Davi Lopes"

Hipótese principal: no `useConversations`, o `displayPhone` usado como chave do `map` é `leadPhoneByKey.get(matchKey) || normalizedPhone`. Para as mensagens antigas do Davi (`551151509764` sem o 9), `normalizedPhone = 551151509764`, mas o `leadPhoneByKey.get('1151509764') = 5511951509764` (canonical do lead). Isso deveria unificar.

Porém, as mensagens são iteradas em ordem `created_at DESC` — a **primeira mensagem** define a entrada no `map`. Se essa primeira mensagem for iterada **antes** do `leadPhoneByKey` estar populado (não é o caso — o mapa é populado antes do loop), tudo bem. Mas há outro ponto: o `assessorId` é definido apenas na criação da entrada; se o `matchKey` da primeira mensagem retornar `undefined` no `leadByKey` (por qualquer motivo — paginação de 2531 leads em 3 páginas com `.order data_criacao` + `.range`), a conversa fica com `assessorId=null` e é filtrada fora quando o usuário aplica filtro por assessor.

Precisa validar: acionar o `useConversations` no navegador da usuária e inspecionar o objeto `Conversation` do phone `5511951509764` — verificar se `assessorId` está setado corretamente.

### Bug 2 — Davis Areda aparecendo como atribuído a Davi Lopes

Como o banco confirma que **nunca** foi do Davi, o problema é de UI. Hipóteses a investigar:

1. **Cache do `ConversationList`** — o parâmetro `assessorName` passado em `onSelect(conv.phone, conv.name, conv.assessorName, conv.windowOpen)` pode ficar preso no state do `ChatPage` se a conversa foi selecionada num momento em que a leitura de `leads` ainda não tinha chegado, e o realtime não re-dispara `onSelect`.
2. **Paginação de `leads`** — `fetchLeadsForMatch` usa `.order("data_criacao", { ascending: false }).range()`. Com 2531 registros, se houver reordenação entre páginas (inserts concorrentes), um lead pode ser pulado, e `leadByKey.get('2169005862')` ficar `undefined`, caindo em `assessorName=null` — o que não bate com o report. Improvável.
3. **Estado remoto entre `ChatWindow` e `LeadInfoPanel`** — o painel direito busca o lead direto por telefone via `useLeadByPhone` (correto), mas o cabeçalho / sidebar usa o snapshot do `useConversations` da última recarga. Se a reatribuição para Giovanna (17:04) aconteceu depois do último fetch em um cliente aberto, o `assessorName` no sidebar ficaria com o valor antigo até a próxima subscrição realtime disparar. Mas o log mostra que **nunca foi do Davi** — então a UI só pode estar mostrando errado por bug de merge de estado. Precisa reproduzir.

## Ações — investigação primeiro

1. Adicionar log temporário em `useConversations.ts` (ou reproduzir com Playwright logado como admin) para capturar:
   - Quantos leads o `fetchLeadsForMatch` retornou (esperado: 2531).
   - Se `leadByKey.get('2169005862')` retorna Giovanna e `leadByKey.get('1151509764')` retorna Davi.
   - O `assessorId`/`assessorName` final das entradas dos dois phones.
2. Se `leadByKey` estiver correto e o UI ainda mostrar errado, o bug está no `ChatPage`/`ConversationList` (estado stale do `assessorName` passado para o header). Se estiver errado, é bug de paginação/normalização.

## Correções propostas (a aplicar após confirmar cada hipótese)

- **Se leadByKey estiver correto**: forçar o `ChatPage` a re-derivar `assessorName` sempre do objeto `Conversation` atual do array (via `conversations.find(c => c.phone === selectedPhone)`), em vez de manter um `useState<assessorName>` alimentado só no `onSelect`. Isso faz o header/sidebar refletir automaticamente qualquer mudança pelo realtime.
- **Se `assessorId` do lead do Davi vier `undefined`**: robustecer `useConversations` para:
  - Buscar leads em `.range()` **sem** `order` que possa mudar (usar `order("id")` estável), ou
  - Fazer uma segunda passada: para cada `matchKey` de conversa sem `assessorId`, buscar diretamente com `.eq("telefone_key", matchKey).maybeSingle()`.
- **Reforço em `ConversationList`**: no filtro por `assessorIds`, também aceitar match por `phone→lead responsavel_id` refetchado on-demand (fallback), para não perder conversas cujo `assessorId` ficou `null` por qualquer motivo.

## Escopo

- Somente `src/hooks/useConversations.ts`, `src/components/chat/ConversationList.tsx` e possivelmente `src/components/chat/ChatPage.tsx`.
- Sem alterações no banco. Sem mexer em outras funcionalidades (rodízio, disparo em massa, bloqueio de envio, dedup, etc.).

## Detalhes técnicos

- `normalizePhoneForMatch` está correto para os dois números (`5521969005862 → 2169005862`, `5511951509764 → 1151509764`).
- `leadByKey` é populado com `if (!leadByKey.has(key))` — não há colisão real no banco, então esse guarda não é a causa.
- O uso de `.order("data_criacao", { ascending: false }).range()` em `fetchLeadsForMatch` é o ponto mais frágil da paginação; trocar para `.order("id")` elimina risco de skip por reordenação.

Confirma que posso partir para a investigação (com logs/Playwright) e aplicar as correções na sequência acima?
