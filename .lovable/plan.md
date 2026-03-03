

# Nota do Assessor no modal do Lead

## Problema
Os assessores nao tem um campo dedicado para registrar feedback/notas sobre os leads. Atualmente so existe o campo "observacoes" generico.

## Solucao

Adicionar uma coluna `nota_assessor` na tabela `leads` e criar uma secao interativa no `LeadDetailsModal` onde o assessor pode escrever e salvar sua nota diretamente, sem precisar abrir o formulario de edicao. Cada salvamento sera registrado como atividade.

## Onde a nota aparece

1. **LeadDetailsModal** (usado tanto na tabela quanto no Kanban) - secao dedicada "Nota do Assessor" com textarea editavel inline e botao salvar
2. **Pagina de Atividades** - registrado como `lead_notes_added` com metadata indicando que foi nota do assessor
3. **Sugestao extra**: Adicionar a nota como coluna opcional na tabela de leads para visibilidade rapida (tooltip com preview)

## Arquivos a modificar

### 1. Banco de dados
- Adicionar coluna `nota_assessor TEXT` na tabela `leads` via migration SQL

### 2. `src/integrations/supabase/types.ts`
- Adicionar `nota_assessor: string | null` nos tipos Row, Insert e Update da tabela leads

### 3. `src/components/LeadDetailsModal.tsx`
- Adicionar secao "Nota do Assessor" apos Status e antes de Observacoes
- Textarea com o valor atual da nota
- Botao "Salvar" que faz UPDATE na tabela leads e chama `logActivity` com tipo `lead_notes_added`
- Importar `useActivityLog`, `useAuth`, `Textarea`
- Estado local para controlar edicao e loading

### 4. `src/hooks/useActivityLog.ts`
- Nenhuma mudanca necessaria - ja existe o tipo `lead_notes_added`

### 5. `src/pages/LeadsTable.tsx`
- Adicionar coluna "Nota" na tabela com texto truncado e tooltip para preview

### 6. `src/components/LeadForm.tsx`
- Adicionar campo `nota_assessor` no formulario de edicao para manter consistencia

## Fluxo

```text
Assessor abre lead → Ve secao "Nota do Assessor" → Digita feedback → Clica Salvar
  → UPDATE leads SET nota_assessor = ? WHERE id = ?
  → INSERT user_activities (lead_notes_added, metadata: { tipo: 'nota_assessor' })
  → Toast de confirmacao
```

