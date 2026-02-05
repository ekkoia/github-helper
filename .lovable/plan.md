

# Correção da Contagem de Leads no Gráfico

## Problema Identificado

O gráfico "Volume de Negociações" está mostrando **13 leads** no dia 04/02, quando deveria mostrar **15 leads** (13 Meta + 2 WhatsApp).

### Causa Raiz

A função `getLeadDate()` no `DashboardCharts.tsx` tem um problema de timezone:

```typescript
const getLeadDate = (lead: any): Date => {
  if (lead.created_time_brasil) {
    return new Date(lead.created_time_brasil); // Meta leads
  }
  return new Date(lead.data_criacao); // WhatsApp leads - PROBLEMA!
};
```

**Situação atual no banco:**

| Lead | created_time_brasil | data_criacao (UTC) |
|------|--------------------|--------------------|
| Oscar (WhatsApp) | null | 2026-02-04 16:45+00 |
| Andre (WhatsApp) | null | 2026-02-04 19:52+00 |
| Jhon (Meta) | 2026-02-04 21:50+00 | 2026-02-05 00:50+00 |

Os leads WhatsApp não têm `created_time_brasil` preenchido, então usam `data_criacao`. A comparação de datas no JavaScript pode interpretar incorretamente o timezone.

## Solução Proposta

### Parte 1: Preencher `created_time_brasil` para Leads WhatsApp

Atualizar os leads WhatsApp para terem `created_time_brasil` baseado no `data_criacao` convertido para horário Brasil:

```sql
UPDATE leads
SET created_time_brasil = data_criacao AT TIME ZONE 'America/Sao_Paulo'
WHERE origem = 'whatsapp'
  AND created_time_brasil IS NULL;
```

### Parte 2: Melhorar a Lógica de Data no Frontend

Atualizar a função `getLeadDate()` para lidar melhor com timezones, extraindo apenas a parte da data sem conversão:

```typescript
const getLeadDate = (lead: any): Date => {
  // Prioriza created_time_brasil (horário Brasil real)
  if (lead.created_time_brasil) {
    const dateStr = lead.created_time_brasil.split('T')[0];
    return new Date(dateStr + 'T12:00:00');
  }
  // Fallback: converte data_criacao considerando que está em UTC
  const date = new Date(lead.data_criacao);
  // Ajusta para Brasil (UTC-3)
  date.setHours(date.getHours() - 3);
  return date;
};
```

## Resultado Esperado

Após as correções:
- 04/02: **15 leads** (13 Meta + 2 WhatsApp)
- Todos os outros dias também terão contagem correta

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Preencher `created_time_brasil` para leads WhatsApp |
| `src/components/DashboardCharts.tsx` | Melhorar lógica de `getLeadDate()` para lidar com timezone |

