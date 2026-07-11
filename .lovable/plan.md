## Diagnóstico

Em `/chat`, o nome do assessor aparece só em algumas conversas porque o índice de leads em `src/hooks/useConversations.ts` tem dois problemas:

### 1. Limite de 1000 linhas do Supabase

A consulta:

```ts
supabase.from("leads").select("telefone, responsavel_id")
```

não usa `.range()` nem paginação. O PostgREST devolve no máximo 1000 linhas. Se o projeto tem mais leads que isso (bem provável — o `fetchAllLeads` em `src/lib/supabaseUtils.ts` já pagina justamente por isso), muitos leads atribuídos ficam de fora do `leadByKey`, então `assessorName` fica `null` mesmo com o lead corretamente atribuído. O mesmo vale para a consulta `profiles` (menos crítico, mas idealmente também paginada).

### 2. Normalização de telefone perde matches por causa do "9"

`normalizeForMatch` faz `digits.slice(-10)`. Isso funciona quando os dois lados têm 11 dígitos (DDD + 9 + 8) OU os dois têm 10 (DDD + 8). Falha quando um lado tem o 9 do celular e o outro não:

- Lead salvo como `11987654321` (com 9) → últimos 10 = `1987654321`
- Msg WhatsApp `1187654321` (sem 9) → últimos 10 = `1187654321`
- Sem match → sem `assessorName`.

Como leads vêm de fontes diferentes (Meta forms, webhook-lead, importação, digitação manual), esse descasamento acontece em parte da base — coerente com o print, onde alguns leads têm o `↳ nome` e outros não.

## Correção proposta

Alteração isolada em `src/hooks/useConversations.ts`. Nenhum outro arquivo, nenhuma mudança no banco, nenhuma mudança de UI.

1. **Paginar a busca de leads** com `.range()` em lotes de 1000 até esgotar (mesmo padrão de `fetchAllLeads`). Selecionar só `telefone, responsavel_id` para manter leve. Aplicar a mesma ideia em `profiles` se necessário.

2. **Normalização robusta a "9"**: além da chave de 10 dígitos, gerar uma chave "core" com o DDD (2 dígitos) + últimos 8 dígitos do número — descartando o 9 quando presente. Indexar cada lead por essa chave e resolver a mensagem pela mesma chave.

   Regra:
   - Tira tudo que não é dígito.
   - Se começa com `55` e tem 12/13 dígitos, remove o `55`.
   - Pega os últimos 10 ou 11 dígitos. Se tiver 11 e o 3º dígito for `9` (celular), remove esse `9`.
   - Resultado: sempre 10 dígitos (DDD + 8), estável entre com/sem 9 e com/sem DDI.

3. Manter o resto da lógica igual: visibilidade de não-admin por `user_id` OU telefone atribuído (usando a nova chave), agrupamento por telefone bruto normalizado (só dígitos) para não misturar conversas.

## Resultado esperado

- Todos os leads (mesmo acima de 1000) entram no índice.
- Match funciona independentemente do `9` do celular e do prefixo `55`.
- `↳ Nome do assessor` passa a aparecer em toda conversa cujo telefone bate com um lead que tem `responsavel_id`.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/useConversations.ts` | Paginar `leads`, refinar `normalizeForMatch` para lidar com o "9" do celular |
