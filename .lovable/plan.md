

# Correção do Erro de CORS nas Edge Functions

## Problema Identificado

O erro de CORS é causado por um header que o cliente Supabase JS envia, mas que não está sendo permitido pela Edge Function:

```
Request header field x-supabase-client-platform is not allowed by Access-Control-Allow-Headers
```

### Código Atual (Linha 6 do `invite-user/index.ts`)
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

O header `x-supabase-client-platform` não está incluído na lista de headers permitidos.

---

## Solução

Atualizar os headers CORS em ambas as Edge Functions para incluir o header faltante.

### Arquivos a Modificar

| Arquivo | Linha | Ação |
|---------|-------|------|
| `supabase/functions/invite-user/index.ts` | 4-7 | Adicionar header CORS |
| `supabase/functions/send-invite-email/index.ts` | 5-9 | Adicionar header CORS |

### Novo Código CORS

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};
```

---

## Passos da Implementação

1. Atualizar `corsHeaders` no arquivo `invite-user/index.ts` (linha 6)
2. Atualizar `corsHeaders` no arquivo `send-invite-email/index.ts` (linha 7-8)
3. Fazer deploy das Edge Functions atualizadas
4. Testar novamente no domínio de produção

---

## Por Que Isso Resolve

O cliente Supabase JS moderno envia automaticamente o header `x-supabase-client-platform` em todas as requisições. Quando a Edge Function não permite esse header na resposta preflight (OPTIONS), o browser bloqueia a requisição por CORS.

Ao adicionar esse header na lista de permitidos, a requisição preflight retornará sucesso e o browser permitirá a requisição POST.

---

## Resultado Esperado

Após a correção:
- Requisição OPTIONS (preflight) retornará 200 com os headers corretos
- Requisição POST será executada normalmente
- O convite será enviado com sucesso

