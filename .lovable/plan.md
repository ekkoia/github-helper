## Diagnóstico

Olhando os network requests do preview, **todas** as chamadas para `https://omilhfohvstqsonhyuxp.supabase.co` estão falhando com `Failed to fetch` — inclusive:

- `GET /rest/v1/profiles`, `/user_roles`, `/leads`, `/notifications`, `/funil_etapas`, `/user_preferences`
- `POST /rest/v1/user_activities` (log de logout — tenta várias vezes)
- `POST /auth/v1/logout?scope=global` ← **é essa que trava o logout**

Ou seja, o botão "Sair" **está executando corretamente** no código (`AuthContext.signOut → supabase.auth.signOut()`), mas a requisição HTTP para o Supabase não completa. Não é bug de código nosso — é o navegador não conseguindo alcançar o Supabase.

Causas mais prováveis (nessa ordem):

1. **Bloqueio de rede/CORS/extensão no navegador do usuário** — algum adblock, DNS, firewall corporativo ou VPN bloqueando `*.supabase.co`. Um `Failed to fetch` em 100% das chamadas Supabase é a assinatura clássica disso.
2. **Projeto Supabase pausado / com problema momentâneo** — se acontecer com todos os usuários ao mesmo tempo, é isso.
3. **Fluxo de logout travado esperando o `insert` em `user_activities`** — hoje o `signOut` faz `await supabase.from("user_activities").insert(...)` **antes** do `signOut()`. Como esse insert está pendurado com `Failed to fetch`, ele lança e o `catch` até limpa o estado local, mas o token continua no `localStorage` do Supabase e, se o `signOut` remoto também falhar, na próxima visita o `getSession()` reidrata o usuário — dando a sensação de "não deslogou".

## Plano de correção (código)

Deixar o logout **resiliente a falhas de rede**, para que mesmo com Supabase inacessível o usuário saia da aplicação:

### 1. `src/contexts/AuthContext.tsx` — tornar `signOut` à prova de falha
- Disparar o `insert` em `user_activities` como **fire-and-forget** (`.then().catch()`), sem `await`, para não bloquear.
- Chamar `supabase.auth.signOut({ scope: 'local' })` (só limpa sessão local, não exige round-trip global) e envolver em `try/catch` sem propagar erro.
- **Sempre** ao final: limpar `user`/`session` no state, apagar manualmente as chaves `sb-*-auth-token` do `localStorage` como fallback, e redirecionar para `/auth`.

### 2. `src/components/AppSidebar.tsx` — não engolir sucesso
- Como `signOut` agora nunca lança, remover o `toast.error` do catch (mantendo apenas o `toast.success`) e garantir `navigate('/auth')` explícito após o `await signOut()` em vez de depender só do `ProtectedRoute`.

### 3. Mensagem ao usuário (Andre/Kemily/etc.)
- Se o problema persistir **só para esse usuário**, é rede/extensão local: pedir para testar em aba anônima, sem VPN e sem adblock, e checar se `https://omilhfohvstqsonhyuxp.supabase.co/rest/v1/` abre no navegador dele.
- Se acontecer para **todos** ao mesmo tempo, checar status do projeto Supabase (pode ter sido pausado por inatividade/billing).

## Fora de escopo
Não vou mexer em RLS, triggers, edge functions, nem em nenhum outro fluxo — só no caminho de logout e no tratamento de erro do botão.

## Como validar
1. No preview, clicar em "Sair" com DevTools aberto: o usuário deve ir para `/auth` mesmo se a chamada `/auth/v1/logout` falhar.
2. Recarregar a página depois — não deve reidratar sessão (localStorage limpo).
