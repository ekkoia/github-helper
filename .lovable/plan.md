

# Correção da Conversão de Timezone para created_time_brasil

## Problema Identificado

A migração anterior aplicou a conversão de timezone incorretamente. O campo `created_time` da tabela `leadsNativo_feeagro` já contém a data/hora no fuso horário do Brasil (ex: "04/02/2026 - 00:09"), mas a função `AT TIME ZONE 'America/Sao_Paulo'` estava interpretando incorretamente e subtraindo 3 horas.

**Exemplo do erro:**
| created_time (texto) | created_time_brasil (atual) | Esperado |
|---------------------|------------------------------|----------|
| 04/02/2026 - 00:09 | 2026-02-03 21:09:00+00 ❌ | 2026-02-04 00:09:00-03 ✓ |
| 04/02/2026 - 23:53 | 2026-02-04 20:53:00+00 ❌ | 2026-02-04 23:53:00-03 ✓ |

Isso faz com que leads da madrugada apareçam no dia anterior no gráfico.

## Solução

Corrigir a lógica de conversão do timestamp. Como o `created_time` já representa horário Brasil, devemos usar:

```sql
TO_TIMESTAMP(created_time, 'DD/MM/YYYY - HH24:MI') AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'
```

Ou simplesmente armazenar sem conversão e tratar no frontend.

## Alterações Necessárias

### 1. Nova Migração no Banco de Dados

Corrigir os dados existentes e atualizar o trigger:

```sql
-- Recalcular created_time_brasil corretamente
-- O created_time JÁ está no horário Brasil, então precisamos 
-- interpretar como timestamp local e armazenar com o timezone correto
UPDATE leads l
SET created_time_brasil = (
  TO_TIMESTAMP(lf.created_time, 'DD/MM/YYYY - HH24:MI')::timestamp 
  AT TIME ZONE 'America/Sao_Paulo'
)
FROM "leadsNativo_feeagro" lf
WHERE l.meta_lead_id = lf.id
  AND lf.created_time IS NOT NULL
  AND lf.created_time != '';
```

### 2. Atualizar Trigger de Sincronização

Corrigir a mesma lógica no trigger para novos leads:

```sql
-- No trigger, usar:
lead_created_time_brasil := (
  TO_TIMESTAMP(NEW.created_time, 'DD/MM/YYYY - HH24:MI')::timestamp 
  AT TIME ZONE 'America/Sao_Paulo'
);
```

## Arquivos a Modificar

| Recurso | Alteração |
|---------|-----------|
| Nova migração SQL | Corrigir dados existentes + atualizar trigger |

## Resultado Esperado

Após a correção:
- Lead "04/02/2026 - 00:09" terá `created_time_brasil` = "2026-02-04 00:09:00-03"
- Lead "04/02/2026 - 23:53" terá `created_time_brasil` = "2026-02-04 23:53:00-03"
- O gráfico mostrará **13 leads no dia 04/02** (total correto conforme fonte Meta)

**Nota:** A fonte Meta (`leadsNativo_feeagro`) mostra 13 leads para 04/02/2026, não 18. Os 18 leads eram uma contagem usando `data_criacao` com conversão de timezone no SELECT, que incluía leads de outros dias.

