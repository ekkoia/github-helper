

# Bloqueio de agenda — indisponibilidade por colaborador

## O que será feito

Permitir que colaboradores (ou admins) marquem dias/períodos como indisponíveis na agenda. Dias bloqueados aparecerão visualmente no calendário e impedirão a criação de eventos nesses períodos.

## Alterações

### 1. Migration SQL — Nova tabela `agenda_blocks`

```sql
CREATE TABLE agenda_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  block_date date NOT NULL,
  start_time time DEFAULT NULL,
  end_time time DEFAULT NULL,
  all_day boolean DEFAULT true,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, block_date, start_time)
);

ALTER TABLE agenda_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocks" ON agenda_blocks
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all blocks" ON agenda_blocks
  FOR ALL TO authenticated USING (is_admin(auth.uid()));
```

- `all_day = true`: dia inteiro bloqueado
- `all_day = false` + `start_time/end_time`: faixa horária específica bloqueada
- `reason`: motivo opcional (folga, férias, etc.)

### 2. Hook `src/hooks/useAgendaBlocks.ts` (novo)

- Busca bloqueios do mês visível (range igual ao do calendário)
- CRUD: `createBlock`, `deleteBlock`
- Filtra por `user_id` (admin vê todos, usuário vê os seus)
- Realtime subscription na tabela `agenda_blocks`

### 3. `src/components/agenda/AgendaCalendar.tsx`

- Receber prop `blockedDays: Record<string, AgendaBlock[]>`
- Dias bloqueados: fundo com hachura/padrão vermelho sutil (`bg-red-50 dark:bg-red-950/30`) + indicador visual (ícone 🚫 ou barra vermelha)
- Tooltip ou label "Indisponível" no dia

### 4. `src/components/agenda/AgendaBlockDialog.tsx` (novo)

Dialog para marcar indisponibilidade:
- Data (preenchida com o dia selecionado)
- Dia inteiro (switch) ou faixa horária (início/fim)
- Motivo (campo texto opcional)
- Se admin: seletor de assessor

### 5. `src/components/agenda/AgendaEventList.tsx`

- Mostrar bloqueios do dia selecionado no painel lateral (badge vermelha "Indisponível" com horário e motivo)
- Botão para remover bloqueio

### 6. `src/pages/Agenda.tsx`

- Integrar `useAgendaBlocks`
- Adicionar botão "Bloquear dia" ao lado do "Novo evento"
- Passar `blockedDays` ao `AgendaCalendar`
- Validação: ao criar evento, verificar se o horário conflita com bloqueio e exibir aviso

### 7. `src/components/agenda/AgendaEventDialog.tsx`

- Receber prop `blockedDays`
- Ao selecionar data/hora, verificar se conflita com bloqueio
- Exibir alerta amarelo "Este horário está marcado como indisponível" (não impede, apenas avisa)

### 8. Registro de atividade

- `logActivity('agenda_block_created', ...)` e `logActivity('agenda_block_deleted', ...)`
- Adicionar tipos em `useActivityLog.ts`

## Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabela `agenda_blocks` + RLS |
| `src/hooks/useAgendaBlocks.ts` | Criar |
| `src/hooks/useActivityLog.ts` | Adicionar tipos de bloqueio |
| `src/components/agenda/AgendaBlockDialog.tsx` | Criar |
| `src/components/agenda/AgendaCalendar.tsx` | Indicação visual de dias bloqueados |
| `src/components/agenda/AgendaEventList.tsx` | Mostrar bloqueios no painel lateral |
| `src/components/agenda/AgendaEventDialog.tsx` | Aviso de conflito com bloqueio |
| `src/pages/Agenda.tsx` | Integrar hook + botão + validação |

