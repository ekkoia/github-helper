

# Exportação CSV com contexto FeeAgro e dados completos

## Problema
A exportação atual usa nomenclaturas genéricas (ex: "Volume", "Valor do Produto", "Tipo de Grão") que não fazem sentido no contexto da FeeAgro (investimentos/cotas). Além disso, faltam dois dados importantes: **nota do assessor** e **responsável atribuído**.

## Solução

**Arquivo:** `src/lib/exportUtils.ts`

### 1. Renomear headers para contexto FeeAgro
Trocar nomenclaturas de agro/grãos para investimentos:

| Atual | Novo |
|---|---|
| Volume | Qtd Cotas |
| Valor do Produto | Valor Investido |
| Investimento Real | Investimento Real |
| Tipo de Grão | *(remover)* |
| Intenção | *(remover)* |
| Perfil | *(remover)* |
| Armazenamento | *(remover)* |
| Qualidade | *(remover)* |
| Tem Royalties | *(remover)* |
| Percentual Royalties | *(remover)* |
| Sentido | *(remover)* |
| Cidade, UF, Localização... | *(remover campos de logística)* |

### 2. Adicionar colunas faltantes
- **Nota do Assessor** (`nota_assessor`) -- feedback escrito pelo assessor
- **Responsável** -- nome do assessor atribuído ao lead (requer lookup na tabela `profiles`)
- **Origem** -- canal de captação com labels traduzidos

### 3. Alterar assinatura da função
A função passará a receber um mapa de usuários (`usersMap`) para resolver `responsavel_id` → nome do assessor, sem precisar fazer queries adicionais no momento da exportação. O `usersMap` já existe no `LeadsTable.tsx` via `useUsers()`.

### Headers finais do CSV
```
Nome Completo, Telefone, Email, Qtd Cotas, Valor Investido, Investimento Real,
Etapa do Funil, Origem, Responsável, Nota do Assessor, Observações, Data de Criação
```

### Alterações em `src/pages/LeadsTable.tsx`
Passar `usersMap` para a chamada `exportToCSV(filteredAndSortedLeads, usersMap, filename)`.

