## Problema

Em `/chat`, o badge "Janela 24h aberta" e a liberação do input de texto livre em `MetaChatInput.tsx` só são calculados dentro do `useEffect` de inicialização (linhas ~166-192), que roda apenas quando `contactPhone` / `metaAccount.id` mudam. Quando o lead responde e a linha em `whatsapp_conversation_windows` é atualizada pelo webhook, o componente não escuta essa mudança — o assessor precisa trocar de conversa ou recarregar a página para ver a janela abrir.

## Objetivo

Assim que o webhook da Meta gravar a nova `expires_at` para o telefone da conversa aberta, o `MetaChatInput` (e o status derivado) deve recalcular sozinho, sem sair da conversa nem atualizar a página.

## Mudanças

Arquivo único: `src/components/chat/MetaChatInput.tsx`.

1. Extrair a lógica de "buscar janela" (linhas 170-192) do `init()` para uma função memoizada `refreshWindow()` que:
   - Reconstrói o set de `candidates` (mesmo número com/sem 9º dígito).
   - Consulta `whatsapp_conversation_windows` e atualiza `isWithin24h` / `windowExpiresAt`.
2. Chamar `refreshWindow()` dentro do `init()` (mantendo o comportamento atual no primeiro load).
3. Adicionar um `useEffect` de assinatura Realtime dedicado que:
   - Usa o helper existente `useRealtimeTable` (`src/hooks/useRealtimeTable.ts`) OU um `supabase.channel` com nome único (padrão `rt-window-<phone>-<random>`) na tabela `whatsapp_conversation_windows`, evento `*`.
   - No callback (debounced), chama `refreshWindow()`.
   - Faz cleanup com `removeChannel` no unmount / troca de telefone.
4. Como fallback (caso o webhook grave a mensagem inbound antes/sem tocar em `whatsapp_conversation_windows` naquele instante), adicionar também assinatura de `INSERT` em `chat_messages` filtrado pelo telefone da conversa e disparar `refreshWindow()` quando chegar uma mensagem inbound. Isso garante que o badge abra mesmo que exista latência entre gravação da mensagem e do registro da janela.

Nada em outros arquivos precisa mudar: `ChatWindow.tsx` já mostra a mensagem em tempo real via `useChatMessages`; `ConversationList` (bolinha verde na sidebar) já é atualizado via `useConversations` que reage à tabela `whatsapp_conversation_windows`. O gap é apenas no header/input da conversa aberta.

## Detalhes técnicos

- Manter os canais Realtime com nome único (sufixo `Date.now()+random`) para evitar o erro conhecido "cannot add postgres_changes after subscribe".
- Não alterar regras de negócio (permissões, formatos de telefone, envio de template): apenas refetch reativo do estado da janela.
- Nenhuma mudança em migrations, RLS ou Edge Functions.

## Verificação

Depois de aplicar: abrir uma conversa fora da janela, simular resposta do lead (webhook) e confirmar que:
- O badge muda para "Janela 24h aberta" sem refresh.
- O input de texto livre fica habilitado automaticamente.
- Ao expirar naturalmente (via nova gravação com expires_at no passado), o estado volta a "fora da janela".