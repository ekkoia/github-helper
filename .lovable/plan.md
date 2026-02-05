

# Correção Final do Timezone - Sem Offset

## Problema Identificado

A lógica de conversão ainda está adicionando offset UTC incorretamente. Quando usamos:

```sql
TO_TIMESTAMP(created_time, 'DD/MM/YYYY - HH24:MI')::timestamp AT TIME ZONE 'America/Sao_Paulo'
```

O PostgreSQL interpreta como "converta DE Sao Paulo PARA UTC", adicionando 3 horas.

**Situação atual:**
| Lead | created_time (fonte) | created_time_brasil (atual) | Correto |
|------|---------------------|----------------------------|---------|
| Jhon | 04/02/2026 - 21:50 | 2026-02-05 00:50:00+00 | 2026-02-04 21:50 |
| Danillo | 04/02/2026 - 23:53 | 2026-02-05 02:53:00+00 | 2026-02-04 23:53 |
| Marcelo | 04/02/2026 - 00:09 | 2026-02-04 03:09:00+00 | 2026-02-04 00:09 |

Isso faz Jhon e Danillo aparecerem no dia 05/02 ao invés do 04/02.

## Esclarecimento sobre Marcus Mexicano

O Marcus Mexicano (+5591981916140) **já está no banco como lead Meta**, não WhatsApp. Ele veio pelo formulário do Meta às 10:55 do dia 04/02.

## Contagem Correta para 04/02/2026

Após verificação detalhada na fonte (`leadsNativo_feeagro`):

- **13 leads Meta** (ids 317-322, 325-331)
- **2 leads WhatsApp** (Oscar e Andre/HM Rasqueteamentos)
- **Total esperado: 15 leads**

## Solução Técnica

Armazenar o timestamp SEM conversão de timezone, já que o `created_time` já representa horário Brasil:

```sql
TO_TIMESTAMP(created_time, 'DD/MM/YYYY - HH24:MI')
```

## Alterações Necessárias

### 1. Nova Migração SQL

Corrigir os dados existentes e atualizar o trigger:

```sql
-- Recalcular created_time_brasil SEM conversão de timezone
UPDATE leads l
SET created_time_brasil = TO_TIMESTAMP(lf.created_time, 'DD/MM/YYYY - HH24:MI')
FROM "leadsNativo_feeagro" lf
WHERE l.meta_lead_id = lf.id
  AND lf.created_time IS NOT NULL
  AND lf.created_time != '';

-- Atualizar trigger para novos leads
CREATE OR REPLACE FUNCTION sync_meta_lead_to_crm()
-- ... usar TO_TIMESTAMP(NEW.created_time, 'DD/MM/YYYY - HH24:MI') sem AT TIME ZONE
```

## Resultado Esperado

Após a correção:
- Jhon terá `created_time_brasil` = 2026-02-04 21:50:00
- Danillo terá `created_time_brasil` = 2026-02-04 23:53:00
- O gráfico mostrará **15 leads no dia 04/02**

| Recurso | Alteração |
|---------|-----------|
| Nova migração SQL | Remover conversão AT TIME ZONE dos dados e trigger |

