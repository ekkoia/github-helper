

# Corrigir UI das visualizações Semana e Dia na agenda

## Problemas identificados

1. **Horários cortados no topo**: O label da hora usa `-mt-2` que puxa o texto para cima, cortando na primeira hora
2. **Horários sobre a linha**: Labels ficam posicionados em cima da borda ao invés de alinhados ao centro da linha (como no Google Calendar)
3. **Range de horários errado**: Atual vai de 06:00–22:00, deveria ir de 01:00–23:00

## Solução

Seguir o padrão do Google Calendar: o label da hora fica **centralizado verticalmente na linha horizontal**, e o range cobre 01:00 a 23:00 (22 slots).

### Alterações em ambos os arquivos (`AgendaDayView.tsx` e `AgendaWeekView.tsx`)

1. **Mudar range**: `START_HOUR = 1`, `END_HOUR = 23` (gera array [1, 2, ..., 22] = 22 slots)
2. **Posicionar labels corretamente**: Ao invés de `-mt-2` (que corta), usar posicionamento onde o label fica **alinhado ao centro da borda** entre dois slots. Modelo Google Calendar: cada slot tem a borda no topo, e o label fica posicionado com `top: -8px` (metade da altura do texto) via `relative` no container do label, sem overflow hidden cortando.
3. **Adicionar padding-top** no container do grid para que o primeiro label (01:00) não fique cortado — um espaçador de ~8px no topo.

### Estrutura do label (estilo Google Calendar)

Cada célula de hora terá o label posicionado no topo da célula com `transform: translateY(-50%)` para centralizar na linha divisória. O container pai terá `overflow: visible` para não cortar.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/agenda/AgendaDayView.tsx` | Ajustar range 1-23, corrigir posição dos labels |
| `src/components/agenda/AgendaWeekView.tsx` | Ajustar range 1-23, corrigir posição dos labels |

