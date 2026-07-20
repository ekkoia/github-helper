## Diagnóstico

Confirmei o que está acontecendo. O problema tem duas partes:

### 1. Formato do telefone divergente entre UI ↔ banco ↔ n8n

Depois da padronização feita anteriormente, a tabela `dados_cliente` armazena o telefone **só com dígitos, no padrão `55DDDNUMERO`** (o trigger `trg_normalize_dados_cliente_telefone` remove qualquer sufixo e o `9` extra). Confirmado:
- 1341 registros, nenhum com `@s.whatsapp.net`.
- 629 registros estão como `pause` — inclusive Claudio (552498240251), Sam Santos (554192341711), etc.

Porém:
- O **frontend** (`ChatWindow.tsx`) ainda monta `phoneKey = <digitos>@s.whatsapp.net` para o `SELECT` e para o `UPSERT`. O `UPSERT` funciona porque o trigger normaliza antes do `ON CONFLICT`, mas o `SELECT` de leitura nunca encontra o registro → o botão sempre aparece como "Pausar IA" mesmo quando já está pausado. Isso confunde o assessor (parece que "não pausou").
- O **n8n** provavelmente consulta `dados_cliente` usando o JID do WhatsApp (`<digitos>@s.whatsapp.net`), que era o formato antigo. Como agora o banco só tem dígitos, o n8n **não encontra o registro → assume que não está pausado → a IA continua respondendo**. É exatamente o sintoma reportado por Andrea e Giovanna.

### 2. Por que Giovanna vê em "todos" e Andrea só nos últimos 2

Giovanna tem muitos leads antigos (Claudio, etc.) cujos registros já estavam no banco antes da padronização e foram convertidos para dígitos. Andrea provavelmente pausou 2 leads novos após a mudança — mesmo comportamento, mas amostra menor.

## Plano de correção

### A) Corrigir a leitura/escrita no frontend (`src/components/chat/ChatWindow.tsx`)

Trocar o `phoneKey` de `<digitos>@s.whatsapp.net` para o **mesmo formato normalizado do banco**, para que o botão reflita o status real:

```ts
// antes
const phoneKey = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;

// depois — mesma lógica do normalize_telefone_br
const normalizePhoneBR = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length === 13 && d.startsWith("55") && d[4] === "9") {
    d = d.slice(0, 4) + d.slice(5);
  }
  return d;
};
const phoneKey = normalizePhoneBR(phone);
```

O `SELECT` passa a achar o registro correto → o botão aparece como "Reativar IA" quando já está pausado, e o `UPSERT` continua funcionando.

### B) Ajuste no n8n (fora do código Lovable — instrução para o usuário)

O workflow do n8n precisa consultar `dados_cliente` usando o telefone **só com dígitos no formato `55DDDNUMERO` (sem `@s.whatsapp.net`, sem `+`, e sem o `9` extra do celular)**. Ex.: para o JID `5524998240251@s.whatsapp.net`, consultar `telefone = '552498240251'`.

Alternativa mais robusta se você não quiser mexer no n8n agora: eu posso criar uma função SQL `public.dc_is_paused(_phone text)` que aceita qualquer formato (JID, com `+`, com/sem 9) e retorna boolean. O n8n chamaria via RPC. Me avise se prefere esse caminho — não faço agora, é opcional.

### Nada mais é alterado

Somente `src/components/chat/ChatWindow.tsx` sofre mudança de código. Nenhum trigger, tabela, ou outra automação será tocada.
