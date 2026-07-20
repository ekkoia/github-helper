## Problema
No `/chat`, ao clicar em enviar o input trava (`sending=true`) até a sequência inteira terminar: `functions.invoke('send-whatsapp-message')` → `chat_messages.insert()` → `onMessageSent()` (que refaz o fetch). Só depois o texto some do campo e a mensagem aparece na tela. Isso dá a sensação de "delay" — o usuário fica olhando o botão girando por 1–3s antes de qualquer feedback visual.

Ferramentas como WhatsApp Web resolvem isso com **UI otimista**: a mensagem aparece na conversa instantaneamente com um relógio ⏱ (pendente), o input é limpo na hora, e o envio real acontece em background. Se falhar, mostra um ícone de erro com opção "reenviar".

## Objetivo
Deixar o envio de texto, template, mídia e áudio com resposta visual **instantânea** (< 50ms), mantendo o envio real via Meta em background e reconciliando o status quando termina.

## Escopo (apenas UI/fluxo do chat — nenhuma mudança de banco, RLS, edge function ou lógica de negócio)

### 1. `src/hooks/useChatMessages.ts`
- Expor duas novas funções no retorno do hook:
  - `addOptimistic(msg)` — insere na lista local uma mensagem com `id` temporário (`temp-<uuid>`) e um campo extra `status: 'pending' | 'sent' | 'failed'`.
  - `updateOptimistic(tempId, patch)` — atualiza status/id da mensagem otimista (usado quando o insert real retorna, ou quando falha).
- Ajustar o handler Realtime de INSERT para **reconciliar**: se chegar uma mensagem cujo `phone + bot_message + created_at (~5s)` bate com uma pendente, substitui a otimista em vez de duplicar.

### 2. `src/components/chat/MessageBubble.tsx`
- Aceitar o campo opcional `status` e renderizar:
  - `pending` → ícone `Clock` cinza (equivalente ao ⏱ do WhatsApp)
  - `sent` → check simples (padrão atual)
  - `failed` → ícone vermelho `AlertCircle` + botão pequeno "Reenviar"
- Nenhuma mudança visual para mensagens sem `status` (inbound e histórico).

### 3. `src/components/chat/MetaChatInput.tsx`
Refatorar os 3 fluxos de envio (`sendTextMessage`, `sendTemplateMessage`, `sendRecordedAudio`) para o padrão otimista:

```text
handleSend():
  1. Monta objeto da mensagem (com temp-id, status='pending', created_at=now)
  2. addOptimistic(msg)              // UI aparece na hora
  3. Limpa input / anexo / gravação  // campo já vazio
  4. setSending(false)               // botão libera imediatamente
  5. Em background (fire-and-forget async):
     - invoke('send-whatsapp-message')
     - se ok → chat_messages.insert() → updateOptimistic(tempId, {status:'sent', id: realId})
     - se erro → updateOptimistic(tempId, {status:'failed'}) + toast
```

- Manter validação prévia (texto/arquivo vazio, janela 24h) igual.
- Manter o gate `sending` **apenas** para uploads de mídia grandes onde o botão precisa continuar desabilitado até o upload à Meta terminar (para não perder o arquivo em anexo). Para texto puro e template, o botão é liberado no ato.
- Remover o `onMessageSent()` como forma de refresh — a lista já está atualizada via `addOptimistic` + Realtime.

### 4. Reenvio em caso de falha
- Quando `status='failed'`, o `MessageBubble` exibe botão "Reenviar" que chama um `retryOptimistic(msg)` exposto pelo hook, que reexecuta o envio original a partir do payload guardado na própria mensagem otimista.

## Fora do escopo
- Nenhuma alteração em edge functions, tabelas, triggers, RLS ou webhook.
- Nenhuma mudança em `ConversationList`, `LeadInfoPanel` ou outros componentes.
- Nenhuma mudança na lógica de janela 24h, templates aprovados ou normalização de telefone.

## Resultado esperado
- Enviar texto: aparece na tela em < 50ms com ⏱, campo já limpo, botão já liberado para digitar a próxima. Check aparece 1–2s depois quando a Meta confirma.
- Enviar template: idem.
- Enviar mídia: preview aparece imediato com ⏱, botão fica desabilitado só durante o upload (necessário), demais interações continuam livres.
- Falha de rede: mensagem fica com ícone vermelho e botão "Reenviar" — nada se perde.
