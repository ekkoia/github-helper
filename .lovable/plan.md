
## Objetivo
Adicionar um painel-resumo compacto no topo da conversa em `/chat` que mostre, por contato, o status agregado das últimas mensagens: entregues, lidas, "leitura oculta por privacidade" e horário da última resposta recebida do lead.

## O que será exibido
Painel em linha, logo abaixo do cabeçalho do lead (acima da lista de mensagens), com 4 indicadores:

1. **Entregues** — total de mensagens outbound com status `delivered` ou `read` (últimos 30 dias).
2. **Lidas** — total com status `read`.
3. **Leitura oculta** — mensagens `delivered` para as quais existe pelo menos uma resposta inbound posterior, mas nunca receberam evento `read` da Meta. Sinaliza que o lead provavelmente desativou confirmação de leitura.
4. **Última resposta** — timestamp relativo da última mensagem inbound (`há 2h`, `ontem 14:30`), no fuso Brasil.

Extras leves:
- Badge "Janela 24h aberta / fechada" reaproveitando o dado que já vem de `whatsapp_conversation_windows`.
- Se houver mensagens `failed` recentes (7 dias), um chip vermelho com a contagem e tooltip explicando (reaproveita a lógica de erro 131049 / 131047 já existente).

## Onde entra
- Novo componente `src/components/chat/ChatStatusSummary.tsx`.
- Renderizado em `src/components/chat/ChatWindow.tsx`, entre o header do lead e a área de mensagens.
- Cálculo derivado das mensagens já carregadas em `useChatMessages` (mesma fonte que hoje alimenta `hasLaterInbound` no `MessageBubble`), sem nova query — mantém tudo em memória e atualiza junto com o Realtime existente.

## Detalhes técnicos
- Reutiliza `msg.status`, `msg.direction`, `msg.created_at` e `msg.error_code` já disponíveis em `chat_messages`.
- "Leitura oculta" = para cada outbound `delivered`, verifica se existe inbound com `created_at` maior; se sim e status nunca virou `read`, conta como leitura oculta. Cálculo memoizado com `useMemo`.
- Formatação de tempo com o helper de timezone Brasil já usado no `ChatWindow` (`created_time_brasil` pattern).
- Tooltips em cada indicador reaproveitando o `Tooltip` do shadcn, mesmo padrão já aplicado no `MessageBubble`.
- Estilo alinhado ao design system (tokens semânticos, sem cores hardcoded); no mobile, colapsa para uma linha com ícones + números, sem labels.

## Fora de escopo
- Nenhuma alteração em edge functions, banco, RLS, webhooks ou lógica de envio.
- Sem novos endpoints ou queries — só leitura do estado já carregado no cliente.
