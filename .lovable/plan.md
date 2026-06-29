## Objetivo
Corrigir o fluxo do convite para que, ao clicar em "Criar Minha Senha" no email, o usuário sempre caia em `/set-password` — e nunca direto no sistema sem ter definido a senha.

## Causa raiz
1. O Supabase só respeita o `redirect_to` do link de convite se a URL estiver em **Allowed Redirect URLs**. Caso contrário, faz fallback para a **Site URL** (a home), e o `ProtectedRoute` deixa entrar porque a sessão já foi criada.
2. Não existe nenhuma proteção no frontend que force convidados sem senha definida a ir para `/set-password`.

## Mudanças

### 1. Ação manual no Supabase (fora do código — eu te aviso passo a passo)
- Em **Authentication → URL Configuration → Redirect URLs**, adicionar:
  - `https://crm.imaculada.online/set-password`
  - `https://crm.imaculada.online/**` (curinga, recomendado)
  - Domínios de preview Lovable se forem usados para testar convites.

Isso por si só já resolve o redirecionamento direto.

### 2. Backup no código: detectar "convite consumido sem perfil" e forçar `/set-password`
Como o `invite-user` cria um `pending_invites` ANTES do `generateLink`, o trigger `handle_new_user` NÃO cria o profile do convidado. Ou seja: **um usuário com sessão ativa mas sem `profiles` é, com alta probabilidade, um convidado que ainda não definiu senha**.

Vou aproveitar isso para criar um guard:

- **`src/components/ProtectedRoute.tsx`**: após confirmar `user`, fazer uma checagem rápida em `profiles` por `user_id`. Se não existir profile → `navigate('/set-password', { replace: true })`.
- **`src/pages/SetPassword.tsx`**: após salvar a senha com sucesso, garantir que o profile seja criado a partir do `pending_invites` (já existe trigger; só validar) antes de mandar para `/dashboard`. Sem mudanças de lógica além disso.

### 3. Pequeno ajuste no `invite-user` (opcional, sem alterar comportamento)
Garantir que o `redirectTo` passado ao `generateLink` sempre use o domínio de produção (`https://crm.imaculada.online/set-password`) — já está assim via `SITE_URL`. Apenas validar o secret.

## O que NÃO será alterado
- Lógica do `pending_invites`, do trigger `handle_new_user`, das edge functions `invite-user` / `send-invite-email` e do email HTML.
- Rotas, RLS, filtros de leads, ou qualquer outra parte do sistema.

## Como vamos validar
1. Você adiciona a Redirect URL no Supabase.
2. Eu publico as mudanças de código (guard no `ProtectedRoute`).
3. Você envia um convite de teste para um email novo → o link deve abrir `/set-password` com o card "Crie sua senha".
4. Mesmo que alguém clique num link antigo que caia na home, o guard joga para `/set-password`.

Posso seguir?
