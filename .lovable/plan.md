
# Correção Definitiva: Delete de Usuários com Validação Correta de JWT

## Problema Identificado

O erro `AuthSessionMissingError: Auth session missing!` ocorre porque o método `supabaseAdmin.auth.getUser(token)` **não funciona corretamente** quando usado com um cliente criado com `SUPABASE_SERVICE_ROLE_KEY`.

### Por Que o Código Atual Falha

```typescript
// Isso NÃO funciona com admin client
const { data: { user } } = await supabaseAdmin.auth.getUser(token);
```

O método `getUser(token)` espera ser chamado de um cliente autenticado normal, não de um admin client. Com o admin client, ele tenta usar a "sessão atual" (que não existe) ao invés de validar o token passado.

---

## Solução

Usar `auth.getClaims(token)` que é o método recomendado pela documentação do Supabase para validar JWTs em Edge Functions. Este método:

1. Valida o token JWT
2. Retorna os claims (incluindo `sub` que é o user_id)
3. Funciona corretamente com qualquer cliente

---

## Alterações Necessárias

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/delete-user/index.ts` | Usar `getClaims()` ao invés de `getUser()` |
| `supabase/functions/delete-user-by-email/index.ts` | Usar `getClaims()` ao invés de `getUser()` |

### Código Corrigido

```typescript
// Usar getClaims para validar o token
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: authError } = await supabaseAdmin.auth.getClaims(token);

if (authError || !claimsData?.claims) {
  console.error("Auth error:", authError);
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

const requestingUserId = claimsData.claims.sub;

// Verificar role do usuário
const { data: roleData, error: roleError } = await supabaseAdmin
  .from("user_roles")
  .select("role")
  .eq("user_id", requestingUserId)
  .single();
```

---

## Passos da Implementação

1. Atualizar `delete-user/index.ts`:
   - Trocar `getUser(token)` por `getClaims(token)` (linhas 35-44)
   - Extrair user_id de `claimsData.claims.sub`
   - Usar esse ID para verificar permissões

2. Atualizar `delete-user-by-email/index.ts`:
   - Mesma alteração

3. Fazer deploy das Edge Functions

4. Testar a exclusão de usuários

---

## Por Que Isso Resolve

O método `getClaims(token)`:
- Valida a assinatura do JWT corretamente
- Retorna os claims do token (sub = user_id, email, etc.)
- Funciona independentemente do tipo de cliente (admin ou normal)
- É o método recomendado pela documentação do Supabase para Edge Functions

---

## Detalhes Técnicos

A estrutura de `claimsData.claims`:
```typescript
{
  sub: "601cda2a-2a06-48fe-b45e-f4a82a0f63b3", // user_id
  email: "erickson@example.com",
  role: "authenticated",
  exp: 1234567890,
  // ... outros claims
}
```

Após obter o `sub` (user_id), podemos verificar na tabela `user_roles` se o usuário tem permissão de admin/global para executar a operação de exclusão.

---

## Resultado Esperado

Após a correção:
- Validação do JWT funcionará corretamente
- Verificação de permissões funcionará
- Exclusão de usuários ativos funcionará
- Exclusão de convites pendentes funcionará
