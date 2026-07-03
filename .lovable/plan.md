## Objetivo

Corrigir em `/chat`:
1. Nome do assessor não aparece acima de todos os leads atribuídos (só de alguns).
2. Assessor atribuído não vê a conversa até que o lead envie mensagem nova.

## Causa

Em `src/hooks/useConversations.ts`:
- O match entre `chat_messages.phone` e `leads.telefone` usa `slice(-8)`, o que falha quando um lado tem DDI `55` e o outro não, ou quando o `9` do celular está presente só de um lado.
- Para não-admin, o hook só considera mensagens onde `user_id = auth.uid()`. Ao atribuir um lead, o `user_id` das mensagens antigas não muda, então o assessor não vê a conversa até chegar uma nova mensagem com o `user_id` dele.

Nada é alterado no banco. O `55` continua salvo normalmente — a normalização acontece só em memória, apenas para comparar dois telefones.

## Alteração

Único arquivo: `src/hooks/useConversations.ts`

1. Nova função interna `normalizeForMatch(phone)`:
   - Deixa só dígitos.
   - Se tiver 12 ou 13 dígitos e começar com `55`, ignora o `55`.
   - Retorna os últimos 10 dígitos (tolera variação do 9º dígito).

2. Visibilidade para não-admin:
   - Buscar `leads` onde `responsavel_id = user.id` → conjunto de telefones normalizados.
   - Ao percorrer `chat_messages`, incluir a conversa se `user_id === user.id` **ou** se o telefone normalizado estiver no conjunto de leads atribuídos.

3. Match do nome do assessor (admin e não-admin):
   - Indexar `leads` por chave normalizada → `responsavel_id`.
   - Preencher `assessorName` a partir desse índice.

Comportamento do envio de mensagens, RLS, edge functions e demais telas: inalterado.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/useConversations.ts` | Reescrever fetch com normalização e inclusão de leads atribuídos |
