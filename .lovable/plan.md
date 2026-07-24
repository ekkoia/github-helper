# Emoji + Visual estilo WhatsApp na barra de mensagem

Escopo restrito ao componente `src/components/chat/MetaChatInput.tsx`. Nenhuma lógica de envio, template, áudio, upload, janela 24h ou otimista será alterada — apenas o wrapper visual e um novo botão de emoji.

## O que muda

**1. Emoji picker**
- Adicionar dependência `emoji-picker-react` (leve, sem backend, funciona offline).
- Novo botão smile ao lado do botão de anexo (`Paperclip`), abrindo um `Popover` (shadcn) com o picker.
- Ao selecionar, o emoji é inserido na posição atual do cursor do `Textarea` (usando `selectionStart/End`), mantendo o resto do texto intacto. Foco volta ao textarea.
- Picker respeita tema claro/escuro via prop `theme` lida do `ThemeContext`.

**2. Visual estilo WhatsApp (apenas CSS/estrutura JSX)**
- Barra inferior vira uma "pill" arredondada: fundo `bg-muted` (cinza claro / cinza escuro no dark), `rounded-full`, com padding interno. Botão de enviar fica separado, circular, verde (`bg-primary`) à direita — como no WhatsApp.
- Ordem dos controles dentro da pill: `[😊 emoji] [📎 anexo] [textarea sem borda, transparente] [🎤 mic]`. Botão enviar (círculo verde) fora da pill, à direita, aparece quando há texto/anexo/áudio; caso contrário mostra o mic (já existe hoje, só ajustar posição).
- Textarea: remover borda/background próprios (`border-0 bg-transparent focus-visible:ring-0`), placeholder "Digite uma mensagem".
- Botões viram `variant="ghost"` circulares, cor `text-muted-foreground`, hover suave.
- Selector de template e banners (fora janela 24h, aviso de bloqueio, preview de anexo, gravação de áudio) permanecem exatamente como estão — apenas a linha final de composição ganha o novo visual.

## Onde não vou mexer

- Nenhuma lógica de `handleSend`, `handleSendTemplate`, upload, `MediaRecorder`, verificação de janela 24h, otimismo, retry, permissões.
- Layout das mensagens no `ChatWindow`, `MessageBubble`, `ConversationList`.
- Tokens de cor globais em `index.css` (uso apenas classes semânticas existentes).

## Detalhes técnicos

- `bun add emoji-picker-react` (~1 dep, tree-shakeable).
- Import lazy opcional se peso incomodar; inicialmente import direto.
- Inserção do emoji:
  ```ts
  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setMessage(m => m + emoji); return; }
    const start = ta.selectionStart, end = ta.selectionEnd;
    setMessage(m => m.slice(0, start) + emoji + m.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };
  ```
- Se `textareaRef` ainda não existir no componente, adiciono um `useRef<HTMLTextAreaElement>` e ligo no `<Textarea>`.

## Verificação

- Build passa.
- Enviar texto simples, texto com emoji, template, anexo e áudio continuam funcionando (fluxos não tocados).
- Visual conferido no desktop e no mobile (o layout responsivo do /chat já existente é preservado).
