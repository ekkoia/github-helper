## Objetivo
Substituir os marcadores textuais (`[audio]`, `[imagem]`, `[image]`, `[video]`, `[document]`, `[sticker]`) por uma representação visual estilo WhatsApp (ícone + rótulo em português) tanto no preview da lista de conversas quanto no balão de mensagem quando não houver mídia carregada.

## Escopo
Apenas frontend/apresentação. Nenhuma alteração no banco, triggers, edge functions ou lógica de envio.

## Mudanças

### 1. Novo helper `src/components/chat/mediaPreview.tsx`
Exporta:
- `detectMediaKind(text, media_type?)` → retorna `"audio" | "image" | "video" | "document" | "sticker" | null` reconhecendo:
  - `media_type` explícito da linha (prioridade)
  - Strings: `[audio]`, `[image]`, `[imagem]`, `[video]`, `[vídeo]`, `[document]`, `[documento]`, `[sticker]`, `[figurinha]` (case-insensitive, trim)
- `<MediaPreviewInline kind size?>` → renderiza `ícone + label` inline:
  - audio → `Mic` + "Áudio"
  - image → `Image` + "Foto"
  - video → `Video` + "Vídeo"
  - document → `FileText` + "Documento"
  - sticker → `Sticker` + "Figurinha"
- Ícones do `lucide-react`, tamanho `h-3.5 w-3.5`, cor herdada (`text-muted-foreground` no preview, `opacity-70` no balão).

### 2. `src/components/chat/ConversationList.tsx` (linha 93)
Substituir o parágrafo por:
```tsx
<div className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
  {(() => {
    const kind = detectMediaKind(conv.lastMessage);
    if (kind) return <MediaPreviewInline kind={kind} />;
    return <span className="truncate">{conv.lastMessage || "Mídia"}</span>;
  })()}
</div>
```

### 3. `src/components/chat/MessageBubble.tsx` (linhas 55–70)
- Ampliar a lista de placeholders detectados (incluir `[imagem]`, `[vídeo]`, `[documento]`, `[sticker]`, `[figurinha]`).
- Quando `!displayText && !message.media_url` e houver kind detectado, renderizar `<MediaPreviewInline>` em vez do `[media_type]` cru.

## Fora do escopo
- Não alterar o que o n8n grava (continua `[audio]` etc.).
- Não mexer em envio, upload, realtime, janelas de 24h, IA ou triggers.
- Não alterar `MediaContent` quando o `media_url` existe (renderização real permanece).
