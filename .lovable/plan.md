## Problema

O número `552120103453` (DDD 21 do Rio) falhou com `Message undeliverable`. Investigando:

1. **447 leads** com DDD 11–28 estão salvos em **12 dígitos** (sem o 9). A função `normalize_telefone_br` já existe e prepende o 9 automaticamente, mas esses registros nunca foram reprocessados — o backfill anterior não rodou sobre eles ou foram criados antes.
2. **38 leads** têm números fixos (começam com 2–5 após o DDD) em DDDs 11–28. A regra atual força o "9" na frente deles também, gerando um JID inválido que a Meta rejeita.

O caso do 552120103453 combina os dois problemas: é fixo (começa com "2") e nunca foi normalizado — se tivesse sido normalizado pela regra atual, teria virado 5521920103453, que também é inválido.

## Plano

### 1. Refinar `normalize_telefone_br` para distinguir celular de fixo
No bloco "DDD 11–28", só forçar o 9 quando o primeiro dígito do assinante de 8 dígitos for **6, 7, 8 ou 9** (faixa de celular). Para 2–5 (fixo), manter os 12 dígitos originais.

```text
IF ddd BETWEEN 11 AND 28 THEN
  IF left(local_part,1) IN ('6','7','8','9') THEN
    RETURN '55'||ddd||'9'||local_part           -- celular
  ELSE
    RETURN '55'||ddd||local_part                -- fixo
  END IF
END IF
```

### 2. Rodar backfill em `leads` e `dados_cliente`
`UPDATE ... SET telefone = normalize_telefone_br(telefone)` em ambas as tabelas, apenas onde o resultado difere do valor atual. Os triggers `trg_normalize_lead_telefone` e `trg_normalize_dados_cliente_telefone` cuidam de inserts futuros; a `telefone_key` (coluna gerada, sem o 9) continua igual e não afeta rodízio/deduplicação.

Impacto esperado:
- ~446 celulares DDD 11–28 ganham o 9 e passam a entregar.
- ~38 fixos ficam em 12 dígitos (ficam do jeito que a Meta aceita — ainda que fixos não recebam WhatsApp, o formato pelo menos deixa de ser inválido).

### 3. Sinalizar fixos no envio
No `send-whatsapp-message`, quando o número final tiver DDD 11–28 e o primeiro dígito do assinante for 2–5, retornar erro `phone_is_landline` antes de chamar a Meta e gravar `delivery_status='failed'` com `failure_reason='Número fixo — não recebe WhatsApp'`. Evita gastar tentativa e mostra motivo claro no chat.

## Detalhes técnicos

- Migration única contendo: `CREATE OR REPLACE FUNCTION normalize_telefone_br` + dois `UPDATE` de backfill.
- Nenhum trigger, RLS, grant ou índice muda.
- `telefone_key` é `GENERATED ALWAYS`, então recalcula sozinha se o telefone mudar; mesmo assim continua sendo o mesmo valor (função `phone_key` já ignora o 9), então rodízio/dedupe não sofre alteração.
- Frontend não muda — `MetaChatInput` já consulta o telefone canônico da base antes de enviar.
- Após aplicar, refazer o envio manual do template para o Erickson-do-caso e conferir `delivery_status` do próximo status update.
