

# Adicionar created_time_brasil na Tabela Leads

## Objetivo

Adicionar uma coluna `created_time_brasil` na tabela `leads` para armazenar a data/hora exata de chegada do lead no fuso horário do Brasil, garantindo que todos os gráficos e métricas mostrem a contagem correta por dia.

## Por que essa abordagem?

- A tabela `leads` é a fonte central de dados para toda a aplicação
- Todos os componentes (Dashboard, Kanban, Leads, etc.) já consomem dados dessa tabela
- Evita dependência de tabelas secundárias como `leadsNativo_feeagro`
- Mantém consistência em toda a aplicação

## Fluxo de Dados

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Meta/Facebook                               │
│                         │                                       │
│                         ▼                                       │
│              leadsNativo_feeagro                                │
│              (created_time: "04/02/2026 - 23:53")               │
│                         │                                       │
│                         ▼  (trigger sync)                       │
│                      leads                                      │
│              (created_time_brasil: timestamp)                   │
│                         │                                       │
│           ┌─────────────┼─────────────┐                         │
│           ▼             ▼             ▼                         │
│       Dashboard      Kanban        Leads                        │
│       (gráficos)    (cards)       (tabela)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Alterações Necessárias

### 1. Migração no Banco de Dados

Adicionar a coluna e popular com dados existentes:

```sql
-- Adicionar coluna timestamp para horário Brasil
ALTER TABLE leads ADD COLUMN created_time_brasil timestamp with time zone;

-- Popular dados existentes convertendo o formato texto
UPDATE leads l
SET created_time_brasil = TO_TIMESTAMP(
  lf.created_time, 
  'DD/MM/YYYY - HH24:MI'
) AT TIME ZONE 'America/Sao_Paulo'
FROM "leadsNativo_feeagro" lf
WHERE l.meta_lead_id = lf.id
  AND lf.created_time IS NOT NULL;
```

### 2. Atualizar Trigger de Sincronização

Modificar a função `sync_meta_lead_to_crm()` para incluir o `created_time_brasil`:

```sql
-- No INSERT da função, adicionar:
created_time_brasil = TO_TIMESTAMP(
  NEW.created_time, 
  'DD/MM/YYYY - HH24:MI'
) AT TIME ZONE 'America/Sao_Paulo'
```

### 3. Arquivo: `src/pages/Dashboard.tsx`

Incluir o novo campo na query de busca:

```typescript
const { data, error } = await supabase
  .from("leads")
  .select("*")  // já inclui created_time_brasil automaticamente
  .order("data_criacao", { ascending: false });
```

### 4. Arquivo: `src/components/DashboardCharts.tsx`

Modificar a lógica de agrupamento por data para usar `created_time_brasil`:

```typescript
// Função para obter a data do lead no horário Brasil
const getLeadDate = (lead: any): Date => {
  // Se tiver created_time_brasil, usa (leads do Meta)
  if (lead.created_time_brasil) {
    return new Date(lead.created_time_brasil);
  }
  // Fallback para data_criacao (leads manuais/whatsapp)
  return new Date(lead.data_criacao);
};

// Usar nos filtros de período
const filteredLeads = useMemo(() => {
  return leads.filter(lead => {
    const leadDate = getLeadDate(lead);
    // ... lógica de filtro
  });
}, [leads, period]);

// Usar no agrupamento por data
filteredLeads.forEach(lead => {
  const leadDate = getLeadDate(lead);
  const dateKey = format(leadDate, "dd/MM");
  leadsCountByDate[dateKey] = (leadsCountByDate[dateKey] || 0) + 1;
});
```

### 5. Atualizar Types do Supabase

O campo será automaticamente incluído nos tipos após a migração.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migration (novo) | Adicionar coluna `created_time_brasil` + popular dados |
| `sync_meta_lead_to_crm` (trigger) | Incluir `created_time_brasil` no INSERT |
| `src/components/DashboardCharts.tsx` | Usar `created_time_brasil` para cálculos de data |

## Resultado Esperado

- Dia 04/02 mostrará corretamente **18 leads** (incluindo Jhon 21:50 e Danillo 23:53)
- Todos os gráficos de período usarão o horário Brasil
- Leads manuais/WhatsApp continuam funcionando com `data_criacao`
- Novos leads do Meta terão automaticamente o `created_time_brasil` preenchido

## Observação sobre Leads Não-Meta

Para leads que não vêm do Meta (ex: cadastro manual, WhatsApp), o campo `created_time_brasil` ficará nulo e o sistema usará `data_criacao` como fallback. Se desejado, podemos também preencher `created_time_brasil` com `data_criacao` convertido para horário Brasil.

