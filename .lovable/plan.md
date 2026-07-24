Corrigir dois pontos de UX que fazem a abertura de conversa em /chat parecer "carregando":

## 1) Rolagem "correndo" até a última mensagem
Arquivo: `src/components/chat/ChatWindow.tsx`

Causa: o `useEffect` faz `scrollIntoView({ behavior: "smooth" })` toda vez que `messages` muda — inclusive na primeira renderização da conversa, o que anima a rolagem por todas as bolhas.

Correção:
- Trocar o `useEffect` por `useLayoutEffect` que:
  - Se mudou o `phone` (conversa recém-aberta) → `scrollIntoView({ behavior: "auto" })` (instantâneo, sem animação).
  - Se só aumentou a quantidade de mensagens na mesma conversa → mantém `behavior: "smooth"` (mensagem nova chegando continua com animação suave).
- Guardar `phone` anterior e `messages.length` anterior em `useRef` para diferenciar os dois casos.

## 2) Loading spinner no lugar do input
Arquivo: `src/components/chat/MetaChatInput.tsx`

Causa: o componente começa com `loading = true` e renderiza um spinner no lugar de todo o input enquanto busca telefone canônico, templates, janela 24h e contagem de bloqueios de ecossistema. Isso deixa a área de digitação em branco por ~200–800 ms sempre que uma conversa é aberta.

Correção:
- Remover o bloco `if (loading) return <spinner>` (perto da linha 665).
- Renderizar `<Textarea>`, botão de emoji, anexo e enviar imediatamente, desde o primeiro frame.
- Manter o `loading` interno apenas como flag de "ainda carregando dados auxiliares", sem esconder a UI:
  - Templates aparecem no `<Select>` assim que chegam (populate incremental, já funciona).
  - Badge da janela 24h atualiza assim que `refreshWindow()` responde.
  - Aviso de "ecosystem engagement" aparece assim que a contagem retorna.
- Regras de negócio (envio bloqueado fora da janela 24h, templates só quando aprovados, validação da Edge Function) permanecem intactas — a Edge Function `send-whatsapp-message` já valida no servidor.

## Escopo
- Apenas 2 arquivos frontend, ~15 linhas no total.
- Sem mudanças em hooks, Edge Functions, banco, RLS, triggers ou lógica de janela/dedupe.
- Sem alterar nada em envio, templates, tags, filtros ou realtime.

## Resultado esperado
Abrir uma conversa em /chat passa a se comportar como no WhatsApp Web: as mensagens já aparecem posicionadas na última (sem animação de rolagem) e a barra de digitação está pronta desde o primeiro frame.