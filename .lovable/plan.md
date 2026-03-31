

# Adicionar espaçamento no scrollbar da agenda (estilo Google Calendar)

## Problema

Na imagem de referência do Google Calendar, o scrollbar vertical tem um espaçamento/margem à direita do conteúdo, criando uma separação visual clara. Atualmente, o scrollbar da agenda fica colado ao conteúdo sem espaçamento.

## Alterações

### 1. `src/components/agenda/AgendaDayView.tsx`
- Na `ScrollArea`, adicionar padding-right no container interno do grid para criar espaço entre o conteúdo e o scrollbar (ex: `pr-3`)

### 2. `src/components/agenda/AgendaWeekView.tsx`
- Mesmo ajuste: adicionar padding-right no container do grid dentro da `ScrollArea`

### 3. `src/components/ui/scroll-area.tsx` (opcional)
- Aumentar a largura do scrollbar de `w-2.5` para `w-3` e adicionar margem lateral para dar mais respiro visual, similar ao Google Calendar

## Detalhes técnicos

- Adicionar `pr-3` ou `pr-4` na div do grid dentro de cada `ScrollArea` nas views Dia e Semana
- Ajustar o `ScrollBar` para ter um pouco mais de padding (`p-[2px]`) e margem

| Arquivo | Ação |
|---------|------|
| `src/components/agenda/AgendaDayView.tsx` | Adicionar padding-right no grid |
| `src/components/agenda/AgendaWeekView.tsx` | Adicionar padding-right no grid |

