

# Corrigir redirecionamento ao trocar de aba (fix definitivo)

## Problema persistente

A correção anterior ignora sessões nulas apenas quando o evento NÃO é `SIGNED_OUT`. Porém, o Supabase pode disparar um evento `SIGNED_OUT` real durante a renovação do token (o token antigo é revogado antes do novo ser emitido). Isso faz o user ficar null, ProtectedRoute redireciona para `/auth`, e Auth redireciona para `/dashboard` quando o novo token chega.

## Solução

### 1. AuthContext: adicionar estado `refreshing` e debounce no SIGNED_OUT

Em vez de reagir imediatamente ao `SIGNED_OUT`, aguardar um breve intervalo (300ms) e verificar se uma nova sessão não chegou nesse meio tempo. Se uma nova sessão chegar antes do timeout, cancelar a limpeza do estado.

**Arquivo: `src/contexts/AuthContext.tsx`**

Alterações:
- Adicionar uma ref `signOutTimer` para controlar o debounce
- Quando `SIGNED_OUT` chegar, agendar a limpeza do estado com `setTimeout(300ms)`
- Quando uma sessão válida chegar, cancelar qualquer timer pendente e atualizar normalmente
- No `signOut()` explícito, limpar estado imediatamente (sem debounce) pois é uma ação intencional do usuário

Lógica do onAuthStateChange:
```text
if session valida:
  - cancelar timer pendente
  - setUser/setSession normalmente
else if evento SIGNED_OUT:
  - agendar limpeza com delay de 300ms
  - se nova sessão chegar antes, timer é cancelado
```

### 2. ProtectedRoute: sem alterações

O ProtectedRoute já está correto - só redireciona quando `!loading && !user`. Com o debounce no AuthContext, o user nunca ficará null transitoriamente durante refresh.

### 3. Auth.tsx: sem alterações

Já está usando `authLoading` corretamente.

## Detalhes técnicos

```typescript
// AuthContext.tsx - onAuthStateChange revisado
const signOutTimerRef = useRef<NodeJS.Timeout | null>(null);

onAuthStateChange(async (event, session) => {
  if (session) {
    // Sessão válida: cancelar qualquer sign-out pendente
    if (signOutTimerRef.current) {
      clearTimeout(signOutTimerRef.current);
      signOutTimerRef.current = null;
    }
    setSession(session);
    setUser(session.user);
  } else if (event === 'SIGNED_OUT') {
    // Debounce: aguardar 300ms antes de limpar
    signOutTimerRef.current = setTimeout(() => {
      setSession(null);
      setUser(null);
      signOutTimerRef.current = null;
    }, 300);
  }
  setLoading(false);
});
```

No método `signOut()` explícito, cancelar o timer e limpar imediatamente:
```typescript
const signOut = async () => {
  if (signOutTimerRef.current) {
    clearTimeout(signOutTimerRef.current);
    signOutTimerRef.current = null;
  }
  // ... resto do código existente
};
```

Cleanup no useEffect return:
```typescript
return () => {
  subscription.unsubscribe();
  if (signOutTimerRef.current) {
    clearTimeout(signOutTimerRef.current);
  }
};
```

## Arquivos a modificar

1. `src/contexts/AuthContext.tsx` - adicionar debounce no handler de SIGNED_OUT com useRef

