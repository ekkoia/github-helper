

# Recuperacao de Senha

## Resumo
O botao "Esqueceu a senha?" ja existe na tela de login mas nao faz nada. A pagina `/set-password` ja trata o evento `PASSWORD_RECOVERY` do Supabase e permite definir nova senha. Falta apenas conectar as duas pontas.

## O que sera feito

### 1. Adicionar funcao `resetPassword` no AuthContext
- Nova funcao que chama `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- O `redirectTo` apontara para `/set-password` para reaproveitar a pagina existente

### 2. Adicionar tela de "Esqueceu a senha" no Auth.tsx
- Novo estado `isForgotPassword` para alternar entre login e recuperacao
- Quando ativo, exibe apenas o campo de email e um botao "Enviar link de recuperacao"
- Ao enviar, chama `resetPassword(email)` e exibe mensagem de sucesso
- Link para voltar ao login

### 3. Nenhuma alteracao no SetPassword.tsx
- A pagina ja detecta o evento `PASSWORD_RECOVERY` e permite definir nova senha
- Funciona como destino do link enviado por email

---

## Detalhes Tecnicos

### Arquivos modificados

**`src/contexts/AuthContext.tsx`**
- Adicionar `resetPassword: (email: string) => Promise<{ error: Error | null }>` na interface `AuthContextType`
- Implementar chamando `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/set-password' })`

**`src/pages/Auth.tsx`**
- Novo estado `isForgotPassword` (boolean)
- Quando `isForgotPassword === true`:
  - Titulo muda para "Recuperar senha"
  - Exibe apenas campo de email
  - Botao "Enviar link de recuperacao"
  - Link "Voltar ao login"
- O botao "Esqueceu a senha?" (linha 174-179) ativa `setIsForgotPassword(true)`
- Ao submeter, chama `resetPassword(email)` e exibe toast de sucesso com instrucao para verificar o email

### Fluxo completo

```text
1. Usuario clica "Esqueceu a senha?" na tela de login
2. Tela muda para exibir apenas campo de email
3. Usuario informa email e clica "Enviar link"
4. Supabase envia email com link para /set-password#access_token=...&type=recovery
5. Usuario clica no link do email
6. Pagina SetPassword detecta PASSWORD_RECOVERY e exibe formulario de nova senha
7. Usuario define nova senha e e redirecionado ao dashboard
```
