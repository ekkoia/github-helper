

# Alteração em massa de leads na tabela

## O que será adicionado

Um sistema de seleção múltipla na tabela de leads com uma barra de ações em massa que permite alterar etapa do funil, responsável ou excluir vários leads de uma vez.

## Como funciona para o usuário

1. Uma coluna de checkbox aparece à esquerda de cada linha da tabela
2. Um checkbox no header seleciona/deseleciona todos os leads da página atual
3. Ao selecionar 1+ leads, uma barra flutuante aparece no topo com:
   - Contador de leads selecionados
   - Botao "Alterar Etapa" -- abre select com etapas do funil
   - Botao "Atribuir Responsável" -- abre select com usuários (apenas admin)
   - Botao "Excluir" -- com confirmação via AlertDialog
   - Botao "Limpar seleção"

## Detalhes técnicos

### Arquivo: `src/pages/LeadsTable.tsx`

**Novos estados:**
- `selectedLeadIds: Set<string>` -- IDs dos leads selecionados
- `isBulkStageOpen: boolean` -- popover de alterar etapa
- `isBulkAssignOpen: boolean` -- popover de atribuir responsável
- `isBulkDeleteOpen: boolean` -- dialog de confirmação de exclusão em massa

**Nova coluna checkbox:**
- Header: checkbox "selecionar todos" (toggles todos da página atual)
- Cada row: checkbox individual com `stopPropagation` para não abrir o modal de detalhes

**Barra de ações em massa:**
- Aparece condicionalmente quando `selectedLeadIds.size > 0`
- Posicionada como sticky/fixed acima da tabela
- Estilizada com `bg-primary text-primary-foreground`

**Funções de ação em massa:**
- `handleBulkStageChange(etapa)`: UPDATE em batch via Supabase `.in('id', [...ids])`, log de atividade, refresh
- `handleBulkAssign(userId)`: UPDATE `responsavel_id` em batch, notificação ao usuário, log
- `handleBulkDelete()`: DELETE em batch (apenas admin), confirmação, log
- Todas limpam a seleção e chamam `fetchLeads()` ao final

**Imports adicionais:** `Checkbox` de `@/components/ui/checkbox`, `CheckSquare` de lucide-react

### Permissões
- Alterar etapa: todos os usuários autenticados (RLS já permite update para leads atribuídos ou admin)
- Atribuir responsável: apenas admin
- Excluir em massa: apenas admin (RLS já restringe DELETE a admins)

