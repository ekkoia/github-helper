
# Alterar Título e Formato do Volume Total para Valor Investido

## Problema Identificado

O card de métricas na página de Leads exibe:
- **Título**: "Volume Total (sacas)"
- **Formato**: Número simples (ex: "100.000")

Deveria exibir:
- **Título**: "Valor Investido" ou "Total Investido"
- **Formato**: Moeda brasileira (ex: "R$ 100.000,00")

## Alteração Necessária

### Arquivo: `src/components/Dashboard.tsx`

**Linha 31-36** - Alterar o quarto item do array `stats`:

**Antes:**
```typescript
{
  title: "Volume Total (sacas)",
  value: volumeTotal.toLocaleString('pt-BR'),
  icon: Package,
  color: "text-status-proposta",
},
```

**Depois:**
```typescript
{
  title: "Total Investido",
  value: new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(volumeTotal),
  icon: Package,
  color: "text-status-proposta",
},
```

## Alteração no Ícone (Opcional)

Podemos também trocar o ícone de `Package` (pacote) para `DollarSign` ou `Wallet` para representar melhor o conceito de valor monetário.

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Volume Total (sacas) | Total Investido |
| 1.200.000 | R$ 1.200.000,00 |

## Resumo

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Dashboard.tsx` | Atualizar título para "Total Investido" e formatar valor como moeda (R$) |
