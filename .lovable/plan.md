

# Plano: Corrigir Sistema de Convites (DEFINITIVO)

## Problema Encontrado

Os logs do Supabase confirmam:
- OPTIONS retorna 200 ✅
- POST retorna 401 ❌ com "Missing authorization header"

Isso acontece porque:
1. O projeto usa **signing-keys** (sistema novo do Supabase)
2. Com signing-keys, o `verify_jwt = true` no config.toml **não funciona corretamente**
3. O gateway do Supabase rejeita o token ANTES de chegar à função

No outro projeto, isso funciona porque provavelmente ainda está no sistema antigo de JWT.

---

## Solução (Recomendada pela Documentação do Supabase)

### 1. Mudar `supabase/config.toml`

```toml
project_id = "omilhfohvstqsonhyuxp"

[functions.webhook-lead]
verify_jwt = false

[functions.invite-user]
verify_jwt = false

[functions.send-invite-email]
verify_jwt = false

[functions.delete-user]
verify_jwt = false

[functions.delete-user-by-email]
verify_jwt = false
```

### 2. Adicionar Validação Manual na Edge Function

No arquivo `supabase/functions/invite-user/index.ts`, adicionar verificação do JWT usando `getUser()` (que já existe no código mas precisa retornar erro se falhar):

Após a linha que verifica o OPTIONS, adicionar:

```typescript
// Validar autenticação manualmente
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(
    JSON.stringify({ error: "Não autorizado" }),
    { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
```

E modificar a parte que extrai o usuário para falhar se não houver autenticação:

```typescript
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

if (userError || !user) {
  return new Response(
    JSON.stringify({ error: "Token inválido" }),
    { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

const invitedBy = user.id;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/config.toml` | Mudar `verify_jwt` para `false` em todas as funções |
| `supabase/functions/invite-user/index.ts` | Adicionar validação manual do JWT |

---

## Por Que Isso Vai Funcionar

1. Com `verify_jwt = false`, o gateway do Supabase passa TODAS as requisições para a função
2. A função valida o JWT manualmente usando `getUser()`
3. Se inválido, retorna 401 COM os headers CORS (o browser recebe a resposta corretamente)
4. Se válido, processa o convite normalmente

---

## Fluxo Corrigido

```text
Browser -> POST /invite-user
              |
              v
    [verify_jwt = false]
    Requisição chega na função
              |
              v
    [Função valida JWT com getUser()]
              |
         [Válido?]
          /      \
        Sim       Não
         |         |
         v         v
    [Processa   [401 + CORS headers]
     convite]   
         |
         v
    [200 OK + email enviado]
```

---

## Resultado Esperado

Após essas alterações:
1. Requisições chegarão à Edge Function
2. JWT será validado dentro da função
3. Convites serão enviados com sucesso
4. Erro "Failed to fetch" será eliminado

