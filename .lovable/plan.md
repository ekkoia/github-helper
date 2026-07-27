Adicionar data no timestamp dos balões de mensagem em `/chat`, posicionando-a antes da hora (ex: `26 jul, 08:53`), seguindo o layout da referência do Chawoot.

### O que será alterado

1. **`src/components/chat/MessageBubble.tsx`**
   - Atualizar o helper `TIME` para uma função `formatDateTime(dateStr)`.
   - Comparar a data da mensagem com o dia atual no timezone `America/Sao_Paulo`.
   - Se for **hoje**: manter apenas a hora (`HH:mm`).
   - Se for **outro dia**: exibir `d MMM, HH:mm` antes da hora (ex: `26 jul, 08:53`).
   - Manter o timezone brasileiro e a posição do texto no rodapé do balão, antes da hora.

2. **Ajuste de props internas**
   - O componente `Bubble` já recebe `message`, então a função pode consumir `message.created_at` diretamente, sem mudar a interface pública.

### Formato da data

Por padrão usarei `pt-BR` (`26 jul, 08:53`), consistente com o restante do app. Se preferir manter exatamente o formato da referência (`Jul 26, 8:53 AM`), posso alterar o locale para `en-US` com AM/PM.