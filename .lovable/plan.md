

# Personalizar Email de Recuperacao de Senha com Marca Feeagro

## Resumo
Atualmente, o email de recuperacao de senha e enviado pelo Supabase com template generico. Vamos criar um fluxo customizado que gera o link de recuperacao via API admin e envia um email personalizado com a marca Feeagro usando o Resend (mesmo padrao do email de convite).

## O que muda para o usuario
- O email de recuperacao de senha tera o visual da marca Feeagro (verde, logo, layout profissional)
- Mesmo padrao visual do email de convite ja existente
- Botao "Redefinir Minha Senha" no lugar do link generico do Supabase

## Detalhes Tecnicos

### 1. Nova Edge Function: `send-recovery-email`
- Recebe `to_email` e `recovery_link`
- Envia email via Resend com template HTML personalizado Feeagro (cores verde `#65a30d`, layout identico ao `send-invite-email`)
- Remetente: `CRM Feeagro <noreply@imaculada.online>`
- Conteudo: saudacao, instrucao para redefinir senha, botao com link, fallback de link em texto

### 2. Nova Edge Function: `reset-password`
- Recebe `email` no body
- Usa `supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })` para gerar o link de recuperacao
- Chama `send-recovery-email` internamente para enviar o email personalizado
- Retorna sucesso/erro

### 3. Modificar `src/contexts/AuthContext.tsx`
- Alterar `resetPassword` para chamar a edge function `reset-password` em vez de `supabase.auth.resetPasswordForEmail`
- Isso garante que o email customizado e enviado no lugar do generico

### 4. Configuracao
- `supabase/config.toml`: adicionar `[functions.reset-password]` e `[functions.send-recovery-email]` com `verify_jwt = false`

### Fluxo completo

```text
1. Usuario clica "Esqueceu a senha?" e informa email
2. Frontend chama edge function "reset-password" com o email
3. Edge function gera link de recuperacao via admin API
4. Edge function chama "send-recovery-email" para enviar email personalizado Feeagro
5. Usuario recebe email bonito com botao "Redefinir Minha Senha"
6. Clica no link -> /set-password -> define nova senha
```

### Arquivos criados
- `supabase/functions/send-recovery-email/index.ts`
- `supabase/functions/reset-password/index.ts`

### Arquivos modificados
- `supabase/config.toml` (adicionar config das novas functions)
- `src/contexts/AuthContext.tsx` (alterar `resetPassword` para chamar edge function)

