

# Visualização semanal e diária na agenda

## O que será feito

Adicionar alternância entre 3 modos de visualização (Mês / Semana / Dia) na página `/agenda`, com componentes dedicados para cada vista.

## Alterações

### 1. `src/pages/Agenda.tsx`
- Adicionar estado `viewMode: 'month' | 'week' | 'day'`
- Substituir navegação de mês por navegação genérica (prev/next adapta ao modo: mês, semana ou dia)
- Adicionar `ToggleGroup` com 3 opções (Mês, Semana, Dia) na barra de navegação
- Renderizar condicionalmente: `AgendaCalendar` (mês), `AgendaWeekView` (semana) ou `AgendaDayView` (dia)
- Ao clicar num dia na vista semanal/mensal, mudar para vista diária daquele dia

### 2. `src/components/agenda/AgendaWeekView.tsx` (novo)
- Grade de 7 colunas (dias da semana) x linhas de hora (06:00–22:00)
- Cabeçalho com dia da semana + número
- Eventos posicionados por horário (top/height calculados pelo start/end)
- Bloqueios exibidos como faixas vermelhas translúcidas
- Eventos all-day em barra no topo
- Click num slot vazio seleciona o dia/hora

### 3. `src/components/agenda/AgendaDayView.tsx` (novo)
- Grade de coluna única com linhas de hora (06:00–22:00)
- Eventos posicionados verticalmente pelo horário
- Bloqueios como faixas vermelhas
- Eventos all-day em barra superior
- Click num slot abre dialog de criação com hora preenchida

### 4. Navegação adaptativa em `Agenda.tsx`
- Modo mês: prev/next mês, título "março 2026"
- Modo semana: prev/next semana, título "24–30 mar 2026"
- Modo dia: prev/next dia, título "31 de março, terça-feira"
- Botão "Hoje" para voltar à data atual em qualquer modo

## Detalhes técnicos

- Ambas as vistas recebem as mesmas props: `events`, `blockedDays`, `selectedDate`, `onSelectDate`
- Slots de hora: div com `height: 60px` por hora, eventos posicionados com `position: absolute` e `top` calculado em minutos
- Usar `startOfWeek`/`endOfWeek` do date-fns (locale ptBR) para vista semanal
- Hora range: 06:00–22:00 (16 slots), com scroll para ver horários fora do range se houver eventos

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/agenda/AgendaWeekView.tsx` | Criar |
| `src/components/agenda/AgendaDayView.tsx` | Criar |
| `src/pages/Agenda.tsx` | Adicionar toggle de modo + navegação adaptativa + renderização condicional |

