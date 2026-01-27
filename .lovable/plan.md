
# Adaptar Card "Distribuição por Perfil" para Contexto Atual

## Situação Atual

O gráfico de **"Distribuição por Perfil"** mostra apenas um único valor:
- **Produtor**: 100% (75 leads)

Isso acontece porque todos os leads vindos do Meta Form recebem automaticamente o perfil "Produtor", tornando o gráfico pouco informativo.

## Opções de Substituição

### Opção 1: Total Investido por Faixa (Recomendada)
Mostrar o **valor total em R$** de cada faixa de investimento (complementa o gráfico de quantidade):

| Faixa | Quantidade | Total Investido |
|-------|------------|-----------------|
| R$ 10.000 | 30 leads | R$ 300.000 |
| R$ 30.000 | 16 leads | R$ 480.000 |
| R$ 75.000 | 12 leads | R$ 900.000 |
| R$ 100.000 | 17 leads | R$ 1.700.000 |

### Opção 2: Leads por Dia da Semana
Mostrar distribuição de leads criados por dia da semana (Segunda a Domingo).

### Opção 3: Manter Perfil para Uso Futuro
Manter o gráfico, mas considerar que futuramente campanhas diferentes podem trazer perfis variados.

## Implementação (Opção 1 - Total Investido por Faixa)

### Arquivo: `src/components/DashboardCharts.tsx`

**Atualizar o cálculo de dados:**

```typescript
// Dados para Total Investido por Faixa
const totalPorFaixaData = useMemo(() => {
  const faixas: Record<string, number> = {
    "até R$10 mil": 0,
    "de R$10 mil a R$50 mil": 0,
    "de R$50 mil a R$100 mil": 0,
    "acima de R$100 mil": 0
  };
  
  filteredLeads.forEach(lead => {
    const valor = parseFloat(lead.valor_produto) || 0;
    
    if (valor <= 10000) faixas["até R$10 mil"] += valor;
    else if (valor <= 50000) faixas["de R$10 mil a R$50 mil"] += valor;
    else if (valor <= 100000) faixas["de R$50 mil a R$100 mil"] += valor;
    else faixas["acima de R$100 mil"] += valor;
  });

  return Object.entries(faixas)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
}, [filteredLeads]);
```

**Atualizar o card do gráfico:**

```typescript
{/* Gráfico de Pizza - Total Investido por Faixa */}
<Card className="col-span-1">
  <CardHeader className="pb-4">
    <CardTitle className="text-lg font-semibold text-foreground">
      Total Investido por Faixa
    </CardTitle>
    <p className="text-sm text-muted-foreground mt-1">
      Valor total em cada faixa de investimento
    </p>
  </CardHeader>
  <CardContent className="pt-0">
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={totalPorFaixaData}
          // ... resto da configuração
          label={({ name, value, percent }) => (
            `${name}: R$ ${(value/1000).toFixed(0)}k (${(percent * 100).toFixed(0)}%)`
          )}
        >
          {totalPorFaixaData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={INVESTIMENTO_COLORS[index]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

## Resultado Visual

| Antes | Depois |
|-------|--------|
| Distribuição por Perfil | Total Investido por Faixa |
| Produtor: 100% | até R$10 mil: R$ 300k (9%) |
| | de R$10 mil a R$50 mil: R$ 480k (14%) |
| | de R$50 mil a R$100 mil: R$ 900k (26%) |
| | acima de R$100 mil: R$ 1.700k (51%) |

## Complemento Visual

Agora o dashboard terá dois gráficos complementares:
1. **Leads por Faixa de Investimento** - Quantidade de leads em cada faixa
2. **Total Investido por Faixa** - Valor total em R$ de cada faixa

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/DashboardCharts.tsx` | Substituir `perfilData` por `totalPorFaixaData` |
| | Atualizar título e subtítulo do card |
| | Ajustar formatação do label para mostrar valores em R$ |
| | Remover código não utilizado de `perfilData` |
