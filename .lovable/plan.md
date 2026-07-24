# Detecção de versão antiga + reload automático

## Objetivo
Quando um novo build for publicado, abas antigas devem detectar e recarregar automaticamente — sem depender do usuário dar F5. Isso elimina de vez a classe de erros do tipo "aba com código antigo + dado novo do banco" (como o `startsWith is not a function` recorrente).

## Estratégia
Usar um arquivo de versão gerado no build (`/version.json`) que a aba consulta periodicamente. Se a versão mudar em relação à que ela carregou, ela recarrega.

Escolho `version.json` em vez do hash do `index.html` porque:
- É explícito e depurável (dá pra abrir no navegador e ver a versão atual).
- Não sofre problemas de cache do HTML.
- Fácil de forçar `Cache-Control: no-store`.

## Passos

**1. Gerar `public/version.json` em cada build**
- Adicionar um plugin Vite simples (em `vite.config.ts`) que, no hook `buildStart` / `closeBundle`, escreve `dist/version.json` com `{ "version": "<timestamp>", "commit": "<git-sha-curto-ou-timestamp>" }`.
- Em dev, servir uma versão fixa (ex.: `"dev"`) via `configureServer` para não ficar recarregando.

**2. Hook `useVersionCheck`**
- Novo arquivo `src/hooks/useVersionCheck.ts`.
- No mount, faz `fetch('/version.json', { cache: 'no-store' })` e guarda a versão como "versão da aba".
- Poll a cada 60s + também dispara a checagem quando `document.visibilitychange` volta para `visible` (aba estava em background).
- Se a versão do servidor for diferente da versão da aba: mostra um toast discreto ("Nova versão disponível, atualizando…") e chama `window.location.reload()` após ~2s. Também aceita `?force=1` para reload imediato.
- Ignora falhas de rede (offline não deve causar reload).

**3. Plugar o hook no app**
- Chamar `useVersionCheck()` uma única vez em `src/App.tsx` (dentro do provider raiz, junto do `Toaster`), para valer em todas as rotas.

**4. Cabeçalhos de cache**
- Garantir que `version.json` nunca seja cacheado: setar `Cache-Control: no-store` via `<meta>` no arquivo não resolve; então o plugin do passo 1 também injeta um header em dev, e em produção o próprio `fetch` já usa `cache: 'no-store'` — suficiente para o caso do Lovable hosting.

**5. Não interromper trabalho em andamento (proteção leve)**
- Antes de recarregar, verificar se há um input de mensagem com texto não enviado (`textarea` em `/chat` com valor). Se sim, adiar o reload por até 5 minutos e mostrar um botão "Atualizar agora" no toast. Isso evita perder mensagem sendo digitada.

## Detalhes técnicos

- `version.json` fica em `public/version.json` no dev (valor `"dev"` fixo) e é sobrescrito pelo plugin Vite no build de produção com `Date.now()`.
- O hook mantém a versão em `useRef` (não `useState`) para não re-renderizar o app inteiro a cada poll.
- Intervalo: 60s. Backoff: se 3 falhas seguidas de fetch, pausa por 5 min.
- Reload: `window.location.reload()` (sem argumento — browsers modernos já revalidam).

## Arquivos afetados
- `vite.config.ts` — adicionar plugin gerador de `version.json`.
- `public/version.json` — arquivo inicial com `{"version":"dev"}`.
- `src/hooks/useVersionCheck.ts` — novo hook.
- `src/App.tsx` — chamar o hook uma vez.

## Fora de escopo
- Service Worker / PWA update flow (mais complexo, não necessário aqui).
- Notificação intrusiva pedindo confirmação — o reload é automático, com apenas um toast informativo.
- Alterações em qualquer lógica de negócio, chat, leads, ou banco.
