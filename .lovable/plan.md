

# Correção: Erro "ON CONFLICT" ao Confirmar Email

## Problema Identificado

Ao clicar no link de convite, o Supabase retorna o erro:
```
ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification (SQLSTATE 42P10)
```

### Causa Raiz

O trigger `handle_user_email_confirmed` usa `ON CONFLICT (user_id) DO NOTHING` na tabela `user_roles`, porém a constraint única existente é em `(user_id, role)` (composta), não apenas `user_id`.

| Tabela | Constraint Existente | Usado no Trigger |
|--------|---------------------|------------------|
| `user_roles` | `UNIQUE (user_id, role)` | `ON CONFLICT (user_id)` ❌ |
| `user_preferences` | `UNIQUE (user_id)` | `ON CONFLICT (user_id)` ✅ |

## Solução

Corrigir o trigger `handle_user_email_confirmed` para usar a constraint correta ou remover o `ON CONFLICT` já que verificamos previamente se o profile existe.

## Alterações Necessárias

### 1. Migração SQL - Corrigir o trigger `handle_user_email_confirmed`

Duas opções:

**Opção A: Remover ON CONFLICT (recomendada)**
Como já verificamos `IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id)`, não há risco de duplicação. Podemos simplesmente fazer INSERT direto.

```sql
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_role app_role;
  invite_nome text;
  invite_telefone text;
BEGIN
  IF OLD.email_confirmed_at IS NULL 
     AND NEW.email_confirmed_at IS NOT NULL 
     AND NEW.invited_at IS NOT NULL THEN
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
      
      SELECT role, nome_completo, telefone 
      INTO invite_role, invite_nome, invite_telefone
      FROM public.pending_invites 
      WHERE email = NEW.email;
      
      INSERT INTO public.profiles (user_id, email, nome_completo, telefone)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(invite_nome, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
        COALESCE(invite_telefone, NEW.raw_user_meta_data->>'telefone')
      );
      
      -- Remover ON CONFLICT - já verificamos que não existe duplicação
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, COALESCE(invite_role, 'user'));
      
      INSERT INTO public.user_preferences (user_id)
      VALUES (NEW.id);
      
      DELETE FROM public.pending_invites WHERE email = NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
```

**Opção B: Usar a constraint correta**
Alterar para `ON CONFLICT (user_id, role)` na tabela `user_roles`.

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, COALESCE(invite_role, 'user'))
ON CONFLICT (user_id, role) DO NOTHING;
```

### Recomendação

Usar **Opção A** (remover ON CONFLICT) porque:
1. Já existe verificação prévia de duplicação (`IF NOT EXISTS`)
2. É mais simples e não depende de constraints específicas
3. Se houver erro de duplicação, será detectado e logado (melhor para debugging)

## Fluxo Após Correção

| Etapa | Ação | Resultado |
|-------|------|-----------|
| 1 | Usuário clica no link de convite | Supabase verifica token |
| 2 | `email_confirmed_at` é preenchido | Trigger dispara |
| 3 | Trigger cria profile, role e preferences | ✅ Sucesso |
| 4 | Trigger deleta `pending_invite` | Usuário vira "Ativo" |
| 5 | Página SetPassword exibe formulário | Usuário define senha |

## Resumo das Mudanças

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Corrigir `handle_user_email_confirmed` removendo `ON CONFLICT` |

