
# Corrigir redirecionamento indevido ao trocar de aba do navegador

## Problema

Quando o usuario esta na pagina `/leads` e troca para outra aba do navegador, ao voltar ele e redirecionado para `/dashboard`. Isso acontece com qualquer pagina protegida, mas e mais perceptivel na pagina Leads.

### Causa raiz

O Supabase SDK, ao detectar que a aba voltou ao foco, tenta renovar o token de autenticacao. Durante esse processo, o `onAuthStateChange` pode disparar brevemente com `session = null`, fazendo o estado `user` ficar `null` por um instante.

O `ProtectedRoute` reage imediatamente a `user === null` e redireciona para `/auth`. A pagina Auth, por sua vez, detecta que o usuario ja esta logado (apos o token ser renovado) e redireciona para `/dashboard`.

Fluxo:
```text
/leads -> user=null (token refresh) -> /auth -> user volta -> /dashboard
```

## Solucao

### 1. Expor `loading` no AuthContext e adicionar estado intermediario durante refresh

Adicionar o estado `loading` ao valor do contexto para que outros componentes possam saber quando a autenticacao esta sendo processada.

**Arquivo: `src/contexts/AuthContext.tsx`**

- Adicionar `loading` ao `AuthContextType` e ao `AuthContext.Provider value`
- No callback do `onAuthStateChange`, nao setar `user` como null em eventos de refresh transitorio (ignorar `SIGNED_OUT` se seguido rapidamente de outro evento)

### 2. Corrigir `ProtectedRoute` para nao redirecionar durante loading/refresh

**Arquivo: `src/components/ProtectedRoute.tsx`**

- Importar `loading` do `useAuth()`
- Se `loading` for `true`, renderizar nada (ou skeleton) em vez de redirecionar
- So redirecionar para `/auth` quando `loading === false` E `user === null`

Codigo proposto:
```typescript
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return null;
  }

  return <>{children}</>;
};
```

### 3. Corrigir pagina Auth para nao redirecionar durante loading

**Arquivo: `src/pages/Auth.tsx`**

- Importar `loading` do `useAuth()`
- So redirecionar para `/dashboard` quando `loading === false` E `user !== null`

## Detalhes tecnicos

A mudanca principal e no `AuthContext.tsx`:

- Expor `loading` no contexto
- Garantir que durante o `TOKEN_REFRESHED` o user nao fique momentaneamente null

O `onAuthStateChange` do Supabase pode disparar eventos em sequencia rapida (`SIGNED_OUT` seguido de `TOKEN_REFRESHED`). A solucao e:
- Sempre que `onAuthStateChange` disparar com uma session valida, atualizar user normalmente
- Quando disparar com session null, verificar se existe sessao persistida antes de limpar o estado

## Arquivos a modificar

1. `src/contexts/AuthContext.tsx` - expor `loading`, proteger contra refresh transitorio
2. `src/components/ProtectedRoute.tsx` - usar `loading` antes de redirecionar
3. `src/pages/Auth.tsx` - usar `loading` antes de redirecionar para dashboard
