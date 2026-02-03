

# Gestão de Atribuições para Admin e Global Admin

## Visão Geral

Implementar ferramentas de gestão de atribuições que permitam aos administradores:
1. Visualizar rapidamente quem é o responsável por cada lead
2. Filtrar leads por responsável (incluindo leads não atribuídos)
3. Atribuir leads em massa ou individualmente de forma rápida

## Alterações Propostas

### 1. Adicionar Coluna "Responsável" na Tabela de Leads

Na página LeadsTable, adicionar uma nova coluna visível **apenas para admins** mostrando quem é o responsável por cada lead.

**Arquivo:** `src/pages/LeadsTable.tsx`

- Buscar dados do responsável junto com os leads
- Adicionar coluna "Responsável" no header e nas linhas da tabela
- Mostrar "Não atribuído" com destaque visual para leads sem responsável
- Botão de atribuição rápida diretamente na tabela

### 2. Adicionar Filtro por Responsável no FiltersSidebar

Adicionar um novo filtro no painel lateral para admins filtrarem leads por:
- Todos os leads
- Leads não atribuídos
- Leads de um usuário específico

**Arquivo:** `src/components/FiltersSidebar.tsx`

- Adicionar select com lista de usuários
- Opção "Não atribuídos" para ver leads pendentes
- Visível apenas para admins

### 3. Mostrar Responsável nos Cards do Kanban

Adicionar indicação visual do responsável nos cards do Kanban para admins.

**Arquivo:** `src/pages/Kanban.tsx`

- Mostrar avatar/nome do responsável no card
- Indicação visual para cards sem responsável

### 4. Criar Hook para Buscar Usuários com Cache

Criar um hook reutilizável para buscar a lista de usuários (para usar em filtros e atribuições).

**Arquivo:** `src/hooks/useUsers.ts` (novo)

```typescript
export const useUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Buscar perfis do Supabase
  // Cachear resultado para evitar requisições repetidas
  
  return { users, loading, usersMap };
};
```

## Detalhes Técnicos

### Estrutura do Filtro por Responsável

```text
┌─────────────────────────────────────────┐
│ Responsável                             │
├─────────────────────────────────────────┤
│  [▼] Todos                              │
│      ─────────────────────────          │
│      ⚠️ Não atribuídos                   │
│      ─────────────────────────          │
│      👤 Ana Carolina Goulart            │
│      👤 Rodolfo Felipe Saavedra         │
│      👤 Lucas Silva                     │
│      ...                                │
└─────────────────────────────────────────┘
```

### Nova Coluna na Tabela (Admins)

| Nome | Contato | Responsável | Etapa | Ações |
|------|---------|-------------|-------|-------|
| João Silva | ... | 👤 Ana Carolina | Novo Lead | ... |
| Maria Santos | ... | ⚠️ Não atribuído | Qualificação | ... |

### Visual do Card Kanban (Admins)

```text
┌─────────────────────────────────┐
│ João Silva                    ⋮ │
├─────────────────────────────────┤
│ 📍 São Paulo/SP                 │
│ 📞 (11) 99999-9999              │
├─────────────────────────────────┤
│ 👤 Ana Carolina          [🔄]   │  ← Novo: responsável + botão trocar
└─────────────────────────────────┘
```

Para leads não atribuídos:
```text
│ ⚠️ Não atribuído        [➕]   │  ← Destaque amarelo + botão atribuir
```

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Alteração |
|---------|------|-----------|
| `src/hooks/useUsers.ts` | Novo | Hook para buscar e cachear lista de usuários |
| `src/components/FiltersSidebar.tsx` | Modificar | Adicionar filtro por responsável (somente admin) |
| `src/pages/LeadsTable.tsx` | Modificar | Adicionar coluna responsável + buscar dados + filtro |
| `src/pages/Kanban.tsx` | Modificar | Mostrar responsável nos cards + botão atribuir rápido |

## Fluxo de Uso para Admin

1. Admin acessa `/leads`
2. Vê a coluna "Responsável" na tabela
3. Usa filtro "Não atribuídos" para ver leads pendentes
4. Clica no botão de atribuir na linha ou abre detalhes
5. Seleciona usuário e confirma
6. Lead some da lista de "Não atribuídos" e aparece para o usuário atribuído

## Benefícios

- **Visibilidade**: Admin sabe instantaneamente quem está cuidando de cada lead
- **Gestão**: Filtrar leads não atribuídos para distribuição
- **Eficiência**: Atribuir sem precisar abrir modal de detalhes
- **Organização**: Visualizar carga de trabalho por usuário

