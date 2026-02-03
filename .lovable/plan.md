

# Implementar Visibilidade de Leads por Atribuição

## Problema Identificado

Atualmente a política RLS da tabela `leads` usa `USING (true)`, permitindo que todos os usuários autenticados vejam TODOS os leads. Precisamos implementar visibilidade baseada em atribuição.

## Regras de Visibilidade

```text
┌─────────────────────────────────────────────────────────────┐
│                    REGRAS DE VISIBILIDADE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ADMIN / GLOBAL:                                            │
│  ├── Vê TODOS os leads (com ou sem responsável)             │
│  ├── Pode editar qualquer lead                              │
│  ├── Pode excluir qualquer lead                             │
│  └── Pode atribuir leads a qualquer usuário                 │
│                                                             │
│  USER:                                                      │
│  ├── Vê APENAS leads onde responsavel_id = seu user_id      │
│  ├── NÃO vê leads sem responsável (NULL)                    │
│  ├── Pode editar apenas seus leads atribuídos               │
│  └── NÃO pode excluir leads                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Alterações no Banco de Dados

### Migration SQL - Novas Políticas RLS

```sql
-- Remover políticas existentes da tabela leads
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

-- SELECT: Admins veem tudo, users veem APENAS leads atribuídos a eles
CREATE POLICY "Users can view assigned leads"
ON leads FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) 
  OR responsavel_id = auth.uid()
);

-- INSERT: Qualquer usuário autenticado pode criar leads
CREATE POLICY "Authenticated users can create leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Admins podem atualizar qualquer lead, users apenas os atribuídos
CREATE POLICY "Users can update assigned leads"
ON leads FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) 
  OR responsavel_id = auth.uid()
);

-- DELETE: Apenas admins podem excluir leads
CREATE POLICY "Only admins can delete leads"
ON leads FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
```

**Diferença importante:** Removido `OR responsavel_id IS NULL` da política SELECT. Agora leads sem responsável são visíveis **apenas para admins**.

## Alterações no Frontend

### Arquivo: `src/pages/Dashboard.tsx`

Adicionar indicador visual do contexto de visualização:

```typescript
// Adicionar import
import { useUserRole } from "@/hooks/useUserRole";

// No componente, antes do return
const { isAdmin } = useUserRole();

// No JSX, após o DashboardHero
{!isAdmin && (
  <div className="bg-muted/50 rounded-lg p-3 mb-4">
    <p className="text-sm text-muted-foreground">
      📊 Exibindo métricas dos leads atribuídos a você
    </p>
  </div>
)}
```

### Arquivo: `src/pages/LeadsTable.tsx`

Atualizar o texto do contador de leads:

```typescript
// Adicionar import
import { useUserRole } from "@/hooks/useUserRole";

// No componente
const { isAdmin } = useUserRole();

// Atualizar o texto existente
<p className="text-sm text-muted-foreground">
  {filteredAndSortedLeads.length} lead{filteredAndSortedLeads.length !== 1 ? "s" : ""} 
  {isAdmin ? " no total" : " atribuído(s) a você"}
</p>
```

### Arquivo: `src/pages/Kanban.tsx`

Mesmo padrão:

```typescript
// Adicionar import
import { useUserRole } from "@/hooks/useUserRole";

// No componente
const { isAdmin } = useUserRole();

// Atualizar o texto existente
<p className="text-sm text-muted-foreground">
  {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} 
  {isAdmin ? " encontrado(s)" : " atribuído(s) a você"}
</p>
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migration SQL | Novas políticas RLS (sem visibilidade de NULL para users) |
| `src/pages/Dashboard.tsx` | Adicionar hook useUserRole e indicador visual |
| `src/pages/LeadsTable.tsx` | Adicionar hook useUserRole e atualizar texto |
| `src/pages/Kanban.tsx` | Adicionar hook useUserRole e atualizar texto |

## Comportamento Final

| Tipo de Lead | Admin/Global | User |
|--------------|--------------|------|
| `responsavel_id = NULL` | ✅ Visível | ❌ Não visível |
| `responsavel_id = outro_user` | ✅ Visível | ❌ Não visível |
| `responsavel_id = meu_user_id` | ✅ Visível | ✅ Visível |

## Fluxo de Atribuição

1. Lead entra via webhook → `responsavel_id = NULL`
2. Apenas admins veem o lead no CRM
3. Admin atribui lead a um usuário → `responsavel_id = user_id`
4. Notificação é criada para o usuário
5. Usuário agora vê o lead em seu Dashboard/Leads/Kanban

