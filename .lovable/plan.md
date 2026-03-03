

# Correção: Campo "Entende que não é empréstimo?" mostrando "Não" quando deveria ser "Sim"

## Problema

O valor vindo do formulário externo é `"sim_"` (com underscore no final). O código faz comparação exata `=== 'sim'`, que falha, fazendo o badge mostrar "Não" (âmbar) quando o lead de fato respondeu "Sim".

Confirmado no banco: o lead `lekinho11jr@gmail.com` tem valor `"sim_"` na coluna de concordância.

## Correção

**Arquivo:** `src/components/LeadDetailsModal.tsx`

Trocar as 3 ocorrências de:
```typescript
concordaEmprestimo?.toLowerCase() === 'sim'
```
Por:
```typescript
concordaEmprestimo?.toLowerCase().startsWith('sim')
```

Isso cobre `"sim"`, `"sim_"`, `"sim "` ou qualquer variação com sufixo. São 3 pontos no mesmo arquivo (linhas 393, 403, 408). Nenhuma outra alteração necessária.

