## Objetivo

Permitir envio de templates aprovados também quando a janela de 24h está aberta, para o assessor agilizar respostas com mensagens prontas — hoje o seletor de templates só aparece quando a janela está fechada.

## Alteração

Arquivo: `src/components/chat/MetaChatInput.tsx`

Dentro do bloco `isWithin24h` (janela aberta), acrescentar um seletor de template compacto acima ou abaixo da linha de input, com o mesmo `Select` + botão "Enviar template" já existentes no bloco de janela fechada, reutilizando a função `sendTemplateMessage()` (que já existe e funciona).

Comportamento:
- Mantém intacto: texto livre, mídia, áudio, anexos.
- Adiciona: um bloco "Enviar template rápido" (colapsável/discreto) com `Select` dos templates aprovados + botão "Enviar template" + preview do corpo quando um template é selecionado.
- Reutiliza `templates`, `selectedTemplate`, `setSelectedTemplate` e `sendTemplateMessage` já existentes — nenhuma nova lógica de envio.
- No bloco de janela fechada, nada muda.

## O que NÃO será feito

- Nenhuma mudança em edge functions, banco, hooks ou lógica de envio.
- Nenhuma mudança visual no bloco "fora da janela de 24h".
