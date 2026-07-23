## Diagnóstico

Ao criar lead pelo formulário, o `LeadForm` faz:

```ts
supabase.from("leads").insert([submitData]).select().single()
```

O trigger `trg_dedupe_lead_by_phone` (BEFORE INSERT) **retorna `NULL` quando o telefone já existe** — ele faz merge no lead antigo e cancela o INSERT. Nesse caso, o Supabase devolve `data: []`, e o `.single()` do PostgREST lança erro ("JSON object requested, multiple (or no) rows returned"). O toast então mostra "Erro ao salvar lead" mesmo que o merge tenha funcionado no banco.

Isso não é um bug novo do banco — é o dedupe (feature intencional) conflitando com o `.single()` do cliente. Explica o "corrigi antes e voltou": qualquer telefone com últimos 8 dígitos coincidindo com um lead existente cai nesse caminho.

## Correção (mínima, só no LeadForm)

Trocar `.single()` por `.maybeSingle()` **apenas no branch de criação** e tratar `data === null` como merge bem-sucedido:

- Se `data` voltar preenchido → toast "Lead criado com sucesso!" (como hoje).
- Se `data === null` (dedupe fez merge) → toast informativo tipo "Lead já existia — informações mescladas ao registro existente" e segue com `onSuccess()`.
- `logActivity` só roda quando há `newLead?.id`.

Não mexo em:
- Trigger de dedupe
- Validações do Zod
- Branch de update (edição de lead existente)
- Qualquer lógica de normalização de telefone ou faixa/pretensão

## Arquivo alterado

- `src/components/LeadForm.tsx` — apenas o bloco `else` do `onSubmit` (criação).
