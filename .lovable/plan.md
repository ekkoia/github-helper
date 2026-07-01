## Problema identificado

Existem **duas causas** que fazem o link de "Criar senha" (e o de "Recuperar senha") caírem direto no CRM:

### 1. Trigger cria o profile antes de o usuário definir a senha

O trigger `handle_user_email_confirmed` cria o profile automaticamente assim que o email é confirmado — e o simples ato de clicar no link do convite já confirma o email. Ou seja, quando o navegador chega em `/set-password`, o profile **já existe**.

O guard atual em `ProtectedRoute` só redireciona para `/set-password` **quando o profile não existe**. Como ele já existe, o guard deixa passar → o usuário cai no `/dashboard` com uma senha aleatória gerada pelo Supabase (que ele não conhece), e nunca vê a tela de definir senha.

### 2. Supabase pode não estar redirecionando para `/set-password`

Se `https://crm.imaculada.online/set-password` não estiver na lista de **Redirect URLs** do Supabase, o Supabase ignora o `redirectTo` e joga o usuário no **Site URL** (raiz do app), o que reforça o problema.

O mesmo se aplica ao fluxo de **recuperação de senha** (usa o mesmo `/set-password` como `redirectTo`).

---

## Correções

### A. Nova coluna `senha_definida` em `profiles`

Adicionar `senha_definida boolean not null default false` para marcar de forma explícita se o usuário já criou a senha dele. Muito mais confiável do que inferir por "profile existe ou não".

### B. Ajustar os triggers

- `handle_new_user` (auto-cadastro normal): criar profile com `senha_definida = true` (usuário já escolheu a senha no signUp).
- `handle_user_email_confirmed` (fluxo de convite): criar profile com `senha_definida = false`.
- Backfill: marcar todos os profiles existentes como `senha_definida = true` para não afetar usuários atuais.

### C. Atualizar `ProtectedRoute`

Trocar a checagem de "profile inexistente" por **profile com `senha_definida = false`** → redireciona para `/set-password`. Isso garante o desvio mesmo quando o profile já foi criado pelo trigger.

### D. Atualizar `src/pages/SetPassword.tsx`

Após `supabase.auth.updateUser({ password })` com sucesso, executar:
```
UPDATE profiles SET senha_definida = true WHERE user_id = <user.id>
```
antes de redirecionar para `/dashboard`.

### E. Ação manual no painel do Supabase (obrigatória)

Em **Authentication → URL Configuration → Redirect URLs**, adicionar (se ainda não estiverem):
- `https://crm.imaculada.online/set-password`
- `https://crm.imaculada.online/**`

Sem isso, o Supabase continua caindo no Site URL e o fluxo quebra novamente — não há como contornar isso pelo código.

---

## Arquivos alterados

| Arquivo | Ação |
|---|---|
| Migração SQL | Add coluna `senha_definida`, atualiza os 2 triggers, backfill |
| `src/components/ProtectedRoute.tsx` | Checar `senha_definida` em vez de existência de profile |
| `src/pages/SetPassword.tsx` | Marcar `senha_definida = true` após salvar senha |

Sem mudanças em edge functions — o fluxo de invite/recovery já está correto no backend, o problema estava na UX pós-clique.
