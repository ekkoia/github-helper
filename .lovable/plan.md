# Corrigir "Erro ao atualizar status da IA"

## Causa raiz

A tabela `public.dados_cliente` tem apenas um **índice único parcial** em `telefone`:

```
CREATE UNIQUE INDEX dados_cliente_telefone_unique
  ON public.dados_cliente (telefone) WHERE telefone IS NOT NULL;
```

O `.upsert({...}, { onConflict: "telefone" })` do supabase-js gera um `ON CONFLICT (telefone)` **sem** a cláusula `WHERE`, e o PostgreSQL rejeita — índices únicos parciais só são elegíveis para `ON CONFLICT` quando o predicado é repetido exatamente. Resultado: toda chamada ao botão retorna erro, independente do registro já existir ou não.

A migração anterior tentou criar `UNIQUE (telefone)`, mas provavelmente falhou por já existir o índice parcial e/ou linhas com `telefone` nulo, e ficamos só com o índice parcial antigo.

## Correção

1. Limpar dados que impedem uma constraint única total:
   - Remover linhas com `telefone IS NULL` (não são úteis para o toggle da IA).
   - Deduplicar registros com mesmo `telefone` (manter o mais recente por `id`/`created_at`).
2. Dropar o índice parcial `dados_cliente_telefone_unique`.
3. Criar `ALTER TABLE public.dados_cliente ADD CONSTRAINT dados_cliente_telefone_key UNIQUE (telefone);` — constraint completa, elegível para `ON CONFLICT`.
4. Nenhuma mudança no frontend: `ChatWindow.tsx` já usa `upsert(..., { onConflict: "telefone" })` e passará a funcionar.

## Detalhes técnicos

- Verificar antes da migração quantos duplicados existem para preservar o registro correto (o com `atendimento_ia` definido mais recente, quando houver).
- Manter a política RLS atual (`authenticated` full access) — não é a causa do erro.
- Depois de aplicar, testar clicando "Pausar IA" em um número sem registro e em um já existente para confirmar insert e update.
