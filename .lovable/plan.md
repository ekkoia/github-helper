
# Corrigir parsing de created_time_brasil no trigger

## Problema

O trigger `sync_meta_lead_to_crm` tem um bug na conversao de data. O campo `created_time` vem do Meta no formato `14/02/2026 - 22:26`, mas o trigger atual tenta converter com `NEW.created_time::timestamptz`, que nao reconhece esse formato. A conversao falha silenciosamente (capturada pelo EXCEPTION) e `created_time_brasil` fica NULL.

Resultado: todos os leads recentes (598-610+) estao com `created_time_brasil = NULL`, e o dashboard usa `data_criacao` (hora de insercao no banco, dia 16) em vez da data real do formulario (dia 14).

## Causa raiz

Uma migration anterior substituiu a conversao correta:
```text
TO_TIMESTAMP(NEW.created_time, 'DD/MM/YYYY - HH24:MI')
```

Pela conversao incorreta:
```text
NEW.created_time::timestamptz
```

O formato `14/02/2026 - 22:26` nao e reconhecido pelo cast implicito do PostgreSQL.

## Solucao

### 1. Migration SQL (unico arquivo)

**Parte A** - Corrigir o trigger para usar `TO_TIMESTAMP` novamente:

```text
created_brasil := TO_TIMESTAMP(NEW.created_time, 'DD/MM/YYYY - HH24:MI');
```

**Parte B** - Preencher `created_time_brasil` para os leads existentes que estao NULL:

```sql
UPDATE leads l
SET created_time_brasil = TO_TIMESTAMP(lf.created_time, 'DD/MM/YYYY - HH24:MI')
FROM "leadsNativo_feeagro" lf
WHERE l.meta_lead_id = lf.id
  AND l.created_time_brasil IS NULL
  AND lf.created_time IS NOT NULL
  AND lf.created_time != '';
```

### 2. Nenhuma alteracao no frontend

O codigo do dashboard (`getLeadDate`) ja prioriza `created_time_brasil` corretamente. Uma vez populado o campo, as datas aparecerao certas automaticamente.

### Resultado esperado

- Leads como Rbs Santos (meta_lead_id 607) passarao de `created_time_brasil = NULL` para `2026-02-14 20:55:00`
- No dashboard, esses leads aparecerao no dia 14/02 em vez do dia 16/02
- Novos leads vindos do Meta terao `created_time_brasil` corretamente populado pelo trigger
