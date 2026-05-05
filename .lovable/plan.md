## Correções na importação de leads (telefone)

### 1. `src/lib/importUtils.ts`
- Adicionar função `normalizePhone(value)`:
  - Converter notação científica (`1.1e+10`) em string completa de dígitos.
  - Remover tudo que não for dígito.
  - Remover DDI `55` inicial se presente (para validar tamanho local).
  - Retornar `{ digits, e164 }` onde `e164` adiciona `55` se faltar.
- No `validateRow`, ao processar `telefone`:
  - Aplicar `normalizePhone`.
  - Se resultado tiver menos de 10 dígitos (DDD+8) → marcar como **inválido** com erro "Telefone incompleto (faltando DDD ou dígitos)".
  - Se tiver 10 ou 11 dígitos → salvar versão com DDI 55 (formato `55DDDNUMERO`), padrão usado no banco.
- No dedup, comparar usando a versão normalizada (com DDI).
- Em `parseFile`, passar `raw: true` no `sheet_to_json` e converter manualmente para string, evitando que o Excel devolva números em notação científica/truncados. Para telefones, ler também `cellText` quando disponível.

### 2. `downloadTemplate`
- Trocar exemplo de telefone para `5511999999999` (com DDI).
- Adicionar segunda linha de instrução comentando o formato esperado.
- Forçar formato de texto (`z: "@"`) na coluna telefone para evitar que o Excel reconverta em número.

### 3. `src/components/ImportLeadsDialog.tsx`
- No passo "Mapeamento", após detectar a coluna mapeada como `telefone`, checar se a primeira linha tem menos de 10 dígitos e exibir aviso amarelo: "Os telefones do arquivo parecem estar sem DDD. Verifique o formato antes de continuar."
- No preview, exibir o telefone já normalizado (com DDI 55) para deixar claro o que será salvo.

### 4. `supabase/functions/import-leads-bulk/index.ts`
- Aplicar a mesma normalização de telefone server-side antes do dedup/insert, para garantir consistência mesmo se o cliente enviar telefone fora do padrão.
- Dedup `phone.eq.<normalizado>` usando o número com DDI.

### Comportamento final
- Telefones com menos de 10 dígitos: **bloqueados como inválidos** (vão para o relatório de erros).
- Telefones com 10/11 dígitos: salvos como `55DDDNUMERO`.
- Telefones já com 12/13 dígitos começando em 55: mantidos.
- Notação científica do Excel: convertida corretamente.
