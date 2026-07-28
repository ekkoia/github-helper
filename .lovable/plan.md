## Plano para resolver o SDR vendo chats de outros assessores

### Diagnóstico confirmado
- O Gustavo está com os papéis `user` e `sdr`.
- Hoje o banco permite que SDR visualize todos os leads em `leads`, por causa da liberação feita para o filtro de inatividade em `/leads`.
- O `/chat` usa essa mesma tabela `leads` para montar a lista de conversas. Como SDR agora enxerga todos os leads no banco, a lógica do chat acaba tratando conversas de outros assessores como elegíveis.
- Além disso, a busca do lead por telefone em alguns pontos usa apenas os últimos 8 dígitos, o que pode associar conversa ao lead errado ou deixar a identificação confusa.

### Correção proposta
1. **Separar a regra do chat da regra de leads**
   - Em `/chat`, para usuário não-admin, mostrar somente conversas cujo lead esteja atribuído ao próprio usuário.
   - SDR continua podendo ver todos os leads em `/leads` para filtro/atribuição, mas isso não deve liberar a visualização de chats de terceiros.

2. **Corrigir o matching por telefone no chat**
   - Usar a mesma normalização segura de telefone já usada no projeto para comparar conversas e leads.
   - Evitar depender só de `slice(-8)`, reduzindo risco de associar uma conversa ao lead errado.

3. **Ajustar os pontos afetados**
   - `useConversations.ts`: montar a lista de conversas usando todos os leads para identificação, mas aplicar a visibilidade final por `responsavel_id === usuário atual` para não-admin/SDR.
   - `useChatMessages.ts`: remover fallback que permite carregar mensagens apenas porque `chat_messages.user_id` é do SDR; para não-admin, só carregar se o lead for realmente dele.
   - `useLeadByPhone.ts`: buscar o lead do painel lateral com matching consistente, evitando mostrar dados de outro lead por coincidência de telefone.

4. **Manter o comportamento dos admins**
   - Admin/global continuam vendo todos os chats e o nome do assessor acima do lead.
   - SDR/usuário comum não veem nome de assessor porque só devem ver conversas próprias.

5. **Validação**
   - Conferir no banco com o usuário Gustavo que conversas como Jorge/Fabio/Rogerio só aparecem se o lead estiver atribuído a ele.
   - Conferir que uma conversa atribuída a Davi/Giovanna não entra na lista do Gustavo.
   - Conferir que leads atribuídos ao Gustavo continuam aparecendo no `/chat` normalmente.