
# Adicionar Menu de Acoes e Modal de Detalhes no Kanban

## Resumo

Adicionar um botao de 3 pontos (menu de acoes) em cada card do Kanban que abre o modal de detalhes do lead (LeadDetailsModal), permitindo visualizar informacoes completas e atribuir responsavel - mesma funcionalidade ja existente na tabela.

## Componentes a Reutilizar

O sistema ja possui os componentes necessarios:
- `LeadDetailsModal` - Modal com detalhes do lead e botao de atribuicao
- `AssignLeadDialog` - Dialog para atribuir lead (ja integrado no LeadDetailsModal)
- `useUserRole` - Hook para verificar permissoes de admin

## Alteracoes no Kanban.tsx

### 1. Novos Imports

Adicionar imports necessarios:
```typescript
import { MoreVertical } from "lucide-react";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

### 2. Novos Estados

Adicionar estados para controlar o modal de detalhes:
```typescript
const [isDetailsOpen, setIsDetailsOpen] = useState(false);
const [selectedLead, setSelectedLead] = useState<any>(null);
```

### 3. Handler para Abrir Detalhes

Criar funcao para abrir o modal de detalhes:
```typescript
const handleOpenDetails = (lead: any, e: React.MouseEvent) => {
  e.stopPropagation(); // Evita conflito com drag
  setSelectedLead(lead);
  setIsDetailsOpen(true);
};
```

### 4. Alterar o Card

Adicionar o menu de 3 pontos no card:

```text
┌─────────────────────────────┐
│ Nome do Lead          [⋮]  │  <- Botao 3 pontos
│ Investidor                  │
│ Cidade/UF                   │
│ Telefone                    │
│ Produto - Volume            │
│ [Badge Intencao]            │
└─────────────────────────────┘
```

O menu dropdown tera opcoes:
- Ver detalhes (abre LeadDetailsModal)
- Editar (abre formulario de edicao)

### 5. Adicionar LeadDetailsModal

Incluir o modal no final do componente:
```typescript
<LeadDetailsModal
  lead={selectedLead}
  isOpen={isDetailsOpen}
  onClose={() => {
    setIsDetailsOpen(false);
    setSelectedLead(null);
  }}
  onEdit={() => handleCardClick(selectedLead)}
  onLeadUpdated={fetchLeads}
/>
```

## Fluxo de Usuario

```text
Usuario ve card no Kanban
        │
        v
Clica no botao de 3 pontos (⋮)
        │
        v
Dropdown aparece:
  - Ver detalhes
  - Editar
        │
        v
Seleciona "Ver detalhes"
        │
        v
LeadDetailsModal abre
        │
        v
Se for admin, ve botao "Atribuir"
        │
        v
Pode atribuir lead ao usuario
```

## Arquivo a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/pages/Kanban.tsx` | Adicionar menu 3 pontos, estados e LeadDetailsModal |

## Detalhes Tecnicos

**Prevenir conflito com drag-and-drop:**
- O clique no menu usa `e.stopPropagation()` para nao iniciar o drag
- O dropdown menu tem `onPointerDown` para evitar que o card seja arrastado

**Responsividade:**
- Menu aparece no canto superior direito do card
- Dropdown alinhado a direita para nao sair da tela

**Reutilizacao:**
- O mesmo `LeadDetailsModal` da tabela e reutilizado
- A atribuicao e notificacao funcionam identicamente
