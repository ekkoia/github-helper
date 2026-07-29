### Melhorar mensagem de erro de permissão de microfone no `MetaChatInput`

## Objetivo
Quando o usuário nega a permissão de microfone no navegador/PWA (erro `Permission denied` vindo de `navigator.mediaDevices.getUserMedia`), o componente `MetaChatInput` deve exibir uma mensagem clara orientando a liberação nas permissões do site, em vez do texto genérico atual.

## Alteração proposta
1. No arquivo `src/components/chat/MetaChatInput.tsx`, no catch de `startRecording` (linhas 351-353), detectar se o erro é de permissão (`err.name === "NotAllowedError"`, `"Permission denied"` ou `PermissionDismissedError`).
2. Caso seja erro de permissão, exibir `toast.error` com instrução em português, por exemplo:
   > "Permissão de microfone negada. Libere o microfone nas permissões do navegador (ícone do cadeado ao lado da URL) e tente novamente."
3. Para outros erros, manter a mensagem atual genérica ou melhorar com contexto mínimo.

## Escopo
- Alteração apenas no frontend, no componente `MetaChatInput`.
- Não altera lógica de envio, gravação ou permissões reais.
- Mantém o restante do app inalterado.

## Validação
- Verificar se a mensagem aparece ao simular negação de permissão (localmente via dev tools ou em produção).
- Confirmar que erros de outro tipo continuam a mostrar mensagem apropriada.