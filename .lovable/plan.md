

# Correção Definitiva: Duplicação de Usuários ao Enviar Convite

## Diagnóstico

A migração SQL proposta anteriormente **NÃO foi executada no banco de dados**. Confirmações:

| Verificação | Resultado |
|-------------|-----------|
| Função `handle_new_user` | Código antigo (sem verificação de `invited_at`) |
| Função `handle_user_email_confirmed` | **Não existe** |
| Trigger `on_user_email_confirmed` | **Não existe** |
| Arquivo de migração com o fix | **Não existe** |

## Problema Atual

Quando você envia um convite:
1. `generateLink({ type: 'invite' })` cria usuário em `auth.users`
2. Trigger `handle_new_user` dispara e cria **profile + role + preferences** imediatamente
3. Edge Function insere em `pending_invites`
4. Resultado: **2 registros** para o mesmo email (um "Ativo", um "Pendente")

## Solução em 2 Partes

### Parte 1: Migração SQL (Correção do Trigger)

Executar migração para:

1. **Atualizar `handle_new_user`** para ignorar usuários criados via invite:
```sql
IF NEW.invited_at IS NOT NULL AND NEW.email_confirmed_at IS NULL THEN
  RETURN NEW; -- Não criar profile ainda
END IF;
```

2. **Criar função `handle_user_email_confirmed`** que cria profile quando usuário confirma email

3. **Criar trigger `on_user_email_confirmed`** em `auth.users` para UPDATE

4. **Limpar dados duplicados**:
```sql
DELETE FROM pending_invites WHERE email IN (SELECT email FROM profiles);
```

### Parte 2: Frontend (Proteção Adicional)

Modificar `fetchUsers()` em `Usuarios.tsx` para filtrar emails duplicados:

```typescript
// Filtrar pending invites que já têm profile ativo
const activeEmails = new Set(profiles.map(p => p.email?.toLowerCase()));
const filteredPendingInvites = (pendingInvites || [])
  .filter(invite => !activeEmails.has(invite.email?.toLowerCase()));
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Criar triggers corrigidos |
| `src/pages/Usuarios.tsx` | Filtrar duplicatas no frontend |

## Passos da Implementação

1. Criar e executar migração SQL com:
   - Função `handle_new_user` atualizada
   - Nova função `handle_user_email_confirmed`
   - Novo trigger `on_user_email_confirmed`
   - Query de limpeza de duplicatas

2. Atualizar `Usuarios.tsx` (linhas 107-120):
   - Adicionar filtro de emails duplicados antes de combinar as listas

3. Verificar no banco que:
   - A função foi atualizada
   - O novo trigger existe
   - Dados duplicados foram removidos

## Resultado Esperado

- Enviar convite → Aparece **apenas 1 registro** como "Pendente"
- Usuário confirma email → Muda para "Ativo" e remove de `pending_invites`
- Nunca haverá duplicação

