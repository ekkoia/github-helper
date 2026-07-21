## Diagnóstico

Nos logs de rede há duas requisições consecutivas ao abrir o chat do "gilsoares":
1. `chat_messages?...phone=like.%97152096` → retorna 2 mensagens.
2. `chat_messages?...phone=like.%97152096&user_id=eq.601...` → retorna `[]`.

Isso acontece porque em `src/hooks/useChatMessages.ts` o `fetchMessages` depende de `isAdmin` vindo de `useUserRole()`. O `useUserRole` inicia com `role=null` / `loading=true` e só depois resolve o papel real via Supabase. Como `isAdmin` começa `false` e depois vira `true` (ou vice-versa, dependendo da ordem de resolução), o efeito dispara **duas vezes** com filtros diferentes:

- Uma passa aplica o filtro fallback `user_id=eq.<meuId>` (não-admin, sem lead atribuído) → resposta vazia.
- Outra passa não aplica → resposta com mensagens.

Como a última resposta que chega é a que sobrescreve o estado, dependendo da ordem de retorno das duas queries o usuário vê "nenhuma mensagem". Ao fechar e reabrir o chat, o role já está resolvido e cache-quente da consulta correta, então aparece normal.

Também há o comportamento colateral: um fetch com resultado vazio de um estado transiente sobrescreve mensagens que já haviam sido carregadas com sucesso.

## Correção

Arquivo único: `src/hooks/useChatMessages.ts`

1. Importar `loading` (renomeado `roleLoading`) de `useUserRole` além de `isAdmin`.
2. No `fetchMessages`: se `roleLoading` for `true`, **não busca ainda** — apenas retorna. Isso elimina o fetch com `isAdmin` ainda incerto.
3. Incluir `roleLoading` nas dependências do `useCallback` para refetch assim que o papel resolver.
4. Proteção adicional na reconciliação de estado: quando o servidor retornar `serverMsgs` vazio, **preservar mensagens já existentes** em vez de sobrescrever por `[]`. Isso evita "piscar vazio" caso ainda haja alguma outra fonte de refetch concorrente.

Nenhuma alteração em componentes de UI, edge functions, banco ou realtime.

## O que NÃO será feito

- Nenhuma mudança em `ChatWindow`, `ConversationList`, RLS, edge functions ou schema.
- Nenhuma alteração no comportamento de admin/global — apenas evita o fetch prematuro antes do papel ser conhecido.
