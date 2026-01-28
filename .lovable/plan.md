
# Sincronizar Cores do Funil de Conversao com o Banco de Dados

## Problema Identificado

O grafico "Funil de Conversao" no Dashboard usa um mapa estatico de cores (`ETAPA_COLORS`) definido diretamente no codigo:

```typescript
const ETAPA_COLORS: Record<string, string> = {
  "Novo Lead": "hsl(211, 70%, 58%)",
  "Em atendimento IA": "hsl(85, 100%, 40%)",
  // ... cores fixas
};
```

Isso causa dois problemas:
1. Etapas novas criadas em Configuracoes nao tem cor mapeada (ficam com fallback)
2. Alteracoes de cor feitas no banco nao refletem no grafico

## Solucao

Usar o hook `useFunilEtapas` que ja existe e retorna as cores HEX diretamente do banco de dados.

## Alteracoes no src/components/DashboardCharts.tsx

### 1. Importar o hook

```typescript
import { useFunilEtapas } from "@/hooks/useFunilEtapas";
```

### 2. Remover o mapa estatico ETAPA_COLORS

Deletar as linhas 35-46 com o objeto `ETAPA_COLORS`.

### 3. Usar o hook no componente

```typescript
export const DashboardCharts = ({ leads }: DashboardChartsProps) => {
  const { coresMap } = useFunilEtapas();
  // ... resto do codigo
```

### 4. Atualizar o grafico de barras

**Antes:**
```typescript
<Cell key={`cell-${index}`} fill={ETAPA_COLORS[entry.etapa] || "hsl(204, 12%, 90%)"} />
```

**Depois:**
```typescript
<Cell key={`cell-${index}`} fill={coresMap[entry.etapa] || "#6b7280"} />
```

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/DashboardCharts.tsx` | Usar cores dinamicas do banco via useFunilEtapas |

## Resultado Esperado

As cores das barras no grafico "Funil de Conversao" serao identicas as cores das colunas do Kanban, ambas vindas da tabela `funil_etapas` do banco de dados.
