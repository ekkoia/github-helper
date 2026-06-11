## Causa raiz do erro

Os logs da edge function `delete-user` mostram:

```
AuthApiError: Database error deleting user (status 500, code: unexpected_failure)
```

Isso acontece porque duas tabelas têm foreign keys para `auth.users` **sem** `ON DELETE CASCADE` ou `ON DELETE SET NULL`:

| Tabela | Coluna | FK atual |
|---|---|---|
| `leads` | `responsavel_id` | sem cascade |
| `pending_invites` | `invited_by` | sem cascade |

Quando a Kemyli tentou excluir o **Bruno Velloso**, ele tinha leads atribuídos como responsável — o Postgres bloqueou a deleção do `auth.users`, retornando erro 500. Por isso o erro aparece com qualquer usuário que já tenha leads ou tenha enviado convites.

As demais FKs (`profiles`, `user_roles`, `user_preferences`, `user_activities`, `user_callix_mapping`) já estão com `ON DELETE CASCADE`, então estão OK.

## O que vou corrigir

### 1. Migration: ajustar as 2 FKs problemáticas para `ON DELETE SET NULL`

- `leads.responsavel_id` → ao excluir usuário, os leads ficam **sem responsável** (admin continua vendo, comportamento já desejado da regra de visibilidade).
- `pending_invites.invited_by` → o convite continua, mas perde o registro de quem convidou.

Por que `SET NULL` e não `CASCADE`: deletar um usuário **não pode apagar leads** do sistema. Eles voltam ao pool "sem responsável" e podem ser reatribuídos.

### 2. Hardening da edge function `delete-user`

- Trocar `.single()` por `.maybeSingle()` no fetch de `user_roles` (evita 403 silencioso se houver 0 ou 2+ linhas)
- Adicionar logs detalhados (quem chamou, alvo, etapa que falhou)
- Retornar a mensagem real do Postgres no body, em vez de só "Database error"

### 3. Frontend (`Usuarios.tsx`)

- Mostrar no toast a mensagem real vinda do server (`data?.error` ou `error.context?.body`) em vez do genérico "Edge Function returned a non-2xx status code"

## Verificação geral do backend (resumo)

Revisei o restante do schema/edge functions e estes são os únicos pontos críticos relacionados à exclusão. Outros achados menores (não bloqueantes, **fora deste escopo** — me avise se quer corrigir também):

- `delete-user-by-email` tem o mesmo `.single()` em `user_roles` (mesmo risco)
- Algumas funções SQL não têm `SET search_path` (já são linter warnings antigos)

## Detalhes técnicos da migration

```sql
ALTER TABLE public.leads
  DROP CONSTRAINT leads_responsavel_id_fkey,
  ADD  CONSTRAINT leads_responsavel_id_fkey
       FOREIGN KEY (responsavel_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.pending_invites
  DROP CONSTRAINT pending_invites_invited_by_fkey,
  ADD  CONSTRAINT pending_invites_invited_by_fkey
       FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
```
