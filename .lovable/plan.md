## Diagnóstico

O erro da print vem do Supabase Realtime: `cannot add postgres_changes callbacks ... after subscribe()`.

Isso acontece quando o app tenta reaproveitar um canal Realtime que já está em processo de inscrição/inscrito e adiciona novos callbacks nele. No `/chat`, há dois pontos mais prováveis:

1. `useConversations` usa um nome fixo por usuário: `conversations-meta-${user.id}` e adiciona dois callbacks no mesmo canal.
2. `useChatMessages` usa `chat-${phone}-${user.id}`. Se a tela recarrega, troca conversa rápido, ou o cleanup anterior ainda não terminou, o Supabase pode devolver/reusar um canal ainda ativo e o app quebra a tela inteira pelo `ErrorBoundary`.

## Plano de correção

1. **Tornar os canais do chat únicos por montagem**
   - Ajustar `useConversations` para criar canal com sufixo único estável por montagem.
   - Ajustar `useChatMessages` para criar canal com sufixo único estável por montagem/conversa.
   - Manter o cleanup com `supabase.removeChannel(channel)`.

2. **Evitar que erro de Realtime derrube a tela**
   - Envolver a criação/subscrição dos canais em `try/catch`.
   - Se o Realtime falhar, o chat continua carregando por busca normal, em vez de mostrar “Algo deu errado”.

3. **Reduzir risco de loop/reinscrição desnecessária**
   - Remover dependências que não afetam o canal quando possível.
   - Manter callbacks estáveis já existentes (`fetchConversations`, `reconcile`) sem recriar canal mais vezes que o necessário.

4. **Validar no `/chat`**
   - Abrir `/chat` com conversa selecionada.
   - Confirmar que a tela não cai no ErrorBoundary.
   - Verificar console para garantir que o erro `cannot add postgres_changes callbacks` não aparece mais.

## Resultado esperado

Mesmo que o usuário deslogue, recarregue ou atualize várias vezes, o `/chat` não deve quebrar por conflito de canais Realtime. Se o Realtime falhar momentaneamente, a tela permanece utilizável e os dados ainda carregam via consultas normais.