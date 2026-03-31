

# Página /agenda — Calendário + Lembretes + Agendamentos

## Visão geral

Criar uma página de agenda no CRM com calendário visual, onde eventos podem ser criados manualmente, via automações internas (mudanças de etapa, atribuição de leads) e via API externa (IA/n8n). Admins veem tudo, usuários veem apenas eventos dos seus leads.

## Banco de dados

### Nova tabela: `agenda_events`

```sql
CREATE TABLE public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'manual',  -- manual, automation, external
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean DEFAULT false,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,  -- assessor responsável / dono do evento
  created_by uuid,        -- quem criou (null = sistema)
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

-- Admins veem tudo
CREATE POLICY "Admins can manage all events"
  ON public.agenda_events FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Usuários veem/gerenciam apenas seus eventos
CREATE POLICY "Users can view own events"
  ON public.agenda_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own events"
  ON public.agenda_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own events"
  ON public.agenda_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own events"
  ON public.agenda_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER update_agenda_events_updated_at
  BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Edge Function: `webhook-agenda`

Endpoint para receber agendamentos externos (IA/n8n):
- Protegido por `x-api-key` (reutiliza `WEBHOOK_API_KEY`)
- Aceita payload com: `title`, `description`, `start_at`, `end_at`, `lead_id` ou `lead_email`/`lead_telefone` (para lookup), `user_id` ou busca pelo `responsavel_id` do lead
- Insere na `agenda_events` com `event_type = 'external'`
- Usa service role para bypass RLS

### Automações internas (ajuste na edge function `lead-automations`)

Quando o sistema mover lead para recontato ou gerar alerta de 2h, também criar um evento na `agenda_events` com `event_type = 'automation'` para o `responsavel_id` do lead.

## Frontend

### Estrutura de arquivos

```text
src/pages/Agenda.tsx              (página principal)
src/components/agenda/AgendaCalendar.tsx   (calendário visual)
src/components/agenda/AgendaEventDialog.tsx (criar/editar evento)
src/components/agenda/AgendaEventList.tsx   (lista lateral do dia selecionado)
src/hooks/useAgendaEvents.ts      (CRUD + realtime subscription)
```

### `src/pages/Agenda.tsx`

- Layout com `<Layout>` wrapper (como todas as outras páginas)
- Calendário mensal usando componente customizado baseado em date-fns (não o DayPicker pequeno — um grid mensal completo)
- Ao clicar em um dia, mostra lista de eventos daquele dia no painel lateral direito
- Botão "Novo evento" abre dialog para criação manual
- Filtros: por assessor (admin only), por tipo de evento
- Indicadores visuais nos dias com eventos (bolinhas coloridas por tipo)

### `src/hooks/useAgendaEvents.ts`

- Fetch eventos do mês visível
- Realtime subscription para updates automáticos
- CRUD: criar, editar, deletar eventos
- Filtragem por assessor (admin) e tipo

### `src/components/agenda/AgendaCalendar.tsx`

- Grid mensal customizado (7 colunas, ~6 linhas)
- Cada célula mostra até 2-3 eventos truncados + "+N mais"
- Cores por tipo: azul (manual), verde (external), amarelo (automation)
- Navegação mês anterior/próximo

### `src/components/agenda/AgendaEventDialog.tsx`

- Form com: título, descrição, data/hora início, data/hora fim, dia inteiro toggle
- Select de lead (busca por nome) — opcional
- Select de assessor (admin only — default = usuário logado)

### `src/components/agenda/AgendaEventList.tsx`

- Lista de eventos do dia selecionado
- Badge de tipo (Manual, Automação, Externo)
- Nome do lead linkado (se houver)
- Ações: editar, excluir

### Routing e Sidebar

- Adicionar rota `/agenda` em `App.tsx` com `<ProtectedRoute>`
- Adicionar item "Agenda" no `coreItems` do sidebar (ícone `CalendarDays`) — visível para todos os usuários

## Resumo de alterações

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `agenda_events` + RLS |
| `supabase/functions/webhook-agenda/index.ts` | Criar |
| `supabase/functions/lead-automations/index.ts` | Editar (adicionar criação de eventos) |
| `src/pages/Agenda.tsx` | Criar |
| `src/components/agenda/AgendaCalendar.tsx` | Criar |
| `src/components/agenda/AgendaEventDialog.tsx` | Criar |
| `src/components/agenda/AgendaEventList.tsx` | Criar |
| `src/hooks/useAgendaEvents.ts` | Criar |
| `src/App.tsx` | Adicionar rota `/agenda` |
| `src/components/AppSidebar.tsx` | Adicionar item "Agenda" |

