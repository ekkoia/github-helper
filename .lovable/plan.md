

# Adicionar busca por notas do assessor na barra de pesquisa

## Situação atual
A busca global filtra apenas por `nome_completo`, `email` e `telefone`. O campo `nota_assessor` não é incluído.

## Solução

**Arquivo:** `src/pages/LeadsTable.tsx`

1. **Linha 178** — Adicionar `lead.nota_assessor?.toLowerCase().includes(term)` ao filtro de busca
2. **Linha 551** — Atualizar o placeholder para `"Buscar por nome, email, telefone ou notas..."` e também incluir `observacoes` na busca para completude

Alteração de 2 linhas, sem mudança de lógica.

