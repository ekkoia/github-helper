## Diagnóstico

O erro **"Failed to execute 'insertBefore' on 'Node': The node before which..."** é um erro clássico de reconciliação do React. Ele ocorre quando algo modifica o DOM por fora do React e, quando o React tenta atualizar aquele trecho, não encontra mais o nó que esperava.

As causas conhecidas, em ordem de frequência:

1. **Tradução automática do navegador (Google Translate no Chrome)** — de longe a causa #1 desse erro específico. O Chrome envolve nós de texto em `<font>` e move-os, quebrando a reconciliação do React. Como a Andre está em português e o app está em português, é muito comum o Chrome oferecer traduzir para outro idioma ou ela ter acionado sem querer.
2. **Extensões de navegador** que injetam DOM (Grammarly, LanguageTool, tradutores de terceiros, etc.).
3. **Padrões de render condicional frágeis** — usar `condição && <div/>` onde `condição` pode virar `0`/`""`, ou misturar texto solto entre irmãos condicionais.

Como o erro só aparece para a Andre (não é generalizado) e nas duas ocorrências ela estava navegando normalmente, a hipótese #1/#2 é a mais provável. Ainda assim, vale blindar o app para não deixar a UI quebrar mesmo que isso aconteça.

## Plano

**1. Bloquear a tradução automática do navegador no app inteiro**
- No `index.html`, adicionar `<meta name="google" content="notranslate" />` no `<head>`.
- Adicionar `translate="no"` e `class="notranslate"` na tag `<html>`.
- Isso impede que Chrome/Edge/tradutores reescrevam o DOM do CRM (causa #1 do erro).

**2. Melhorar o ErrorBoundary para auto-recuperar**
- Em vez de exigir que a usuária clique em "Recarregar", detectar o erro específico de `insertBefore`/`removeChild` e:
  - Logar o erro (mantendo visibilidade no console).
  - Tentar re-renderizar automaticamente uma vez (reset de state) antes de mostrar a tela de erro.
- Se o erro persistir após o retry, aí sim mostra a tela atual com botão "Recarregar".
- Isso evita que a Andre fique presa na tela branca por um "solavanco" pontual causado por extensão.

**3. Adicionar orientação na tela de erro**
- Incluir uma dica curta na tela do ErrorBoundary: "Se o problema continuar, desative extensões do navegador (tradutores, Grammarly) e a tradução automática do Chrome nesta página."
- Ajuda o suporte a direcionar a Andre sem precisar de novo ticket.

**4. (Opcional — não implementar agora, só sinalizar)** 
- Não vou reescrever componentes do `/chat` "no escuro" procurando o padrão frágil, porque:
  - O erro não é reproduzível (não temos URL nem console dela).
  - Se fosse bug estrutural do código, apareceria para todos os usuários, não só para ela.
- Se depois da correção #1+#2 a Andre reportar de novo, o próximo passo será pedir print do console (com stack trace) e a URL exata para localizar o componente.

## Detalhes técnicos

**Arquivos a modificar:**
- `index.html` — meta `notranslate` + atributos no `<html>`.
- `src/components/ErrorBoundary.tsx` — adicionar contador de retry e detecção do erro de reconciliação para retentar 1x automaticamente.

**O que NÃO será alterado:**
- Nenhum componente de `/chat`, hooks, ou lógica de negócio.
- Nenhuma consulta a banco / RLS / Edge Function.
