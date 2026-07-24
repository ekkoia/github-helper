# Indicador de "por que não aparece como lida"

## Objetivo
Quando uma mensagem outbound estiver marcada como **entregue** (✓✓ cinza) e não avançar para **lida** (✓✓ azul), mostrar no chat uma explicação clara: o destinatário provavelmente tem "Confirmações de leitura" desativado no WhatsApp — não é falha do sistema. Se o lead já respondeu depois da mensagem, isso é evidência de que ele leu.

## Mudanças de UI (somente `src/components/chat/MessageBubble.tsx`)

1. **Tooltip enriquecido no ✓✓ (delivered)**
   - Ao passar o mouse no check duplo cinza, texto:
     > "Entregue no WhatsApp. O check azul (lida) só aparece se o destinatário tiver 'Confirmações de leitura' ativadas nas configurações de privacidade do WhatsApp dele."
   - Se existir uma resposta do lead posterior a essa mensagem, acrescenta:
     > "O lead respondeu depois desta mensagem, então foi lida."
   - Implementação: usar `<Tooltip>` do shadcn (já disponível no projeto) em vez de `aria-label` seco.

2. **Badge sutil "provavelmente lida"** (opcional, só na última mensagem outbound de cada bloco do assessor)
   - Quando o status for `delivered` e houver uma inbound do lead mais recente que essa mensagem, renderizar o ✓✓ em tom levemente mais claro com o mesmo tooltip acima. Sem alterar a cor azul (que continua reservada ao evento `read` real da Meta).

3. **Tooltip no ✓ (sent)** e no relógio (pending)
   - `sent`: "Enviada ao WhatsApp, aguardando confirmação de entrega."
   - `pending`: "Enviando..."
   - Apenas para consistência; não muda comportamento.

## Como saber se o lead respondeu depois
- A `MessageBubble` já recebe a mensagem individual. Para saber se há inbound posterior, o `ChatWindow` (pai) passa uma prop nova `hasLaterInbound: boolean` calculada uma vez por render, comparando `created_at` de cada outbound com o `created_at` da inbound mais recente da conversa. Custo O(n) em cima do array já ordenado.

## Fora de escopo
- Não alterar `delivery_status`, webhook, edge functions, nem forçar marcação como "lida" no banco. O check azul continua exclusivo para eventos `read` reais da Meta.
- Não mexer em envio, template, janela de 24h ou qualquer lógica de negócio.

## Arquivos afetados
- `src/components/chat/MessageBubble.tsx` — tooltips + leitura da nova prop.
- `src/components/chat/ChatWindow.tsx` — calcular `lastInboundAt` e passar `hasLaterInbound` para cada bubble outbound.

## Detalhes técnicos
- Usar `TooltipProvider` / `Tooltip` / `TooltipTrigger` / `TooltipContent` de `@/components/ui/tooltip`.
- Mensagem do tooltip em pt-BR, curta em duas linhas.
- Não mudar cores fora dos tokens do design system; manter `text-sky-300` só para `read` real.
