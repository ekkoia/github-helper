
# Plano de Correção: Delete de Usuários e Esclarecimento de Status

## Problemas Identificados

### Problema 1: Delete de Usuários Não Funciona
**Causa**: As Edge Functions `delete-user` e `delete-user-by-email` estão com o mesmo problema de CORS que corrigimos anteriormente - falta o header `x-supabase-client-platform`.

**Código atual (linha 5 em ambos arquivos):**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

### Problema 2: Status da Juliana Nasc
**Esclarecimento**: A Juliana Nasc (`juinha.a.nascimento@gmail.com`) está **corretamente** como "Ativo" porque ela **já completou o cadastro**. Verifiquei no banco de dados:

| Tabela | Registro |
|--------|----------|
| `profiles` | Existe registro com `created_at: 2026-01-27 14:41:24` |
| `pending_invites` | Vazio (foi removido pelo trigger ao criar o profile) |

O sistema está funcionando corretamente - quando um usuário completa o cadastro (define a senha), um profile é criado e o trigger remove automaticamente o convite pendente.

---

## Solução para o Delete

### Arquivos a Modificar

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `supabase/functions/delete-user/index.ts` | 5 | Adicionar header CORS |
| `supabase/functions/delete-user-by-email/index.ts` | 5 | Adicionar header CORS |

### Novo Código CORS

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};
```

---

## Passos da Implementação

1. Atualizar `corsHeaders` no arquivo `delete-user/index.ts` (linha 5)
2. Atualizar `corsHeaders` no arquivo `delete-user-by-email/index.ts` (linha 5)
3. Fazer deploy das Edge Functions
4. Testar a exclusão de usuários

---

## Por Que Isso Resolve

Mesma situação do `invite-user`: o cliente Supabase JS envia automaticamente o header `x-supabase-client-platform` em todas as requisições. Quando a Edge Function não permite esse header, o browser bloqueia a requisição por CORS.

---

## Resultado Esperado

Após a correção:
- Exclusão de usuários ativos funcionará normalmente
- Exclusão de convites pendentes funcionará normalmente
- O status dos usuários continuará sendo exibido corretamente (Ativo vs Pendente)

---

## Detalhes Técnicos

A correção é idêntica à que fizemos para `invite-user` e `send-invite-email` - apenas adicionar o header `x-supabase-client-platform` na lista de headers permitidos pelo CORS.
