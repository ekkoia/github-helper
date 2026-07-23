## Problema

`getPisoDaFaixa` hoje mapeia qualquer `valor_produto ≤ 10.000` para `0`, e há duas escalas diferentes gravadas:

- **Meta / webhook geral:** `10000` (até R$10 mil), `50000` (R$10-50 mil), `100000` (R$50-100 mil), `150000` (acima R$100 mil).
- **Form Arvora Nativo:** `1000` (até R$1 mil), `5000` (R$1-5 mil), `10000` (R$5-10 mil), `50000` (R$10-50 mil).

Efeitos observados:
- "R$ 5 mil a R$ 10 mil" (`valor_produto=10000`) aparece **R$ 0** em vez de R$ 5.000.
- "R$ 1 mil a R$ 5 mil" (`valor_produto=5000`) aparece **R$ 0** em vez de R$ 1.000.
- 530+ leads com `valor_produto = NULL` mas com "Valor pretendido: …" em `observacoes` mostram R$ 0 na tabela/modal/kanban.

## Correção

### 1. Backfill de `valor_produto` a partir de `observacoes` (migration)

Preencher `valor_produto` onde está `NULL` mas há "Valor pretendido: …" em `observacoes`, com o mesmo mapa do webhook:

- `até R$10 mil` → 10000
- `de R$10 mil a R$50 mil` → 50000
- `de R$50 mil a R$100 mil` → 100000
- `acima de R$100 mil` → 150000

### 2. Nova `getPisoDaFaixa(lead)` (`src/lib/investmentUtils.ts`)

A função passa a receber o **lead inteiro**. Regras finais (decisão do usuário: "até X" exibe o próprio X):

**a) Se `observacoes` tem "Valor pretendido: …", mapeia direto pelo texto:**

| Texto na observação | Valor exibido |
|---|---|
| `até R$ 1 mil` | R$ 1.000 |
| `de R$1 mil a R$5 mil` | R$ 1.000 |
| `de R$5 mil a R$10 mil` | R$ 5.000 |
| `até R$10 mil` | R$ 10.000 |
| `de R$10 mil a R$50 mil` | R$ 10.000 |
| `de R$50 mil a R$100 mil` | R$ 50.000 |
| `acima de R$100 mil` | R$ 100.000 |
| `Não informado` / vazio | R$ 0 |

**b) Fallback pelo `valor_produto` (quando não há texto):**

| `valor_produto` | Valor exibido |
|---|---|
| `1000` | R$ 1.000 (Arvora "até R$1 mil" → teto) |
| `5000` | R$ 1.000 (Arvora "R$1-5 mil" → piso) |
| `10000` | R$ 10.000 (assume Meta "até R$10 mil" → teto; é a origem mais comum) |
| `50000` | R$ 10.000 (R$10-50 mil → piso) |
| `100000` | R$ 50.000 (R$50-100 mil → piso) |
| `150000` | R$ 100.000 (acima R$100 mil → piso) |
| `null` / `0` | R$ 0 |

O parse do texto tem prioridade justamente para desambiguar o `10000` quando o lead é Arvora (`de R$5 mil a R$10 mil` → R$ 5.000).

### 3. Trocar chamadas para `getPisoDaFaixa(lead)`

Somente troca da chamada (de `getPisoDaFaixa(lead.valor_produto)` para `getPisoDaFaixa(lead)`), nos arquivos:

- `src/pages/LeadsTable.tsx`
- `src/components/LeadDetailsModal.tsx`
- `src/pages/Kanban.tsx`
- `src/lib/exportUtils.ts`

Somas do dashboard continuam usando `getTopoDaFaixa` / `getValorEstimadoLead` — **não** são tocadas.

## Detalhes técnicos

- Regex `/Valor pretendido:\s*([^\n]+)/i` sobre `observacoes`, com normalização (lowercase, colapso de espaços) antes do match.
- Backfill em migration idempotente com `UPDATE leads … WHERE valor_produto IS NULL AND observacoes ILIKE …`.
- Nenhuma mudança em `webhook-lead`, RLS, triggers de dedupe, envio de mensagens ou métricas do dashboard.

## Fora do escopo

- Alterar como novos leads gravam `valor_produto` no webhook.
- Mexer em somatórios/métricas financeiras.
- Qualquer renomeação além do já feito ("Pretensão").