

# Implementar Login com Google

## Situação Atual

O código do frontend já está **100% implementado**:
- A função `signInWithGoogle()` já existe no AuthContext
- O botão "Continuar com Google" já existe na página de login
- O redirecionamento para `/dashboard` após login está configurado

O que falta é a **configuração no lado do Supabase e Google Cloud**.

## Passos para Configurar

### Passo 1: Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google+ API** ou **Google Identity API**

### Passo 2: Configurar Tela de Consentimento OAuth

1. Vá para **APIs & Services > OAuth consent screen**
2. Escolha **External** (para usuários externos)
3. Preencha as informações obrigatórias:
   - Nome do aplicativo: **Imaculada Agronegócios**
   - Email de suporte
   - Domínios autorizados: `omilhfohvstqsonhyuxp.supabase.co`
4. Adicione os escopos:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`

### Passo 3: Criar Credenciais OAuth

1. Vá para **APIs & Services > Credentials**
2. Clique em **Create Credentials > OAuth Client ID**
3. Tipo de aplicação: **Web application**
4. Nome: **Imaculada CRM**
5. **Authorized JavaScript origins**:
   - `https://id-preview--4857f2d3-9941-4691-862c-d1c44dc8fe55.lovable.app`
   - (Adicione seu domínio de produção quando publicar)
6. **Authorized redirect URIs**:
   - `https://omilhfohvstqsonhyuxp.supabase.co/auth/v1/callback`
7. Copie o **Client ID** e **Client Secret** gerados

### Passo 4: Configurar no Supabase Dashboard

1. Acesse [Supabase Authentication Providers](https://supabase.com/dashboard/project/omilhfohvstqsonhyuxp/auth/providers)
2. Encontre **Google** na lista e clique para expandir
3. Ative o toggle **Enable Sign in with Google**
4. Cole o **Client ID** e **Client Secret** do Google Cloud
5. Clique em **Save**

### Passo 5: Configurar URLs no Supabase

1. Acesse [Supabase URL Configuration](https://supabase.com/dashboard/project/omilhfohvstqsonhyuxp/auth/url-configuration)
2. Configure:
   - **Site URL**: `https://id-preview--4857f2d3-9941-4691-862c-d1c44dc8fe55.lovable.app`
   - **Redirect URLs**: Adicione `https://id-preview--4857f2d3-9941-4691-862c-d1c44dc8fe55.lovable.app/dashboard`

## Melhoria Opcional no Código

Podemos adicionar tratamento para criar o perfil automaticamente quando o usuário fizer login com Google pela primeira vez:

```typescript
// No AuthContext, atualizar o onAuthStateChange
supabase.auth.onAuthStateChange(async (event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  
  // Criar perfil automaticamente para login OAuth
  if (event === 'SIGNED_IN' && session?.user) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', session.user.id)
      .single();
    
    if (!existingProfile) {
      await supabase.from('profiles').insert({
        user_id: session.user.id,
        nome_completo: session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name ||
                       session.user.email?.split('@')[0]
      });
    }
  }
  
  setLoading(false);
});
```

## Resumo

| Item | Status |
|------|--------|
| Função `signInWithGoogle()` | Implementado |
| Botão na página de login | Implementado |
| Redirecionamento após login | Implementado |
| Configuração Google Cloud | **Pendente (manual)** |
| Configuração Supabase | **Pendente (manual)** |
| Criação automática de perfil | Opcional - pode ser adicionado |

## Alterações de Código (Opcional)

| Arquivo | Alteração |
|---------|-----------|
| `src/contexts/AuthContext.tsx` | Adicionar criação automática de perfil para usuários OAuth |

