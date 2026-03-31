

# Criar evento clicando em slot de horário vazio

## O que será feito

Ao clicar em um slot de horário vazio nas visualizações Semana e Dia, o dialog de criação de evento abrirá automaticamente com a data e hora do slot pré-preenchidas.

## Alterações

### 1. `src/pages/Agenda.tsx`
- Adicionar estado `defaultTime` (string | null) para armazenar o horário clicado
- Criar callback `handleSlotClick(date: Date, hour: number)` que define `currentDate`, `selectedDate`, `defaultTime` e abre o dialog com `editingEvent = null`
- Passar `defaultTime` ao `AgendaEventDialog`
- Limpar `defaultTime` quando o dialog fechar

### 2. `src/components/agenda/AgendaDayView.tsx`
- Adicionar prop `onSlotClick?: (hour: number) => void`
- Adicionar `onClick` handler em cada célula de hora no grid (as divs `border-t` com `height: HOUR_HEIGHT`), com `stopPropagation` nos eventos para não disparar ao clicar num evento existente
- Adicionar `cursor-pointer` e `hover:bg-muted/30` nas células vazias

### 3. `src/components/agenda/AgendaWeekView.tsx`
- Adicionar prop `onSlotClick?: (date: Date, hour: number) => void`
- Adicionar `onClick` handler em cada célula de hora de cada dia, passando o dia e a hora
- Adicionar `cursor-pointer` e `hover:bg-muted/30` nas células
- Impedir que cliques em eventos propaguem para o slot (`stopPropagation`)

### 4. `src/components/agenda/AgendaEventDialog.tsx`
- Aceitar prop opcional `defaultTime?: string | null`
- No `useEffect` de inicialização (quando `!event`), usar `defaultTime` ao invés do hardcoded `'09:00'` para `startTime`, e calcular `endTime` como hora seguinte

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/Agenda.tsx` | Estado defaultTime + callback + passar props |
| `src/components/agenda/AgendaDayView.tsx` | Prop onSlotClick + onClick nas células |
| `src/components/agenda/AgendaWeekView.tsx` | Prop onSlotClick + onClick nas células |
| `src/components/agenda/AgendaEventDialog.tsx` | Usar defaultTime para pré-preencher horário |

