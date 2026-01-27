
# Ajuste da Tabela de Leads para o Padrão do Formulário

## Objetivo

Simplificar a tabela de leads (`LeadsTable.tsx`) para exibir apenas as colunas relevantes ao novo modelo de captura de leads, mantendo consistência com o formulário simplificado.

## Campos do Formulário Atual

O formulário de criação de leads captura apenas:
- Nome Completo
- Telefone
- Email
- Qtd Cotas (campo `volume`)
- Valor Investido (campo `valor_produto`)
- Origem do Lead
- Observações

## Situação Atual da Tabela

A tabela atual exibe muitas colunas que não fazem parte do fluxo simplificado:

| Coluna | Status |
|--------|--------|
| Nome | Manter |
| Perfil | Remover (não é capturado no form) |
| Contato (telefone/email) | Manter |
| Cidade/UF | Remover (não é capturado no form) |
| Intenção | Remover (não é capturado no form) |
| Grão | Remover (não é capturado no form) |
| Volume | Manter (renomear para "Qtd Cotas") |
| Valor | Manter (renomear para "Valor Investido") |
| Etapa | Manter |
| Origem | Adicionar |
| Colunas ocultas (embarque, distância, etc.) | Remover do customizador |

## Alterações Propostas

### 1. Simplificar colunas da tabela principal

**Nova estrutura de colunas:**
- Nome (ordenável)
- Contato (telefone + email)
- Qtd Cotas
- Valor Investido
- Origem
- Etapa do Funil
- Ações

### 2. Remover ColumnCustomizer

O customizador de colunas (`ColumnCustomizer`) exibe campos que não são mais relevantes. Será removido da interface.

### 3. Atualizar filtros laterais

Remover filtros que não fazem mais sentido:
- Remover: Perfil, Cidade, UF, Tipo de Grão, Intenção
- Manter: Etapa do Funil, Protocolo

### 4. Atualizar modal de detalhes

Simplificar o `LeadDetailsModal` para exibir apenas os campos relevantes ao novo modelo.

### 5. Atualizar cálculo de KPIs

Ajustar os KPIs para refletir os novos campos (por exemplo, somar "Valor Investido" em vez de "Volume").

---

## Detalhes Técnicos

### Arquivo: `src/pages/LeadsTable.tsx`

**Remover imports e estados:**
```typescript
// Remover import
import { ColumnCustomizer, ColumnVisibility } from "@/components/ColumnCustomizer";

// Remover estado columnVisibility
const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({...});
```

**Simplificar filtros:**
```typescript
const [filters, setFilters] = useState({
  etapa: "all",
  protocolo: ""
});
```

**Atualizar cabeçalhos da tabela:**
```text
Nome | Contato | Qtd Cotas | Valor Investido | Origem | Etapa | Ações
```

**Atualizar células da tabela:**
- Remover: Perfil, Cidade/UF, Intenção, Grão
- Adicionar: Origem do Lead (formatado com labels)

### Arquivo: `src/components/FiltersSidebar.tsx`

Remover filtros de:
- Perfil
- Cidade
- UF
- Tipo de Grão
- Intenção

Manter apenas:
- Etapa do Funil
- Protocolo de Atendimento

### Arquivo: `src/components/LeadDetailsModal.tsx`

Simplificar para exibir:
- Identificação: Nome, Email, Telefone
- Negociação: Qtd Cotas, Valor Investido, Origem
- Status: Etapa do Funil, Data de Criação
- Observações (se houver)

Remover seções:
- Localização (Cidade, UF, Embarque, etc.)
- Dados Técnicos (Armazenamento, Qualidade, Royalties)

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/LeadsTable.tsx` | Simplificar colunas, remover ColumnCustomizer, atualizar filtros |
| `src/components/FiltersSidebar.tsx` | Remover filtros não utilizados |
| `src/components/LeadDetailsModal.tsx` | Simplificar seções de detalhes |
| `src/components/ColumnCustomizer.tsx` | Pode ser removido se não for mais necessário |
