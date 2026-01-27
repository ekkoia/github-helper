
# Correção: Duplicação de Usuários ao Enviar Convite

## Problema Identificado

Quando você envia um convite, o mesmo usuário aparece **duas vezes**:
- Uma vez como **"Ativo"** (badge verde)
- Uma vez como **"Pendente"** (badge amarelo)

### Causa Raiz

A função `generateLink({ type: 'invite' })` do Supabase cria automaticamente um usuário em `auth.users`. Isso dispara o trigger `on_auth_user_created` que executa `handle_new_user()`, que por sua vez cria registros em:
- `profiles` (exibido como "Ativo")
- `user_roles`
- `user_preferences`

Depois, a Edge Function insere em `pending_invites` (exibido como "Pendente").

### Timeline Real (Juliana)

| Horário | Evento |
|---------|--------|
| 14:54:40.977 | `generateLink` cria usuário em auth.users |
| 14:54:40.980 | Trigger dispara e cria profile automaticamente |
| 14:54:41.288 | Edge Function insere em pending_invites |

O usuário nunca confirmou nada - o profile foi criado pelo trigger.

---

## Solução

Modificar a função `handle_new_user()` para **não criar profile quando o usuário for criado via invite**. O profile só deve ser criado quando o usuário completar o cadastro (confirmar email).

### Como Identificar um Invite

Quando `generateLink({ type: 'invite' })` é chamado, o usuário criado tem:
- `invited_at IS NOT NULL` 
- `email_confirmed_at IS NULL`

---

## Alterações Necessárias

### 1. Atualizar Trigger `handle_new_user`

Modificar para ignorar usuários criados via invite:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se o usuário foi criado via invite, não criar profile ainda
  -- O profile será criado quando o usuário confirmar o email
  IF NEW.invited_at IS NOT NULL AND NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Criar role padrão 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Criar preferências padrão
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;
```

### 2. Criar Trigger para Confirmação de Email

Adicionar um novo trigger que cria o profile quando o usuário **confirma o email** (completa o cadastro):

```sql
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se o email foi confirmado agora (era NULL e agora tem valor)
  -- E o usuário foi originalmente convidado
  IF OLD.email_confirmed_at IS NULL 
     AND NEW.email_confirmed_at IS NOT NULL 
     AND NEW.invited_at IS NOT NULL THEN
    
    -- Verificar se já existe profile (para evitar duplicação)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
      -- Criar profile
      INSERT INTO public.profiles (user_id, email, nome_completo)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1))
      );
      
      -- Criar role (ou usar o role do pending_invite se existir)
      INSERT INTO public.user_roles (user_id, role)
      SELECT NEW.id, COALESCE(pi.role, 'user')
      FROM (SELECT 1) AS dummy
      LEFT JOIN public.pending_invites pi ON pi.email = NEW.email
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Criar preferências padrão
      INSERT INTO public.user_preferences (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Remover convite pendente
      DELETE FROM public.pending_invites WHERE email = NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar o trigger de UPDATE em auth.users
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_confirmed();
```

### 3. Limpeza de Dados Existentes

Executar query para remover o registro duplicado atual:

```sql
-- Remover pending_invite para email que já tem profile
DELETE FROM pending_invites 
WHERE email IN (SELECT email FROM profiles);
```

---

## Passos da Implementação

1. **Atualizar função `handle_new_user`** para ignorar usuários criados via invite
2. **Criar função `handle_user_email_confirmed`** para criar profile quando email for confirmado
3. **Criar trigger `on_user_email_confirmed`** em auth.users para UPDATE
4. **Limpar dados duplicados** existentes no banco
5. **Testar o fluxo completo**:
   - Enviar convite → Aparece apenas como "Pendente"
   - Usuário confirma email → Passa para "Ativo" e some de pending_invites

---

## Resultado Esperado

- Ao enviar convite: aparece **apenas 1 registro** como "Pendente"
- Ao confirmar email: **muda para "Ativo"** e remove de pending_invites
- Nunca haverá duplicação de registros para o mesmo email
