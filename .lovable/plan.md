## Objetivo

Exibir, na lista de conversas (`/chat` — coluna esquerda), o preview de mensagens de documento no mesmo estilo do WhatsApp: ícone de documento seguido do nome do arquivo (ex.: `📄 2025_STREET.1_Campo Largo_Femi...`), em vez do genérico "Documento" atual.

## Escopo

Alteração apenas de apresentação. Não mexer em envio, upload, janela de 24h, realtime, dedup, nem em qualquer outra lógica.

## Mudanças

### 1. `src/hooks/useConversations.ts`
- Incluir `media_type` e `media_filename` no `select` de `chat_messages`.
- Estender a interface `Conversation` com dois campos opcionais:
  - `lastMediaType: string | null`
  - `lastMediaFilename: string | null`
- Ao montar cada conversa (última mensagem por telefone), preencher esses campos a partir da mensagem mais recente.

### 2. `src/components/chat/mediaPreview.tsx`
- Exportar uma variante do preview que aceita `filename` opcional. Quando `kind === "document"` e há `filename`, renderizar `ícone + nome do arquivo truncado` no lugar do rótulo genérico "Documento". Demais tipos permanecem como hoje.

### 3. `src/components/chat/ConversationList.tsx`
- Passar `conv.lastMediaType` e `conv.lastMediaFilename` para o preview.
- Prioridade de renderização do subtítulo (mantendo o comportamento atual para os outros casos):
  1. Se última mensagem é documento → ícone + nome do arquivo (fallback "Documento" se sem nome).
  2. Se é outro tipo de mídia (áudio/imagem/vídeo/sticker) → comportamento atual.
  3. Caso contrário → texto da última mensagem.

## Fora do escopo

- Balão de mensagem no chat (`MessageBubble`) já mostra o nome do documento; não será alterado.
- Nada em backend, banco, edge functions ou realtime.
