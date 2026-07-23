Estender a mudança já aplicada na tabela `/leads` para os demais pontos de exibição do `valor_produto`.

### 1. `src/components/LeadDetailsModal.tsx` (linhas 314–316)
- Renomear o label **"Valor Investido"** → **"Pretensão"**.
- Trocar `formatCurrency(currentLead.valor_produto)` por `formatCurrency(getPisoDaFaixa(Number(currentLead.valor_produto)))`.
- Importar `getPisoDaFaixa` de `@/lib/investmentUtils`.

### 2. `src/pages/Kanban.tsx` (linhas 445–451)
- Substituir `.format(lead.valor_produto)` por `.format(getPisoDaFaixa(Number(lead.valor_produto)))`.
- Importar `getPisoDaFaixa`.
- (Não há label textual "Valor Investido" no card — só o valor formatado.)

### 3. `src/lib/exportUtils.ts` (CSV + XLSX)
- Header linha 18: **"Valor Investido"** → **"Pretensão"**.
- Célula linha 46: `lead.valor_produto?.toString()` → `lead.valor_produto ? getPisoDaFaixa(Number(lead.valor_produto)).toString() : ""`.
- Importar `getPisoDaFaixa`.
- Coluna "Investimento Real" permanece como está (é campo separado).

### Fora do escopo (mantidos como estão)
- `LeadForm` (input de edição usa valor bruto — não deve virar piso).
- Somas em dashboards / métricas (continuam com `getTopoDaFaixa` conforme memory).
- Coluna "Investimento Real" em qualquer lugar.