

# Adicionar filtro por Assessor no Kanban (apenas admin)

## O que será feito

Adicionar um `Select` de filtro por assessor/responsável no Kanban, visível apenas para admin e global. O filtro aparecerá ao lado da barra de busca e permitirá filtrar os leads exibidos no board por responsável.

## Alterações

### `src/pages/Kanban.tsx`

1. **Novo estado** `filterResponsavel` (default `"all"`)
2. **Importar** `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` de `@/components/ui/select` e `User, AlertCircle` (já importados)
3. **Atualizar `filteredLeads`** — adicionar condição: se `filterResponsavel` !== `"all"`, filtrar por `lead.responsavel_id` (com suporte a `"unassigned"` para leads sem responsável)
4. **UI** — Entre o `GlobalSearch` e o header, adicionar um bloco condicional `{isAdmin && (...)}` com o Select contendo:
   - "Todos" (value `all`)
   - "Não atribuídos" (value `unassigned`)
   - Lista de usuários via `useUsers()` (já importado)

O select terá largura fixa (~220px) e ficará na mesma linha da barra de busca.

