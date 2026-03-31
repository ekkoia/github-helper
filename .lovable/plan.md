

# Ajustar legenda do gráfico "Etapas por Assessor"

## Problema
A legenda do Recharts `<Legend />` está renderizando inline dentro do `ResponsiveContainer` de 300px, ficando amontoada quando há muitas etapas.

## Solução

### `src/components/equipe/EquipeCharts.tsx`

1. **Remover `<Legend />` de dentro do chart** (linha 168)
2. **Aumentar altura do ResponsiveContainer** de 300 para 350px para dar mais espaço ao gráfico
3. **Adicionar legenda customizada abaixo do gráfico** usando `<div className="flex flex-wrap gap-2 mt-4">` com badges/chips para cada etapa, mostrando bolinha de cor + nome da etapa em fonte pequena (text-xs). Usar as cores de `coresMap` ou `COLORS` como fallback — mesma lógica já usada nas `<Bar>`.

Resultado: legenda separada do gráfico, com layout flex-wrap que quebra linha naturalmente sem sobreposição.

