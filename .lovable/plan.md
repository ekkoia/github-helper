

# Corrigir Cálculo do Total Investido na Página Dashboard

## Problema Identificado

Na página `/dashboard`, o cálculo do "Total Investido" está usando o campo errado:

**Código atual (linhas 49-52):**
```typescript
const volumeTotal = leads.reduce((sum, lead) => {
  const volume = parseVolume(lead.volume);  // ❌ Usa campo "volume" (sacas)
  return sum + volume;
}, 0);
```

**Deveria usar:**
```typescript
const valorTotalInvestido = leads.reduce((sum, lead) => {
  const valor = parseFloat(lead.valor_produto) || 0;  // ✅ Usa campo "valor_produto" (R$)
  return sum + valor;
}, 0);
```

## Alteração Necessária

### Arquivo: `src/pages/Dashboard.tsx`

**Linhas 49-52** - Alterar o cálculo para usar `valor_produto`:

```typescript
const valorTotalInvestido = leads.reduce((sum, lead) => {
  const valor = parseFloat(lead.valor_produto) || 0;
  return sum + valor;
}, 0);
```

**Linha 69** - Atualizar a prop passada para o componente:

```typescript
<DashboardHero
  totalLeads={totalLeads}
  leadsGanhos={leadsGanhos}
  taxaConversao={taxaConversao}
  volumeTotal={valorTotalInvestido}  // Renomeado para clareza
/>
```

## Resultado Esperado

| Página | Antes | Depois |
|--------|-------|--------|
| /dashboard | Mostrava volume em sacas | Mostra valor investido em R$ |
| /leads | Mostra valor investido em R$ | Mantém igual (já correto) |

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Alterar cálculo de `volumeTotal` para somar `valor_produto` ao invés de `volume` |

