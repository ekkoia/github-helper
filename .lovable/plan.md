## Objetivo
Ocultar do frontend todos os leads com `created_time_brasil` anterior a **02/06/2026**. Nada será apagado do banco; apenas filtro visual.

## Abordagem
Aplicar o corte na fonte única de leitura de leads: a função `fetchAllLeads()` em `src/lib/supabaseUtils.ts`. Assim todas as páginas que consomem leads (Dashboard, Leads/Tabela, Kanban, Equipe, Atividades, Analytics) herdam o filtro sem precisar tocar em nenhuma lógica de UI, métricas ou ordenação.

### Mudança
Em `fetchAllLeads()`, após o fetch paginado, filtrar:

```ts
const CUTOFF = "2026-06-02";
return allData.filter(l => {
  const d = (l.created_time_brasil ?? l.data_criacao ?? "").toString().substring(0, 10);
  return d >= CUTOFF;
});
```

- Usa `created_time_brasil` (padrão do projeto para timezone BR), com fallback para `data_criacao` se vazio.
- Comparação por string `YYYY-MM-DD` (segura e sem timezone).
- Leads sem nenhuma data são descartados (provavelmente lixo antigo).

### O que NÃO será alterado
- Nenhuma alteração no banco / RLS / edge functions.
- Nenhuma mudança em lógica de métricas, distribuição, kanban, automações ou webhooks.
- `webhook-lead` e demais integrações continuam inserindo normalmente; novos leads aparecem.
- Componentes que consultam `leadsNativo_feeagro` diretamente (ex.: filtro de campanhas em `FiltersSidebar`) ficam como estão — são apenas listas auxiliares, não exibem leads.

## Arquivo afetado
- `src/lib/supabaseUtils.ts` (uma única função)
