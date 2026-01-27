

# Substituir Gráfico "Volume Total por Grão" por Contexto de Investimento

## Situação Atual

O gráfico "Volume Total por Grão" exibe:
- **Dados**: Soma de `volume` (sacas) agrupado por `tipo_grao` (Soja, Milho)
- **Problema**: Leads vindos do Meta Form não possuem `tipo_grao` nem `volume` - possuem `valor_investimento`/`valor_produto`

## Opções de Substituição

### Opção 1: Investimento por Faixa de Valor (Recomendado)
Mostrar quantos leads existem em cada faixa de investimento:
- até R$10 mil
- de R$10 mil a R$50 mil  
- de R$50 mil a R$100 mil
- acima de R$100 mil

### Opção 2: Total Investido por Origem
Mostrar valor total investido agrupado por origem do lead (Meta Form, Manual, etc.)

### Opção 3: Total Investido por Etapa do Funil
Mostrar quanto de investimento está em cada etapa do funil (Novo Lead, Em Atendimento IA, etc.)

## Implementação (Opção 1 - Leads por Faixa de Investimento)

### Arquivo: `src/components/DashboardCharts.tsx`

**Atualizar o cálculo de dados (linhas 166-180):**

```typescript
// Dados para distribuição por faixa de investimento
const investimentoData = useMemo(() => {
  const faixas: Record<string, number> = {
    "até R$10 mil": 0,
    "de R$10 mil a R$50 mil": 0,
    "de R$50 mil a R$100 mil": 0,
    "acima de R$100 mil": 0
  };
  
  filteredLeads.forEach(lead => {
    const valor = parseFloat(lead.valor_produto) || 0;
    
    if (valor <= 10000) faixas["até R$10 mil"]++;
    else if (valor <= 50000) faixas["de R$10 mil a R$50 mil"]++;
    else if (valor <= 100000) faixas["de R$50 mil a R$100 mil"]++;
    else if (valor > 100000) faixas["acima de R$100 mil"]++;
  });

  return Object.entries(faixas)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
}, [filteredLeads]);
```

**Atualizar cores (linha ~53):**

```typescript
const INVESTIMENTO_COLORS = [
  "hsl(85, 100%, 40%)",   // Verde vibrante
  "hsl(43, 98%, 54%)",    // Amarelo
  "hsl(24, 100%, 63%)",   // Laranja
  "hsl(156, 26%, 17%)"    // Verde escuro
];
```

**Atualizar o card do gráfico (linhas 443-485):**

```typescript
{/* Gráfico de Barras Verticais - Leads por Faixa de Investimento */}
<Card className="col-span-1">
  <CardHeader className="pb-4">
    <CardTitle className="text-lg font-semibold text-foreground">
      Leads por Faixa de Investimento
    </CardTitle>
    <p className="text-sm text-muted-foreground mt-1">
      Distribuição por valor pretendido
    </p>
  </CardHeader>
  <CardContent className="pt-0">
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={investimentoData}>
        {/* ... configuração do gráfico ... */}
        <Bar dataKey="value" name="Quantidade de Leads">
          {investimentoData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={INVESTIMENTO_COLORS[index % INVESTIMENTO_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

## Resultado Visual

| Antes | Depois |
|-------|--------|
| Volume Total por Grão | Leads por Faixa de Investimento |
| Soja: 50.000 sacas | até R$10 mil: 15 leads |
| Milho: 30.000 sacas | de R$10 mil a R$50 mil: 25 leads |
| | de R$50 mil a R$100 mil: 20 leads |
| | acima de R$100 mil: 14 leads |

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/DashboardCharts.tsx` | Substituir cálculo `graoData` por `investimentoData`, atualizar cores e textos do card |

