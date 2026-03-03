

# Migração pendente: coluna `nota_assessor`

## Estado atual

O código já foi atualizado (LeadDetailsModal, LeadsTable, LeadForm, validations) para suportar o campo `nota_assessor`, mas a coluna ainda não existe na tabela `leads` do banco de dados.

## O que falta

Executar uma migração SQL para adicionar a coluna:

```sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nota_assessor TEXT;
```

Isso é tudo que falta para o campo funcionar corretamente no modal de detalhes, na tabela de leads e no formulário de edição. A atividade já será registrada automaticamente via `logActivity` com tipo `lead_notes_added`.

## Arquivo

Nenhum arquivo de código precisa ser alterado. Apenas a migração SQL acima.

