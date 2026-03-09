

# Diagnóstico: Total de Leads travado em 1000

## Causa raiz

O Supabase tem um **limite padrão de 1000 linhas** por consulta. Todas as queries de leads no projeto usam `.select("*")` sem especificar `.range()` ou limite, o que faz o Supabase retornar no máximo 1000 registros silenciosamente.

Isso afeta 3 páginas principais:
- **Dashboard** (`src/pages/Dashboard.tsx`, linha 24-27)
- **LeadsTable** (`src/pages/LeadsTable.tsx`, linha 138-141)
- **Kanban** (`src/pages/Kanban.tsx`, linha 117-120)

## Solução

Usar paginação com `.range()` em um loop para buscar todos os registros, ou usar a opção `count: 'exact'` com `head: true` para métricas que só precisam de contagem.

### Abordagem: Fetch paginado no cliente

Criar uma função utilitária `fetchAllLeads` que busca em lotes de 1000:

```typescript
async function fetchAllLeads() {
  const pageSize = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("data_criacao", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    allData = [...allData, ...(data || [])];
    hasMore = (data?.length || 0) === pageSize;
    from += pageSize;
  }
  return allData;
}
```

### Arquivos a alterar

1. **`src/lib/supabaseUtils.ts`** (novo) -- Criar a função `fetchAllLeads` reutilizável
2. **`src/pages/Dashboard.tsx`** -- Substituir query direta por `fetchAllLeads()`
3. **`src/pages/LeadsTable.tsx`** -- Substituir query direta por `fetchAllLeads()`
4. **`src/pages/Kanban.tsx`** -- Substituir query direta por `fetchAllLeads()`

Alteração mínima: uma função utilitária nova e 3 substituições de chamada. Sem mudanças de banco de dados.

