## Objetivo

Salvar o telefone no formato que a Meta exige (com o 9 do celular), continuar deduplicando sem o 9, e não mexer em nada que já funciona.

## Situação atual

- Campo `leads.telefone`: hoje é normalizado pela função `normalize_telefone_br` e por triggers em `leads` e `dados_cliente`. Essa função **remove o 9** de celulares (deixa 12 dígitos: `55 + DDD + 8`). É por isso que o Davi caiu para `551151509764`.
- Campo `leads.telefone_key`: já é uma coluna gerada que usa `phone_key`, sempre sem o 9. É o campo usado para deduplicação (índice único). **Não precisa mudar nada aqui.**
- Envio para a Meta (`send-whatsapp-message` e afins): usa `telefone`. Como ele está sem o 9, a Meta não entrega em alguns casos (SP-11 principalmente).

Ou seja, a arquitetura de dois campos já existe — só que a função de normalização do `telefone` está agressiva demais e apaga o 9 que a Meta precisa.

## Mudança proposta

Ajustar **somente** a função `public.normalize_telefone_br(text)` para **preservar o 9 do celular** e devolver o número no formato E.164 sem `+` (o que a Meta chama de "wa_id"):

- Fixo: `55 + DDD + 8 dígitos` → 12 dígitos (inalterado).
- Celular: `55 + DDD + 9 + 8 dígitos` → 13 dígitos (**mantém o 9**).
- Se entrar `11 5150-9764` (10 dígitos, DDD SP mas 8 dígitos no assinante) → mantém como está (fixo válido); não força o 9.
- Se entrar `11 95150-9764` (11 dígitos com 9) → vira `5511951509764`.
- Se entrar `5511 5150-9764` (12 dígitos, sem 9) → mantém como está.
- Se entrar `5511 95150-9764` (13 dígitos, com 9) → mantém como está.
- Se não bater no padrão BR: devolve só os dígitos, como já faz hoje.

Nada mais muda:

- `phone_key` continua removendo o 9 → `telefone_key` continua igual → dedup funciona igual.
- Triggers `trg_normalize_lead_telefone` e `trg_normalize_dados_cliente_telefone` continuam ativos, só que agora escrevem no formato certo.
- RLS, rodízio, funil, chat, templates: nada é tocado.
- Não há mudança de código no frontend nem em Edge Function.

## Backfill (apenas leitura + correção pontual, opcional)

Depois de atualizar a função, os telefones já gravados continuarão sem o 9 (a função só age em INSERT/UPDATE). Como não queremos mexer no que está funcionando, proponho **duas opções** — você escolhe:

1. **Não fazer backfill.** Os leads antigos continuam como estão; só os novos e os editados nascem no formato Meta. Casos como o Davi são corrigidos manualmente conforme aparecerem (como já fizemos).
2. **Backfill controlado:** rodar um `UPDATE` apenas em `leads` com `length(regexp_replace(telefone,'[^0-9]','','g')) = 12` e DDD onde o 9 é obrigatório (todos os DDDs BR desde 2016, na prática), reinserindo o 9. Isso reprocessa histórico mas é uma operação de dados, não estrutural.

Recomendação: começar com **opção 1** para respeitar seu pedido de "não mexer no que já funciona", e decidir sobre backfill depois.

## Como validar

Após a migração:
- `SELECT normalize_telefone_br('11 95150-9764')` → `5511951509764`.
- `SELECT normalize_telefone_br('5511951509764')` → `5511951509764`.
- `SELECT normalize_telefone_br('551151509764')` → `551151509764` (fixo, permanece).
- Inserir um lead novo com celular SP → conferir que `telefone` fica com 13 dígitos e `telefone_key` continua com 10 (dedup ok).
- Enviar um template para esse lead novo pelo `/chat` → Meta entrega.

## Detalhes técnicos

Migração única (`CREATE OR REPLACE FUNCTION`) sobre `public.normalize_telefone_br`. Sem `ALTER TABLE`, sem novos triggers, sem novos índices, sem mudança em `phone_key`, sem mudança em `telefone_key`.
