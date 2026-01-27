
# Plano: Corrigir Erro de Convite de Usuarios

## Diagnostico

Apos investigacao detalhada, identifiquei que:

1. **A Edge Function funciona corretamente** - testes diretos retornam status 200
2. **A requisicao do frontend nao chega ao servidor** - nos logs do Supabase, nao ha registro da chamada que falhou as 13:27:30
3. **Tempo de execucao elevado** - a funcao leva ~5 segundos (gerar link + enviar email)
4. **Erro generico no frontend** - o erro "Failed to send a request to the Edge Function" e muito vago

## Causa Raiz

O problema esta relacionado a uma combinacao de:
- Timeout ou instabilidade de rede transitoria
- Falta de tratamento de erro especifico para diferentes tipos de falha
- Ausencia de retry automatico para falhas de rede

---

## Solucao Proposta

### 1. Melhorar Headers CORS na Edge Function
**Arquivo:** `supabase/functions/invite-user/index.ts`

Adicionar headers CORS mais completos para garantir compatibilidade:

```text
Antes:
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"

Depois:
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, accept-language, x-authorization"
"Access-Control-Allow-Methods": "POST, OPTIONS"
"Access-Control-Max-Age": "86400"
```

### 2. Implementar Tratamento de Erro Especifico
**Arquivo:** `src/components/CreateUserDialog.tsx`

Usar os tipos de erro do Supabase para mensagens mais claras:

```text
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'

if (error instanceof FunctionsFetchError) {
  // Erro de rede - sugerir tentar novamente
} else if (error instanceof FunctionsRelayError) {
  // Erro no relay - problema temporario
} else if (error instanceof FunctionsHttpError) {
  // Erro HTTP - ler resposta do servidor
}
```

### 3. Adicionar Retry Automatico
**Arquivo:** `src/components/CreateUserDialog.tsx`

Implementar logica de retry para falhas de rede:

```text
const invokeWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await supabase.functions.invoke('invite-user', { body });
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000 * (i + 1)); // backoff exponencial
    }
  }
}
```

### 4. Adicionar Feedback Visual Melhorado
**Arquivo:** `src/components/CreateUserDialog.tsx`

- Mostrar mensagem de "Processando..." durante a espera
- Indicar claramente quando houve falha de rede vs erro do servidor
- Adicionar botao "Tentar Novamente" em caso de falha de rede

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/invite-user/index.ts` | Headers CORS mais completos |
| `src/components/CreateUserDialog.tsx` | Tratamento de erro especifico + retry |

---

## Fluxo Apos Correcao

```text
[Usuario clica "Enviar Convite"]
          |
          v
[Tentativa 1 - invoke Edge Function]
          |
    [Sucesso?]
      /      \
   Sim        Nao
    |          |
    v          v
[Toast       [Retry com backoff]
 sucesso]          |
                   v
           [Tentativa 2]
                   |
              [Sucesso?]
                /     \
             Sim       Nao
              |         |
              v         v
          [Toast    [Tentativa 3]
           sucesso]     |
                        v
                   [Sucesso?]
                     /     \
                  Sim       Nao
                   |         |
                   v         v
              [Toast    [Toast erro:
               sucesso]  "Problema de rede,
                         tente novamente"]
```

---

## Beneficios

1. **Maior confiabilidade** - retries automaticos lidam com falhas transitorias
2. **Melhor UX** - mensagens de erro claras e acionaveis
3. **Debugging facilitado** - logs especificos por tipo de erro
4. **Compatibilidade CORS** - headers completos previnem bloqueios
