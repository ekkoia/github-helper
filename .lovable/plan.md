

# Equalizar altura do card "Leads por Assessor"

## Problema
O card "Leads por Assessor" tem o gráfico com `height={300}` enquanto o card "Etapas por Assessor" ao lado tem `height={350}` + legenda customizada abaixo, resultando em espaço vazio visível no primeiro card.

## Solução

### `src/components/equipe/EquipeCharts.tsx`

1. Aumentar a altura do `ResponsiveContainer` do gráfico "Leads por Assessor" de `300` para `350` (linha 166)
2. Adicionar `className="h-full"` nos dois cards da primeira linha para que o CSS grid os estique igualmente (ambos os `<Card>` ficam com altura igual automaticamente via `grid`)

Isso faz o gráfico ocupar mais espaço vertical e os cards ficarem alinhados.

