

# Adicionar Campo "Investimento Real" ao Lead

## Entendimento

O campo "Valor Investido" vem do formulário de captura (faixa de investimento selecionada pelo lead) e deve permanecer **somente leitura**. O novo campo "Investimento Real" será preenchido pelo time após a reunião para registrar o valor real que o lead pretende investir.

## Alterações Necessárias

### 1. Migração do Banco de Dados

Criar nova coluna `investimento_real` na tabela `leads`:

```sql
ALTER TABLE leads ADD COLUMN investimento_real numeric;
```

### 2. LeadDetailsModal (`src/components/LeadDetailsModal.tsx`)

Adicionar o novo campo ao lado do "Valor Investido" na seção Negociação:

```text
+---------------------------+---------------------------+
| Qtd Cotas                 | Valor Investido           |
| -                         | R$ 10.000,00              |
+---------------------------+---------------------------+
| Investimento Real         | Etapa do Funil            |
| R$ 15.000,00 (ou "-")     | Novo Lead                 |
+---------------------------+---------------------------+
| Origem                    |                           |
| meta_form                 |                           |
+---------------------------+---------------------------+
```

### 3. LeadForm (`src/components/LeadForm.tsx`)

- **Valor Investido**: Campo `disabled` quando `initialData` existe (modo edição)
- **Investimento Real**: Novo campo editável (apenas no modo edição, opcional no cadastro)

```typescript
{/* Valor Investido - bloqueado na edição */}
<Input 
  id="valor_produto" 
  type="number" 
  disabled={!!initialData}
  className={initialData ? "bg-muted cursor-not-allowed" : ""}
  ...
/>

{/* Investimento Real - novo campo */}
<div>
  <Label htmlFor="investimento_real">Investimento Real (R$)</Label>
  <Input 
    id="investimento_real" 
    type="number" 
    step="0.01"
    placeholder="Valor após reunião"
  />
</div>
```

### 4. Validações (`src/lib/validations.ts`)

Adicionar campo `investimento_real` ao schema:

```typescript
investimento_real: z.number()
  .positive("Valor deve ser positivo")
  .optional()
  .or(z.literal(undefined)),
```

## Layout Visual do Modal (Seção Negociação)

```text
Negociacao
+-----------------+-----------------+
| Qtd Cotas       | Valor Investido |
| -               | R$ 10.000,00    |
+-----------------+-----------------+
| Investimento    | Etapa do Funil  |
| Real            |                 |
| R$ 15.000,00    | Novo Lead       |
+-----------------+-----------------+
| Origem          |                 |
| meta_form       |                 |
+-----------------+-----------------+
```

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/migrations/` | Nova migration para coluna `investimento_real` |
| `src/components/LeadDetailsModal.tsx` | Exibir campo "Investimento Real" |
| `src/components/LeadForm.tsx` | Adicionar campo + bloquear "Valor Investido" na edicao |
| `src/lib/validations.ts` | Adicionar validacao do novo campo |

## Comportamento Esperado

| Cenario | Valor Investido | Investimento Real |
|---------|-----------------|-------------------|
| Criar lead | Editavel | Opcional (vazio) |
| Editar lead | Bloqueado (readonly) | Editavel |
| Modal detalhes | Exibe valor | Exibe valor ou "-" |

