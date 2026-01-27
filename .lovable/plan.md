

# Correção: Manter Lógica "Pendente" vs "Ativo"

## Problema Identificado

O Supabase preenche `invited_at` **APÓS** o INSERT, então a verificação no trigger não funciona:

```text
ORDEM ATUAL:
1. generateLink() → INSERT em auth.users (invited_at = NULL) → Trigger dispara → Profile criado ❌
2. Supabase faz UPDATE para preencher invited_at
3. Edge Function insere em pending_invites
4. Resultado: Duplicação (profile + pending_invite)
```

## Solução

**Inverter a ordem na Edge Function**: primeiro inserir em `pending_invites`, depois chamar `generateLink`. O trigger verifica se existe `pending_invite` para aquele email e, se existir, não cria o profile.

```text
NOVA ORDEM:
1. Edge Function insere em pending_invites
2. generateLink() → INSERT em auth.users → Trigger dispara
3. Trigger verifica: "existe pending_invite para este email?" → SIM → Não cria profile
4. Resultado: Apenas 1 registro "Pendente"
```

## Alterações Necessárias

### 1. Migração SQL - Atualizar `handle_new_user`

Mudar a verificação de `invited_at` para verificar se existe `pending_invite`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se existe pending_invite para este email, não criar profile ainda
  -- O profile será criado quando o usuário confirmar o email
  IF EXISTS (SELECT 1 FROM public.pending_invites WHERE email = NEW.email) THEN
    RETURN NEW;
  END IF;

  -- Criar profile normalmente para usuários auto-cadastrados
  INSERT INTO public.profiles (user_id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;
```

### 2. Edge Function - Inverter ordem das operações

Mover a inserção em `pending_invites` para **ANTES** de `generateLink`:

**Arquivo**: `supabase/functions/invite-user/index.ts`

**De** (ordem atual):
```typescript
// 1. generateLink (cria usuário)
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({...});

// 2. Insert pending_invite (DEPOIS)
await supabaseAdmin.from("pending_invites").insert({...});
```

**Para** (nova ordem):
```typescript
// 1. Insert pending_invite PRIMEIRO
await supabaseAdmin.from("pending_invites").insert({...});

// 2. generateLink (cria usuário - trigger vai verificar pending_invite)
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({...});
```

### 3. Limpeza de Dados

Deletar profiles de usuários que ainda não confirmaram (têm pending_invite correspondente):

```sql
-- Identificar e limpar usuários convidados que tiveram profile criado incorretamente
DELETE FROM public.profiles 
WHERE email IN (SELECT email FROM public.pending_invites);

DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT p.user_id FROM public.profiles p 
  WHERE p.email IN (SELECT email FROM public.pending_invites)
);

DELETE FROM public.user_preferences 
WHERE user_id IN (
  SELECT p.user_id FROM public.profiles p 
  WHERE p.email IN (SELECT email FROM public.pending_invites)
);
```

## Fluxo Após Correção

| Etapa | Ação | Resultado |
|-------|------|-----------|
| 1 | Admin envia convite | `pending_invite` criado |
| 2 | `generateLink` cria usuário | Trigger verifica `pending_invite` → **não cria profile** |
| 3 | Usuário clica no link e define senha | `email_confirmed_at` preenchido |
| 4 | Trigger `handle_user_email_confirmed` | Cria profile, role, preferences e deleta `pending_invite` |
| 5 | Usuário aparece como "Ativo" | ✅ |

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Atualizar `handle_new_user` para verificar `pending_invites` em vez de `invited_at` |
| `supabase/functions/invite-user/index.ts` | Inverter ordem: inserir `pending_invite` ANTES de `generateLink` |
| Migração SQL | Limpar profiles criados incorretamente para usuários com pending_invite |

