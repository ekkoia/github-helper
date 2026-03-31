

# Popover de detalhes do evento ao clicar (estilo Google Calendar)

## O que será feito

Ao clicar em um evento nas visualizações Semana, Dia ou Calendário Mensal, abrir um **popover flutuante** (não um dialog modal) posicionado próximo ao evento clicado, exibindo os detalhes do evento com ações rápidas (editar, excluir), similar ao Google Calendar.

## Alterações

### 1. Novo componente: `src/components/agenda/AgendaEventPopover.tsx`

Popover flutuante com:
- **Header**: botões de ação (editar via lápis, excluir via lixeira, fechar via X) alinhados no topo direito
- **Corpo**:
  - Bolinha colorida (cor do tipo) + título do evento em destaque
  - Data por extenso + horário (ex: "Terça-feira, 30 de dezembro de 2025 · 15:00 – 21:00")
  - Descrição (se houver)
  - Ícone sino + lembrete (ex: "30 minutos antes")
  - Ícone lead + nome do lead vinculado (se houver)
  - Ícone funil + etapa do funil com bolinha colorida (se houver)
  - Ícone assessor + nome do assessor
- Props: `event`, `anchorRect` (posição do click), `onClose`, `onEdit`, `onDelete`, `usersMap`, `leadsMap`, `coresMap`
- Renderizado com `position: fixed` usando coordenadas do click, com lógica para não sair da tela

### 2. `src/pages/Agenda.tsx`
- Adicionar estado `popoverEvent: AgendaEvent | null` e `popoverAnchor: { x, y } | null`
- Criar `handleEventClick(event, mouseEvent)` que salva o evento e as coordenadas do click
- Fechar popover ao clicar fora, ao abrir dialog de edição, ou ao pressionar Escape
- Botão "Editar" no popover → fecha popover, abre `AgendaEventDialog` com o evento
- Botão "Excluir" no popover → confirma e exclui

### 3. `src/components/agenda/AgendaWeekView.tsx`
- Adicionar prop `onEventClick?: (event: AgendaEvent, e: React.MouseEvent) => void`
- No `onClick` dos cards de evento, chamar `onEventClick` ao invés de apenas `stopPropagation`

### 4. `src/components/agenda/AgendaDayView.tsx`
- Substituir chamada direta a `onEdit` por `onEventClick` (mesma assinatura com MouseEvent)
- Manter `onEdit` como fallback se `onEventClick` não for fornecido

### 5. `src/components/agenda/AgendaCalendar.tsx`
- Adicionar prop `onEventClick` para capturar cliques em eventos dentro do calendário mensal

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/agenda/AgendaEventPopover.tsx` | Criar |
| `src/pages/Agenda.tsx` | Integrar popover + estado |
| `src/components/agenda/AgendaWeekView.tsx` | Adicionar prop onEventClick |
| `src/components/agenda/AgendaDayView.tsx` | Adicionar prop onEventClick |
| `src/components/agenda/AgendaCalendar.tsx` | Adicionar prop onEventClick |

