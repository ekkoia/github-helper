

# Adicionar badge no nome do assessor no tooltip "Etapas por Assessor"

## Problema
No tooltip do gráfico "Etapas por Assessor", o nome do assessor (label) e as etapas listadas abaixo não têm distinção visual — tudo aparece com o mesmo estilo de texto.

## Solução

### `src/components/equipe/EquipeCharts.tsx`

Criar um componente de tooltip customizado para o gráfico "Etapas por Assessor" e passá-lo via `<Tooltip content={...} />`.

O tooltip customizado irá:
1. Renderizar o **nome do assessor** (prop `label`) dentro de um `<Badge>` (ou `<span>` estilizado como badge com `bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold`) para criar contraste visual
2. Listar as etapas abaixo com bolinha de cor + nome + valor, mantendo o estilo atual

```tsx
const EtapasTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle.contentStyle} className="p-3">
      <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-semibold mb-2">
        {label}
      </span>
      {payload.filter(p => p.value > 0).map(p => (
        <div className="flex items-center gap-2 text-sm" style={tooltipStyle.itemStyle}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};
```

Substituir `<Tooltip {...tooltipStyle} />` (linha 194) por `<Tooltip content={<EtapasTooltip />} />`.

Apenas 1 arquivo alterado: `src/components/equipe/EquipeCharts.tsx`.

