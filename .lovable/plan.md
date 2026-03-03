

# Expandir faixas de distribuição automática

## Faixas finais

| Valor interno | Label | Regra |
|---|---|---|
| `ate_10k` | Até R$10 mil | valor_produto <= 10.000 |
| `10k_50k` | R$10 a R$50 mil | 10.000 < valor_produto <= 50.000 |
| `50k_150k` | R$50 a R$150 mil | 50.000 < valor_produto <= 150.000 |
| `acima_150k` | Acima de R$150 mil | valor_produto > 150.000 |

A faixa antiga `acima_10k` será renomeada para `10k_50k` nos dados existentes.

## Alterações

### 1. Migração SQL
- Dropar CHECK constraints em `auto_assign_config` e `auto_assign_state`
- Recriar com os 4 valores: `ate_10k`, `10k_50k`, `50k_150k`, `acima_150k`
- Renomear registros existentes: `UPDATE ... SET faixa = '10k_50k' WHERE faixa = 'acima_10k'`
- Inserir linhas de estado inicial para as 2 novas faixas em `auto_assign_state`
- Recriar a function `auto_assign_lead()` com a lógica de 4 faixas

### 2. `src/hooks/useAutoAssign.ts`
- Mudar tipo `faixa` para `'ate_10k' | '10k_50k' | '50k_150k' | 'acima_150k'`

### 3. `src/components/configuracoes/DistribuicaoSection.tsx`
- Atualizar tipo `Faixa`, labels, e adicionar 2 novos `FaixaQueue` cards
- Mudar grid para 2x2

### 4. `supabase/functions/next-assessor/index.ts`
- Atualizar validação do parâmetro `faixa` para aceitar os 4 valores

### 5. `src/lib/investmentUtils.ts`
- Atualizar `getTopoDaFaixa` para refletir as novas faixas

