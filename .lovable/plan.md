

# Corrigir duplicatas e prevenir novas

## Problema

Existem 10 pares de leads duplicados no banco. A desduplicacao no trigger falha quando multiplos registros Meta chegam na mesma transacao (race condition). Alem disso, nao ha nenhuma protecao no frontend contra exibicao de duplicatas.

## Solucao em 3 frentes

### 1. Constraint unica no banco (prevencao definitiva)

Criar um indice unico parcial na coluna `email` (normalizado) para impedir fisicamente a insercao de duplicatas:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique_idx 
ON leads (lower(trim(email))) 
WHERE email IS NOT NULL AND email != '';
```

Atualizar o INSERT do trigger para usar `ON CONFLICT` com esse indice, fazendo merge automatico.

### 2. Limpeza dos duplicados atuais

Executar nova limpeza dos 10 pares duplicados existentes:
- Manter o registro mais antigo (menor data_criacao)
- Mesclar observacoes e origens do duplicado no registro mantido
- Deletar o registro duplicado

### 3. Corrigir bug do `split('T')` no LeadsTable

O arquivo `src/pages/LeadsTable.tsx` (linha 128) tem o mesmo bug ja corrigido no DashboardCharts:

```
// De:
const dateStr = lead.created_time_brasil.split('T')[0];

// Para:
const dateStr = lead.created_time_brasil.substring(0, 10);
```

## Detalhes tecnicos

### Migration SQL

**Parte A** - Limpar duplicatas atuais (mesma logica da migration anterior):

```sql
WITH ranked AS (
  SELECT id, email, observacoes, origens,
    ROW_NUMBER() OVER (PARTITION BY lower(trim(email)) ORDER BY data_criacao ASC) as rn
  FROM leads
  WHERE email IS NOT NULL AND email != ''
    AND lower(trim(email)) IN (
      SELECT lower(trim(email)) FROM leads
      WHERE email IS NOT NULL AND email != ''
      GROUP BY lower(trim(email)) HAVING COUNT(*) > 1
    )
)
-- merge obs dos duplicados no mais antigo, depois deletar rn > 1
```

**Parte B** - Criar indice unico parcial no email:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique_idx 
ON leads (lower(trim(email))) 
WHERE email IS NOT NULL AND email != '';
```

**Parte C** - Atualizar trigger `sync_meta_lead_to_crm` para usar `ON CONFLICT`:

O INSERT passa a incluir:
```sql
ON CONFLICT ((lower(trim(email)))) WHERE email IS NOT NULL AND email != ''
DO UPDATE SET
  observacoes = COALESCE(leads.observacoes, '') || E'\n[Meta Form merge] ' || EXCLUDED.observacoes,
  valor_produto = COALESCE(leads.valor_produto, EXCLUDED.valor_produto),
  ...
```

### Arquivo frontend

- `src/pages/LeadsTable.tsx` linha 128: trocar `split('T')[0]` por `substring(0, 10)`

## Resultado esperado

- Os 10 pares duplicados serao unificados
- Novos leads com mesmo email serao automaticamente mesclados pelo banco (constraint unica)
- O filtro de datas no LeadsTable funcionara corretamente com o novo formato de `created_time_brasil`

