

# Atualizar Métricas do Dashboard para Contexto de Investimento

## Situação Atual

As métricas atuais estão baseadas no contexto de **volume de sacas**, que não se aplica mais aos leads vindos do Meta Form:

| Métrica | Cálculo Atual | Problema |
|---------|---------------|----------|
| Ticket Médio | `R$ X/saca` | Usa `volume` - campo não preenchido |
| Lead Mais Valioso | `volume × valor_produto` | Multiplica por volume inexistente |
| Melhor Região | Soma de `volume` por cidade | Depende de volume e cidade |

## Alterações Propostas

### 1. Ticket Médio (Investimento Médio por Lead)

**Antes:**
```typescript
const leadsComValor = leads.filter(lead => lead.valor_produto && lead.volume);
return soma / leadsComValor.length;
// Exibe: "R$ 150,00/saca"
```

**Depois:**
```typescript
const leadsComValor = leads.filter(lead => lead.valor_produto);
return soma / leadsComValor.length;
// Exibe: "R$ 45.000,00" (valor médio de investimento por lead)
```

### 2. Lead Mais Valioso

**Antes:** Calculava `volume × valor_produto` (multiplicação inválida sem volume)

**Depois:** Considera apenas o `valor_produto` como critério de valor:
```typescript
const maisValioso = leadsComValor.reduce((max, lead) => {
  const valor = parseFloat(lead.valor_produto) || 0;
  const maxValor = parseFloat(max.valor_produto) || 0;
  return valor > maxValor ? lead : max;
}, leadsComValor[0]);

return {
  nome: maisValioso.nome_completo,
  valor: parseFloat(maisValioso.valor_produto) || 0
};
```

### 3. Melhor Região (Substituir por Nova Métrica)

Como a região virá de campanhas futuras, vamos substituir temporariamente por uma métrica mais relevante.

**Sugestão:** "Total de Leads Este Mês"
- Mostra quantidade de leads criados no mês atual
- Subtitle: "Novos leads em [mês atual]"
- Ícone: `Users` ou `UserPlus`

## Resultado Visual

| Métrica | Antes | Depois |
|---------|-------|--------|
| Ticket Médio | R$ 150,00/saca | R$ 45.000,00 |
| Lead Mais Valioso | João Silva - R$ 0,00 | João Silva - R$ 150.000,00 |
| Melhor Região | N/A - 0 sacas | **12 leads** (Novos em Janeiro) |
| Taxa IA | 45.2% | 45.2% (sem alteração) |

## Resumo Técnico das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/DashboardMetrics.tsx` | Remover dependência de `volume`, usar apenas `valor_produto` |
| | Remover import de `parseVolume` |
| | Atualizar filtros para considerar apenas `valor_produto` |
| | Substituir "Melhor Região" por "Leads Este Mês" |
| | Ajustar formatação do Ticket Médio (remover "/saca") |
| | Adicionar import do ícone `Users` ou `UserPlus` |

