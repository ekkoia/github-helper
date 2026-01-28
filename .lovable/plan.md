
# Usar Topo da Faixa de Investimento

## Entendimento

Os leads possuem valores fixos salvos (R$ 10.000, R$ 30.000, R$ 75.000, R$ 100.000), mas você quer que ao exibir e somar, sempre considere o **teto da faixa** correspondente:

| Valor Salvo | Faixa | Exibir/Somar |
|-------------|-------|--------------|
| R$ 10.000 | até R$10 mil | R$ 10.000 |
| R$ 30.000 | de R$10 mil a R$50 mil | R$ 50.000 |
| R$ 75.000 | de R$50 mil a R$100 mil | R$ 100.000 |
| R$ 100.000 | acima de R$100 mil | R$ 100.000 (mantém) |

## Alterações

### 1. Criar Função Utilitária

Criar uma função reutilizável para converter valor salvo → topo da faixa:

```typescript
// src/lib/investmentUtils.ts
export const getTopoDaFaixa = (valor: number): number => {
  if (valor <= 10000) return 10000;
  if (valor <= 50000) return 50000;
  if (valor <= 100000) return 100000;
  return valor; // Acima de 100k, mantém o valor real
};
```

### 2. Dashboard Page (`src/pages/Dashboard.tsx`)

Atualizar cálculo do Total Investido para usar o topo da faixa:

```typescript
import { getTopoDaFaixa } from "@/lib/investmentUtils";

const valorTotalInvestido = leads.reduce((sum, lead) => {
  const valor = parseFloat(lead.valor_produto) || 0;
  return sum + getTopoDaFaixa(valor);
}, 0);
```

### 3. LeadsTable Page (`src/pages/LeadsTable.tsx`)

**Card KPI - Total Investido:**
```typescript
import { getTopoDaFaixa } from "@/lib/investmentUtils";

const valorTotal = leads.reduce((acc, lead) => {
  const valor = parseFloat(lead.valor_produto) || 0;
  return acc + getTopoDaFaixa(valor);
}, 0);
```

**Coluna Valor Investido na Tabela:**
```typescript
<TableCell>
  {lead.valor_produto 
    ? new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(getTopoDaFaixa(parseFloat(lead.valor_produto)))
    : "-"
  }
</TableCell>
```

### 4. DashboardCharts (`src/components/DashboardCharts.tsx`)

Atualizar o gráfico "Total Investido por Faixa" para usar o topo da faixa:

```typescript
import { getTopoDaFaixa } from "@/lib/investmentUtils";

const totalPorFaixaData = useMemo(() => {
  const faixas: Record<string, number> = {
    "até R$10 mil": 0,
    "de R$10 mil a R$50 mil": 0,
    "de R$50 mil a R$100 mil": 0,
    "acima de R$100 mil": 0
  };
  
  filteredLeads.forEach(lead => {
    const valorOriginal = parseFloat(lead.valor_produto) || 0;
    const valorTopo = getTopoDaFaixa(valorOriginal);
    
    if (valorOriginal <= 10000) faixas["até R$10 mil"] += valorTopo;
    else if (valorOriginal <= 50000) faixas["de R$10 mil a R$50 mil"] += valorTopo;
    else if (valorOriginal <= 100000) faixas["de R$50 mil a R$100 mil"] += valorTopo;
    else faixas["acima de R$100 mil"] += valorTopo;
  });

  return Object.entries(faixas)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
}, [filteredLeads]);
```

## Exemplo de Cálculo

### Antes (soma dos valores reais):
- 43 leads × R$ 10.000 = R$ 430.000
- 21 leads × R$ 30.000 = R$ 630.000
- 12 leads × R$ 75.000 = R$ 900.000
- 19 leads × R$ 100.000 = R$ 1.900.000
- **Total: R$ 3.860.000**

### Depois (soma usando topo da faixa):
- 43 leads × R$ 10.000 = R$ 430.000
- 21 leads × R$ 50.000 = R$ 1.050.000
- 12 leads × R$ 100.000 = R$ 1.200.000
- 19 leads × R$ 100.000 = R$ 1.900.000
- **Total: R$ 4.580.000**

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/investmentUtils.ts` | Criar função `getTopoDaFaixa()` |
| `src/pages/Dashboard.tsx` | Usar `getTopoDaFaixa()` no cálculo do total |
| `src/pages/LeadsTable.tsx` | Usar `getTopoDaFaixa()` no KPI e na coluna da tabela |
| `src/components/DashboardCharts.tsx` | Usar `getTopoDaFaixa()` no gráfico de pizza |
