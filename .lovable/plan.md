## Plano corrigido para `/chat`

O ajuste anterior não resolveu porque ainda existe rolagem suave no `ChatWindow.tsx` quando a quantidade de mensagens aumenta, e a conversa troca de telefone mantendo o mesmo componente/hook montado. Isso permite renderizar estado antigo ou iniciar no topo antes de reposicionar no fim.

### O que vou alterar

1. **Eliminar a rolagem animada na abertura da conversa**
   - Remover o `scrollIntoView({ behavior: "smooth" })` do chat.
   - Usar o próprio container de mensagens com `scrollTop = scrollHeight`, sempre de forma instantânea.
   - Na troca de conversa, posicionar no fim antes do usuário ver a lista, evitando o efeito de “esteira”.

2. **Impedir reaproveitamento visual da conversa anterior**
   - Fazer o `ChatWindow` remontar ao trocar de telefone usando `key={selectedPhone}`.
   - Isso evita que mensagens da conversa anterior apareçam brevemente enquanto a nova conversa carrega.

3. **Remover spinner/estado de carregamento dentro da área de mensagens**
   - Não mostrar spinner no meio da conversa ao abrir um lead.
   - Enquanto busca as mensagens, a área fica estável; quando os dados chegam, já entram posicionados no final.

4. **Deixar a barra de envio estável imediatamente**
   - Passar para o `MetaChatInput` o estado inicial da janela de 24h vindo da conversa selecionada quando disponível.
   - Assim, se a lista já sabe que a janela está aberta, o campo de digitação aparece direto, sem piscar como “fora da janela” antes da consulta terminar.

5. **Preservar o comportamento esperado para novas mensagens**
   - Quando uma nova mensagem chegar e o usuário estiver no fim da conversa, o chat continua acompanhando o final.
   - Sem animação longa e sem rolar por todo o histórico.

### Arquivos envolvidos

- `src/components/chat/ChatPage.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MetaChatInput.tsx`
- Possivelmente `src/hooks/useChatMessages.ts`, apenas se for necessário limpar estado por telefone além do `key`.

### Resultado esperado

Ao clicar em uma conversa no `/chat`, a tela abre já no final da conversa, sem mostrar a rolagem passando por todas as mensagens e sem spinner na área de digitação.