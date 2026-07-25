## Confirmação antes de enviar template

Hoje, ao selecionar um template no `MetaChatInput` e apertar o botão de enviar, ele dispara direto. No mobile isso é arriscado: o dedo pode tocar por engano no botão de envio enquanto a janela de 24h está aberta, mandando um template errado no meio da conversa.

### Solução

Adicionar um **dialog de confirmação** que abre antes do disparo do template, com preview do conteúdo e botões claros de "Cancelar" e "Enviar template".

### Comportamento

1. Ao clicar no botão de enviar template (ícone de avião no seletor de template), **não envia direto**.
2. Abre um `AlertDialog` (shadcn) com:
   - Título: "Enviar template?"
   - Nome do template selecionado
   - Preview do texto final (o mesmo preview que já é exibido abaixo do seletor hoje)
   - Aviso curto quando a janela de 24h está aberta: "A janela está ativa — você pode enviar mensagem livre em vez de template."
   - Botões: **Cancelar** (padrão, foco inicial) e **Enviar template** (destaque verde da marca).
3. Só ao confirmar é que a função atual de envio de template roda.
4. Cancelar apenas fecha o dialog, mantendo template selecionado e preview visíveis.
5. Enquanto o envio está em andamento, o botão de confirmar mostra estado de loading e fica desabilitado (evita duplo toque).

### Detalhes técnicos

- Arquivo único: `src/components/chat/MetaChatInput.tsx`.
- Adicionar um estado `confirmTemplateOpen` e mover a chamada atual de envio (`handleSendTemplate`) para dentro do `onConfirm` do dialog. O clique no botão de avião passa a só abrir o dialog.
- Usar `AlertDialog` de `@/components/ui/alert-dialog` (já presente no projeto shadcn) para bloquear interação de fundo — importante no mobile.
- Manter o comportamento de mensagem livre (texto normal) exatamente como está: sem confirmação, envio direto ao apertar o avião do input de texto.
- Nenhuma mudança de backend, edge function, banco ou lógica de janela de 24h.

### Fora do escopo

- Não mexer no fluxo de envio de mensagem livre.
- Não mexer em `send-whatsapp-message`, templates no banco, nem em preview de mídia.
- Não alterar o layout do input em si além de adicionar o dialog.
