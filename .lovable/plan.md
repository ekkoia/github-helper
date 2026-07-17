## Sintoma
Ao trocar de aba e voltar, o CRM mostra a viewport inteira em branco com o fundo verde do tema (sem sidebar, header ou conteúdo). Reprodutível em navegadores/redes diferentes → é código da aplicação, não ambiente.

## Diagnóstico (não confirmado 100% — 1º passo do plano é confirmar via console)

A tela fica totalmente vazia (nem sidebar aparece), então algo alto na árvore está retornando `null` ou o React está desmontando por erro sem `ErrorBoundary`. Suspeitos identificados na leitura do código:

1. **`AuthProvider` retorna `null` quando `loading` é true** (`src/contexts/AuthContext.tsx`). Quando a aba volta ao foco, o Supabase dispara `onAuthStateChange` (`TOKEN_REFRESHED` / `SIGNED_IN` com sessão restaurada) e o handler chama `setSession/setUser` com um **novo objeto de sessão a cada evento**. Isso não deveria remontar tudo, mas combinado com o item 2 causa cascata.

2. **`ProtectedRoute` re-dispara o efeito de checagem de perfil** toda vez que a referência de `user` muda. Se o `.select().maybeSingle()` retornar erro transitório (rede lenta ao acordar a aba, WS reconectando), `profileChecked` não é setado e a rota fica em `return null` — resultado: viewport verde vazia.

3. **Sem `ErrorBoundary` global.** Qualquer exceção não tratada em um hook (ex.: `useConversations` durante refetch com WS reconectando) desmonta a árvore inteira e sobra só o `body` verde.

4. **React Query com `refetchOnWindowFocus` default (`true`)** dispara refetch em massa ao voltar o foco, aumentando a chance de disparar 2/3.

## Plano

### 1. Confirmar a causa (antes de mexer)
- Abrir DevTools → Console e Network no CRM, deixar aberto, trocar de aba por 1–2 min, voltar.
- Registrar: se há exceção JS, se `onAuthStateChange` disparou, se alguma request Supabase falhou.
- Se possível, reproduzir no sandbox via Playwright simulando `visibilitychange`.

### 2. Blindar o `AuthProvider` (`src/contexts/AuthContext.tsx`)
- Nunca mais voltar a `loading = true` depois do primeiro carregamento (garantir com `initializedRef`).
- Não trocar o objeto `session/user` se o `user.id` e `access_token` forem iguais — evita re-render em cascata em cada `TOKEN_REFRESHED`.
- Remover o `if (loading) return null` e sempre renderizar `children` após a primeira carga; enquanto isso, mostrar um placeholder pequeno em vez de árvore vazia.

### 3. Blindar o `ProtectedRoute` (`src/components/ProtectedRoute.tsx`)
- Rodar a checagem de perfil **apenas uma vez por `user.id`** (usar `useRef` com o id já checado), não a cada troca de referência de `user`.
- Em caso de erro na query de `profiles`, **manter o `profileChecked` anterior** em vez de reverter para `null` (fail-open para não expulsar o usuário logado da tela).

### 4. Adicionar `ErrorBoundary` global (novo arquivo)
- Criar `src/components/ErrorBoundary.tsx` (class component simples) e envolvê-lo em volta de `<Routes>` no `src/App.tsx`.
- Em erro: renderizar um card com botão "Recarregar" e logar no console; nunca deixar a árvore inteira desmontar em branco.

### 5. Reduzir tempestade de refetch ao focar a aba
- No `QueryClient` (`src/App.tsx`), setar defaults:
  - `refetchOnWindowFocus: false`
  - `retry: 1`
- Isso não afeta os `useEffect` manuais que já existem; apenas as queries do React Query.

### 6. Verificar
- Após deploy do preview, repetir o teste (trocar de aba, esperar > 1 min, voltar) em `/chat`, `/dashboard` e `/leads`. Confirmar que a tela reaparece intacta.

## Escopo do que NÃO será tocado
- Nenhuma lógica de negócio, RLS, edge functions, webhooks, distribuição, Meta, chat, envio de mensagem, ou schema do banco.
- Nenhum hook de dados (`useConversations`, `useChatMessages`, `useLeads`, etc.) — só o encadeamento Auth/Route/Boundary.

## Detalhes técnicos (para revisão)

Arquivos alterados:
- `src/contexts/AuthContext.tsx` — comparação de sessão + remoção do `return null` global.
- `src/components/ProtectedRoute.tsx` — cache de `profileChecked` por `user.id` + fail-open.
- `src/components/ErrorBoundary.tsx` — novo.
- `src/App.tsx` — envolver `<Routes>` com `<ErrorBoundary>` e ajustar `QueryClient` defaults.
