
# Implementar Atribuicao de Leads e Sistema de Notificacoes

## Resumo

Implementar a funcionalidade de atribuicao de leads com controle de acesso para admins e um sistema de notificacoes in-app para alertar usuarios quando um lead for atribuido a eles.

## Componentes da Solucao

### 1. Banco de Dados - Nova Tabela de Notificacoes

Criar tabela `notifications` para armazenar notificacoes dos usuarios:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: usuarios veem apenas suas proprias notificacoes
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins podem criar notificacoes para qualquer usuario
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Indice para performance
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, read) WHERE read = false;
```

### 2. Arquivos Frontend a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useNotifications.ts` | Hook para buscar, marcar como lida e contar notificacoes |
| `src/components/NotificationsPopover.tsx` | Popover com lista de notificacoes no header |
| `src/components/AssignLeadDialog.tsx` | Dialog para atribuir lead a um usuario |

### 3. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/integrations/supabase/types.ts` | Adicionar tipos da tabela notifications |
| `src/components/Layout.tsx` | Adicionar NotificationsPopover no header |
| `src/components/LeadDetailsModal.tsx` | Adicionar botao de atribuicao (apenas admins) |
| `src/pages/LeadsTable.tsx` | Adicionar coluna "Responsavel" na tabela |
| `src/pages/Kanban.tsx` | Mostrar responsavel nos cards |
| `src/hooks/useActivityLog.ts` | Adicionar tipo lead_assigned |

### 4. Hook de Notificacoes (useNotifications.ts)

```typescript
// Funcionalidades:
// - fetchNotifications(): buscar notificacoes do usuario
// - unreadCount: contador de nao lidas
// - markAsRead(id): marcar individual como lida
// - markAllAsRead(): marcar todas como lidas
// - createNotification(userId, title, message, type, metadata): criar notificacao
// - Realtime subscription para novas notificacoes
```

### 5. Componente NotificationsPopover

- Icone de sino com badge de contador no header
- Dropdown com lista de notificacoes recentes
- Click em notificacao marca como lida e navega (se aplicavel)
- Botao "Marcar todas como lidas"
- Link para ver historico completo

### 6. Dialog de Atribuicao (AssignLeadDialog)

- Select com lista de usuarios ativos (busca de profiles)
- Apenas visivel para admin/global
- Ao atribuir:
  1. Atualiza `responsavel_id` no lead
  2. Cria notificacao para o usuario atribuido
  3. Registra atividade no log

### 7. Fluxo de Atribuicao

```text
Admin abre LeadDetailsModal
      |
      v
Clica em "Atribuir" (botao visivel apenas para admins)
      |
      v
AssignLeadDialog abre com select de usuarios
      |
      v
Admin seleciona usuario e confirma
      |
      v
Sistema:
  1. UPDATE leads SET responsavel_id = X
  2. INSERT INTO notifications (user_id = X, ...)
  3. INSERT INTO user_activities (lead_assigned)
      |
      v
Usuario X recebe notificacao em tempo real
```

### 8. Detalhes Tecnicos

**Controle de Acesso:**
- Hook `useUserRole` verifica se usuario e admin/global
- Botao de atribuicao renderizado condicionalmente
- RLS no banco impede criacao de notificacoes por usuarios normais

**Realtime:**
- Subscription no canal de notificacoes filtrado por user_id
- Badge atualiza automaticamente quando nova notificacao chega

**Tipos de Notificacao:**
```typescript
type NotificationType = 
  | 'lead_assigned'  // Lead atribuido
  | 'info'           // Informativo geral
  | 'warning'        // Alerta
  | 'success';       // Sucesso
```

### 9. Interface Visual

**Header com Notificacoes:**
```text
┌──────────────────────────────────────────────────┐
│  [=] Sidebar    │  Boa tarde, Usuario!     [🔔3] │
└──────────────────────────────────────────────────┘
                                              │
                                              v
                               ┌────────────────────────┐
                               │  Notificacoes          │
                               ├────────────────────────┤
                               │ • Lead atribuido a voce│
                               │   Jose Silva           │
                               │   há 5 min             │
                               ├────────────────────────┤
                               │ • Lead atribuido a voce│
                               │   Maria Santos         │
                               │   há 1 hora            │
                               ├────────────────────────┤
                               │ [Marcar todas como     │
                               │  lidas]                │
                               └────────────────────────┘
```

**LeadDetailsModal com Atribuicao:**
```text
┌─────────────────────────────────────────┐
│ Detalhes do Lead            [Editar]   │
├─────────────────────────────────────────┤
│ Identificacao                           │
│ Nome: Jose Silva                        │
│ Email: jose@email.com                   │
│ Telefone: (11) 99999-9999              │
│                                         │
│ Responsavel: Nao atribuido [Atribuir]  │  <-- Apenas admins
│                                         │
│ ...                                     │
└─────────────────────────────────────────┘
```

### 10. Ordem de Implementacao

1. Criar migration para tabela notifications
2. Atualizar types.ts com novos tipos
3. Criar hook useNotifications
4. Criar componente NotificationsPopover
5. Adicionar popover no Layout/Header
6. Criar AssignLeadDialog
7. Atualizar LeadDetailsModal com botao de atribuicao
8. Atualizar LeadsTable para mostrar responsavel
9. Atualizar Kanban para mostrar responsavel
10. Testar fluxo completo

### 11. Seguranca

- RLS impede usuarios normais de criar notificacoes
- useUserRole valida permissao no frontend
- is_admin() valida permissao no backend
- Apenas o proprio usuario pode marcar suas notificacoes como lidas
