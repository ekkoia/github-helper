
## Contexto do problema

Hoje, na tabela `/leads`, a coluna **Valor Investido** exibe `getTopoDaFaixa(valor_produto)`, ou seja, o **teto** da faixa de investimento. Já o modal de **Detalhes do Lead** mostra o `valor_produto` bruto (que o webhook grava como o teto da faixa detectada).

Exemplos observados:
- Webhook recebe "até R$10 mil" → grava `valor_produto = 10000` → tabela aplica `getTopoDaFaixa(10000)` = 20000 → aparece **R$ 20 mil** na lista e **R$ 10 mil** no detalhe.
- Webhook recebe "R$1.000" → grava `valor_produto = 1000` → `getTopoDaFaixa(1000)` = 5000 → **R$ 5 mil** na lista, **R$ 1.000** no detalhe.

O usuário quer que a coluna passe a mostrar o **piso** da faixa (o mínimo) e que o cabeçalho seja renomeado para **Pretensão**.

## O que muda

### 1. Nova função `getPisoDaFaixa` em `src/lib/investmentUtils.ts`

Mapeia `valor_produto` (que hoje já vem como topo de faixa do webhook) para o mínimo da faixa:

```text
valor_produto  →  piso exibido
10000  (até R$10 mil)       →  R$ 0        (faixa "até 10 mil")
50000  (R$10 mil – R$50 mil) →  R$ 10.000
100000 (R$50 mil – R$100 mil)→  R$ 50.000
150000 (acima de R$100 mil)  →  R$ 100.000
Outros valores intermediários caem na faixa correspondente pelo mesmo critério.
```

Regra: escolher o piso da faixa em que o valor bruto se encaixa (`≤10k → 0`, `≤50k → 10k`, `≤100k → 50k`, `>100k → 100k`). `getTopoDaFaixa` continua existindo para uso em somas/dashboards (memory: "top-of-range for sums").

### 2. `src/pages/LeadsTable.tsx`

- Trocar o texto do cabeçalho da coluna de **"Valor Investido"** para **"Pretensão"** (linha 841).
- Substituir `getTopoDaFaixa(...)` por `getPisoDaFaixa(...)` na renderização da célula (linha 905).
- Mantido: ordenação por `valor_produto`, filtros e somatórios do dashboard (esses continuam usando o valor bruto/topo conforme a memória).

## Escopo intencionalmente fora

- **Modal de Detalhes do Lead**, **LeadForm**, **Kanban**, **Dashboard**, **exports (CSV/XLSX)** e **Equipe** não serão alterados — a mudança pedida foi só o que aparece "no CRM" (tabela) segundo os exemplos.
- Nada muda no banco nem no webhook: `valor_produto` continua sendo gravado do jeito que está.

Se você quiser que a renomeação para "Pretensão" e a exibição do piso também apareçam no modal de Detalhes, exports e/ou Kanban, me avise antes de aprovar que eu incluo no mesmo passo.
